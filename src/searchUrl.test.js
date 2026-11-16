import { describe, expect, test } from 'bun:test';
import { buildSearchUrl, readSearchUrl } from './searchUrl';
import { articleChanged, brandSelected, createAppStore, filterChanged, searchRestored, sortChanged } from './store';

describe('shareable search URLs', () => {
  test('round-trips article, brand, local filter and sorting with encoded special characters', () => {
    const search = { article: '001#A &2', brand: 'NGK/NTK & Co', filter: 'датчик + 12', sort: 'price-desc' };
    const href = buildSearchUrl('https://example.github.io/favorit-parts/?source=hh#results', search);
    const url = new URL(href);
    expect(readSearchUrl(href)).toEqual(search);
    expect(url.pathname).toBe('/favorit-parts/');
    expect(url.hash).toBe('#results');
    expect(url.searchParams.get('source')).toBe('hh');
    expect(url.searchParams.get('number')).toBe('001#A &2');
  });

  test('ignores orphaned brand/filter/sort parameters and unsupported sorting', () => {
    expect(readSearchUrl('https://example.test/?brand=ZEN&q=cargo&sort=price-asc')).toEqual({ article: '', brand: '', filter: '', sort: 'default' });
    expect(readSearchUrl('https://example.test/?number=0189&brand=ZEN&sort=unknown').sort).toBe('default');
    expect(readSearchUrl('https://example.test/?number=0189&q=cargo')).toEqual({ article: '0189', brand: '', filter: '', sort: 'default' });
  });

  test('omits empty values and default sorting when rewriting an existing search', () => {
    expect(buildSearchUrl('https://example.test/path/?source=hh&number=old&brand=ZEN&q=old&sort=price-asc#results', { article: ' 0189 ', brand: 'ZEN', filter: ' ', sort: 'default' })).toBe('https://example.test/path/?source=hh&number=0189&brand=ZEN#results');
    expect(buildSearchUrl('https://example.test/?number=0189&brand=ZEN&q=old&sort=price-asc', {})).toBe('https://example.test/');
  });

  test('restores the full Redux search and resets dependent controls when article or brand changes', () => {
    const initial = { article: '0189', brand: 'ZEN', filter: 'cargo', sort: 'price-asc' };
    const store = createAppStore(initial);
    expect(store.getState().search).toEqual(initial);
    store.dispatch(brandSelected('CAFFARO'));
    expect(store.getState().search).toEqual({ article: '0189', brand: 'CAFFARO', filter: '', sort: 'default' });
    store.dispatch(filterChanged('ролик'));
    store.dispatch(sortChanged('stock-desc'));
    store.dispatch(articleChanged('01089'));
    expect(store.getState().search).toEqual({ article: '01089', brand: '', filter: '', sort: 'default' });
    store.dispatch(searchRestored(initial));
    expect(store.getState().search).toEqual(initial);
  });
});
