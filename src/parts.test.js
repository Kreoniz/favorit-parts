import { describe, expect, test } from 'bun:test';
import { filterParts, formatPrice, getBrands, getOfferRows, getParts, readGoods } from './parts';

describe('API data normalization', () => {
  test('recognizes empty and documented single-empty-object responses', () => {
    for (const response of [null, {}, [], [{}], { goods: [] }, { goods: [{}] }]) {
      expect(readGoods(response)).toEqual([]);
    }
  });

  test('reports domain errors and unexpected response shapes', () => {
    expect(() => readGoods({ error: ['Invalid key client!', 'Request quota exceeded!'] })).toThrow('Сервис отклонил ключ доступа. Проверьте настройки приложения. Для этого ключа исчерпан лимит поиска по грузовому ассортименту. Наличие товара проверить не удалось.');
    expect(() => readGoods({ goods: 'unavailable' })).toThrow('неожиданном формате');
  });

  test('returns distinct, trimmed brands without altering names used in queries', () => {
    expect(getBrands(readGoods({ goods: [{ brand: ' ZEN ' }, { brand: 'zen' }, {}, { brand: 'NGK/NTK' }] }))).toEqual(['NGK/NTK', 'ZEN']);
  });

  test('uses warehouse prices, keeps zero distinct from missing, and retains unavailable analogues', () => {
    const normalized = getParts(readGoods({ goods: [{
      goodsID: 'original', brand: 'ZEN', number: '0189', name: 'Бендикс', price: 99999,
      warehouses: [{ code: 'МСК', price: '1040.6', stock: '4' }, { code: 'СПБ', price: 0, stock: 0 }, { stock: 3 }],
      analogues: [{ brand: 'CARGO', number: '130432', count: 0, price: 0, warehouses: [] }],
    }] }));
    expect(normalized[0].offers.map(({ price, stock }) => ({ price, stock }))).toEqual([{ price: 1040.6, stock: 4 }, { price: 0, stock: 0 }, { price: null, stock: 3 }]);
    expect(normalized[0].offers[2].warehouse).toBe('Склад 3');
    expect(normalized[1]).toMatchObject({ brand: 'CARGO', number: '130432', requested: false, offers: [] });
    expect(formatPrice(null)).toBe('-');
    expect(formatPrice(0)).toContain('0,00');
  });

  test('merges repeated goods and exact duplicate offers while retaining distinct supplier offers', () => {
    const offer = { id: 'same-warehouse', code: 'МСК', stock: 2, price: 100, warehouseShipping: 'supplier-1' };
    const part = { goodsID: 'part', brand: 'ZEN', number: '0189', warehouses: [offer] };
    const result = getParts([{ ...part, analogues: [part] }, { ...part, warehouses: [offer, { ...offer, warehouseShipping: 'supplier-2' }] }]);
    expect(result).toHaveLength(1);
    expect(result[0].offers).toHaveLength(2);
    expect(result[0].requested).toBe(true);
  });
});

describe('local results search', () => {
  const parts = [
    { name: 'Фильтр масляный', brand: 'MANN', number: 'W 75/3' },
    { name: 'Бендикс стартера', brand: 'TESLA TECHNICS', number: 'TT-61027' },
  ];

  test('matches multiple terms across name, brand and article regardless of case or article punctuation', () => {
    expect(filterParts(parts, 'фильтр mann w753')).toEqual([parts[0]]);
    expect(filterParts(parts, 'tesla TT61027')).toEqual([parts[1]]);
    expect(filterParts(parts, 'БЕНДИКС')).toEqual([parts[1]]);
  });

  test('returns no matches and restores all parts for an empty filter', () => {
    expect(filterParts(parts, 'ZEN')).toEqual([]);
    expect(filterParts(parts, '  ')).toEqual(parts);
  });
});

describe('warehouse-offer sorting', () => {
  const parts = [
    { id: 'a', name: 'Фильтр', offers: [{ id: 'a1', price: 100, stock: 2 }, { id: 'a2', price: 500, stock: 9 }] },
    { id: 'b', name: 'Бендикс', offers: [{ id: 'b1', price: 0, stock: 0 }] },
    { id: 'c', name: 'Свеча', offers: [{ id: 'c1', price: null, stock: null }] },
    { id: 'd', name: 'Ролик', offers: [] },
  ];

  test('sorts all warehouse offers together, retaining zero prices and putting unknown prices last in both directions', () => {
    expect(getOfferRows(parts, 'price-asc').map((row) => row.offer?.price ?? null)).toEqual([0, 100, 500, null, null]);
    expect(getOfferRows(parts, 'price-desc').map((row) => row.offer?.price ?? null)).toEqual([500, 100, 0, null, null]);
    expect(parts[0].offers.map((offer) => offer.price)).toEqual([100, 500]);
  });

  test('sorts stocks and names, retaining goods without offers', () => {
    expect(getOfferRows(parts, 'stock-desc').map((row) => row.offer?.stock ?? null)).toEqual([9, 2, 0, null, null]);
    expect(getOfferRows(parts, 'name-asc').map((row) => row.part.name)).toEqual(['Бендикс', 'Ролик', 'Свеча', 'Фильтр', 'Фильтр']);
    expect(getOfferRows(parts).map((row) => row.part.id)).toEqual(['a', 'a', 'b', 'c', 'd']);
  });
});
