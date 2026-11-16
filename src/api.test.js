import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test';
import { partsApi } from './api';
import { articleChanged, brandSelected, createAppStore } from './store';

let store;
let fetchSpy;

beforeEach(() => {
  store = createAppStore();
  fetchSpy = spyOn(globalThis, 'fetch');
});
afterEach(() => {
  store.dispatch(partsApi.util.resetApiState());
  fetchSpy.mockRestore();
});

describe('Redux API integration', () => {
  test('encodes the article and brand and explicitly requests analogues only at stage two', async () => {
    fetchSpy.mockImplementation(() => Promise.resolve(Response.json({ goods: [] })));
    await store.dispatch(partsApi.endpoints.getBrands.initiate('A#1 &2'));
    await store.dispatch(partsApi.endpoints.getOffers.initiate({ number: 'A#1 &2', brand: 'NGK/NTK & Co' }));
    const [brandsRequest, offersRequest] = fetchSpy.mock.calls.map(([request]) => new URL(request.url));
    expect(brandsRequest.protocol).toBe('https:');
    expect(brandsRequest.searchParams.get('number')).toBe('A#1 &2');
    expect(brandsRequest.searchParams.has('brand')).toBe(false);
    expect(brandsRequest.searchParams.has('analogues')).toBe(false);
    expect(offersRequest.searchParams.get('brand')).toBe('NGK/NTK & Co');
    expect(offersRequest.searchParams.get('analogues')).toBe('on');
  });

  test('treats an API error in a successful HTTP response as a failure', async () => {
    fetchSpy.mockResolvedValue(Response.json({ error: 'Invalid key client!' }));
    const result = await store.dispatch(partsApi.endpoints.getBrands.initiate('0189'));
    expect(result.isError).toBe(true);
    expect(result.error.message).toContain('ключ доступа');
  });

  test('reports the HAFFEN HTTP 403 quota response as a cargo-search limit, not an empty result', async () => {
    fetchSpy.mockResolvedValue(Response.json({ error: 'Request quota exceeded!' }, { status: 403 }));
    const result = await store.dispatch(partsApi.endpoints.getOffers.initiate({ number: '0189', brand: 'HAFFEN' }));
    expect(result.isError).toBe(true);
    expect(result.error.message).toContain('лимит поиска по грузовому ассортименту');
    expect(result.error.message).toContain('Наличие товара проверить не удалось');
    expect(result.data).toBeUndefined();
  });

  test('handles server, network, and invalid JSON responses', async () => {
    fetchSpy.mockResolvedValueOnce(new Response('Unavailable', { status: 503 }));
    fetchSpy.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    fetchSpy.mockResolvedValueOnce(new Response('<html>Error</html>', { status: 200 }));
    const server = await store.dispatch(partsApi.endpoints.getBrands.initiate('server'));
    const network = await store.dispatch(partsApi.endpoints.getBrands.initiate('network'));
    const malformed = await store.dispatch(partsApi.endpoints.getBrands.initiate('malformed'));
    expect(server.isError).toBe(true);
    expect(server.error.message).toContain('HTTP 503');
    expect(network.error.message).toContain('интернету');
    expect(malformed.error.message).toContain('некорректный ответ');
  });

  test('a late response for an earlier article cannot replace the current article data', async () => {
    const pending = new Map();
    let reportStarted;
    const bothStarted = new Promise((resolve) => { reportStarted = resolve; });
    fetchSpy.mockImplementation((request) => new Promise((resolve) => {
      pending.set(new URL(request.url).searchParams.get('number'), resolve);
      if (pending.size === 2) reportStarted();
    }));
    const oldQuery = store.dispatch(partsApi.endpoints.getBrands.initiate('old'));
    const newQuery = store.dispatch(partsApi.endpoints.getBrands.initiate('new'));
    await bothStarted;
    pending.get('new')(Response.json({ goods: [{ brand: 'CURRENT' }] }));
    await newQuery;
    pending.get('old')(Response.json({ goods: [{ brand: 'OUTDATED' }] }));
    await oldQuery;
    expect(partsApi.endpoints.getBrands.select('new')(store.getState()).data).toEqual(['CURRENT']);
  });

  test('editing the article clears the selected brand immediately', () => {
    store.dispatch(articleChanged('0189'));
    store.dispatch(brandSelected('ZEN'));
    store.dispatch(articleChanged('01089'));
    expect(store.getState().search).toEqual({ article: '01089', brand: '', filter: '', sort: 'default' });
  });
});
