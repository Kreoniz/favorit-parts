const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value) => typeof value === 'string' ? value.trim() : '';

export const SORT_OPTIONS = [
  { value: 'default', label: 'По умолчанию' },
  { value: 'price-asc', label: 'Сначала дешевле' },
  { value: 'price-desc', label: 'Сначала дороже' },
  { value: 'stock-desc', label: 'Больше в наличии' },
  { value: 'name-asc', label: 'По названию' },
];

export function apiErrorMessage(error) {
  const description = Array.isArray(error) ? error.join(' ') : String(error);
  const messages = [
    ['Empty key!', 'Не указан ключ доступа к API.'],
    ['Invalid key client!', 'Сервис отклонил ключ доступа. Проверьте настройки приложения.'],
    ['Empty number goods!', 'Введите артикул детали.'],
    ['Request quota exceeded!', 'Для этого ключа исчерпан лимит поиска по грузовому ассортименту. Наличие товара проверить не удалось.'],
  ];
  const matched = messages.filter(([code]) => description.includes(code));
  return matched.length ? matched.map(([, message]) => message).join(' ') : 'Сервис вернул ошибку. Попробуйте повторить запрос позже.';
}

export function readGoods(response) {
  if (response?.error) throw new Error(apiErrorMessage(response.error));
  // The documented empty response may contain a single empty object.
  if (response == null || (isRecord(response) && Object.keys(response).length === 0)) return [];
  if (Array.isArray(response) && response.every((item) => isRecord(item) && Object.keys(item).length === 0)) return [];
  if (!Array.isArray(response.goods)) throw new Error('Сервис вернул данные в неожиданном формате. Попробуйте позже.');
  return response.goods.filter((item) => isRecord(item) && text(item.brand));
}

export function getBrands(goods) {
  const brands = new Map();
  for (const item of goods) {
    const brand = text(item.brand);
    const key = brand.toLowerCase();
    if (brand && !brands.has(key)) brands.set(key, brand);
  }
  return [...brands.values()].sort((a, b) => a.localeCompare(b));
}

export function filterParts(parts, query) {
  const normalize = (value) => value.toLocaleLowerCase('ru').replace(/[^\p{L}\p{N}]/gu, '');
  const terms = query.trim().split(/\s+/u).map(normalize).filter(Boolean);
  if (!terms.length) return parts;
  return parts.filter((part) => {
    const searchable = normalize(`${part.name} ${part.brand} ${part.number}`);
    return terms.every((term) => searchable.includes(term));
  });
}

export function getOfferRows(parts, sort = 'default') {
  const rows = parts.flatMap((part) => (part.offers.length ? part.offers : [null]).map((offer) => ({ part, offer })));
  if (sort === 'name-asc') return rows.sort((a, b) => a.part.name.localeCompare(b.part.name, 'ru'));
  if (!['price-asc', 'price-desc', 'stock-desc'].includes(sort)) return rows;
  const key = sort === 'stock-desc' ? 'stock' : 'price';
  const direction = sort === 'price-asc' ? 1 : -1;
  return rows.sort((a, b) => {
    const left = a.offer?.[key] ?? null;
    const right = b.offer?.[key] ?? null;
    // Unknown prices/stocks and goods without offers always remain at the end.
    if (left === null) return right === null ? 0 : 1;
    if (right === null) return -1;
    return (left - right) * direction;
  });
}

function nonNegativeNumber(value) {
  if (value === null || value === undefined || typeof value === 'boolean' || String(value).trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function getParts(goods) {
  const parts = new Map();
  function add(item, requested) {
    if (!isRecord(item) || !text(item.brand)) return;
    const brand = text(item.brand);
    const number = text(item.number);
    const id = text(item.goodsID) || JSON.stringify([brand.toLowerCase(), number.toLowerCase()]);
    const part = parts.get(id) || { id, brand, number, name: text(item.name) || 'Название не указано', requested, offers: [] };
    part.requested ||= requested;
    if (Array.isArray(item.warehouses)) {
      item.warehouses.filter(isRecord).forEach((warehouse, index) => {
        const price = nonNegativeNumber(warehouse.price);
        const stock = nonNegativeNumber(warehouse.stock);
        const warehouseName = text(warehouse.code) || `Склад ${index + 1}`;
        const offerId = JSON.stringify([warehouse.id, warehouse.warehouseShipping, warehouse.code, warehouse.shipmentDate, price, stock]);
        if (!part.offers.some((offer) => offer.id === offerId)) {
          part.offers.push({ id: offerId, warehouse: warehouseName, price, stock });
        }
      });
    }
    parts.set(id, part);
  }
  // Requested goods take precedence when the same part also occurs as an analogue.
  goods.forEach((item) => add(item, true));
  goods.forEach((item) => {
    if (Array.isArray(item.analogues)) item.analogues.forEach((analogue) => add(analogue, false));
  });
  return [...parts.values()];
}

const currency = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' });
const pluralRules = new Intl.PluralRules('ru');

export const formatPrice = (value) => value === null ? '-' : currency.format(value);
export function plural(count, forms) {
  const index = { one: 0, few: 1, many: 2, other: 2 }[pluralRules.select(count)];
  return `${count} ${forms[index]}`;
}
