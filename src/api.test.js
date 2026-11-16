import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test';
import { loadBrands, loadOffers, requestGoods } from './api';
import { articleChanged, brandSelected, createAppStore, filterChanged, searchRestored, sortChanged } from './store';

let store;
let fetchSpy;

beforeEach(() => {
  store = createAppStore();
  fetchSpy = spyOn(globalThis, 'fetch');
});
afterEach(() => {
  fetchSpy.mockRestore();
});

describe('Redux API integration', () => {
  test('encodes the article and brand and explicitly requests analogues only at stage two', async () => {
    fetchSpy.mockImplementation(() => Promise.resolve(Response.json({ goods: [] })));
    await store.dispatch(loadBrands('A#1 &2'));
    await store.dispatch(loadOffers({ number: 'A#1 &2', brand: 'NGK/NTK & Co' }));
    const [brandsRequest, offersRequest] = fetchSpy.mock.calls.map(([request]) => new URL(request));
    expect(brandsRequest.protocol).toBe('https:');
    expect(brandsRequest.searchParams.get('key')).toBe(import.meta.env.VITE_FAVORIT_API_KEY);
    expect(brandsRequest.searchParams.get('number')).toBe('A#1 &2');
    expect(brandsRequest.searchParams.has('brand')).toBe(false);
    expect(brandsRequest.searchParams.has('analogues')).toBe(false);
    expect(offersRequest.searchParams.get('brand')).toBe('NGK/NTK & Co');
    expect(offersRequest.searchParams.get('analogues')).toBe('on');
  });

  test('treats an API error in a successful HTTP response as a failure', async () => {
    fetchSpy.mockResolvedValue(Response.json({ error: 'Invalid key client!' }));
    const result = await store.dispatch(loadBrands('0189'));
    expect(result.meta.requestStatus).toBe('rejected');
    expect(result.error.message).toContain('ключ доступа');
  });

  test('reports the HAFFEN HTTP 403 quota response as a cargo-search limit, not an empty result', async () => {
    fetchSpy.mockResolvedValue(Response.json({ error: 'Request quota exceeded!' }, { status: 403 }));
    const result = await store.dispatch(loadOffers({ number: '0189', brand: 'HAFFEN' }));
    expect(result.meta.requestStatus).toBe('rejected');
    expect(result.error.message).toContain('лимит поиска по грузовому ассортименту');
    expect(result.error.message).toContain('Наличие товара проверить не удалось');
    expect(store.getState().catalog.offers.data).toEqual([]);
  });

  test('handles server, network, and invalid JSON responses', async () => {
    fetchSpy.mockResolvedValueOnce(new Response('Unavailable', { status: 503 }));
    fetchSpy.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    fetchSpy.mockResolvedValueOnce(new Response('<html>Error</html>', { status: 200 }));
    const server = await store.dispatch(loadBrands('server'));
    const network = await store.dispatch(loadBrands('network'));
    const malformed = await store.dispatch(loadBrands('malformed'));
    expect(server.meta.requestStatus).toBe('rejected');
    expect(server.error.message).toContain('HTTP 503');
    expect(network.error.message).toContain('интернету');
    expect(malformed.error.message).toContain('некорректный ответ');
  });

  test('a late response for an earlier article cannot replace the current article data', async () => {
    const pending = new Map();
    let reportStarted;
    const bothStarted = new Promise((resolve) => { reportStarted = resolve; });
    fetchSpy.mockImplementation((request) => new Promise((resolve) => {
      pending.set(new URL(request).searchParams.get('number'), resolve);
      if (pending.size === 2) reportStarted();
    }));
    const oldQuery = store.dispatch(loadBrands('old'));
    const newQuery = store.dispatch(loadBrands('new'));
    await bothStarted;
    pending.get('new')(Response.json({ goods: [{ brand: 'CURRENT' }] }));
    await newQuery;
    pending.get('old')(Response.json({ goods: [{ brand: 'OUTDATED' }] }));
    await oldQuery;
    expect(store.getState().catalog.brands).toMatchObject({ arg: 'new', status: 'succeeded', data: ['CURRENT'], error: null });
  });

  test('editing the article clears the selected brand immediately', () => {
    store.dispatch(articleChanged('0189'));
    store.dispatch(brandSelected('ZEN'));
    store.dispatch(articleChanged('01089'));
    expect(store.getState().search).toEqual({ article: '01089', brand: '', filter: '', sort: 'default' });
  });

  test('aborts an active fetch without displaying an error and permits a new request', async () => {
    let signal;
    fetchSpy.mockImplementationOnce((_url, options) => new Promise((_resolve, reject) => {
      signal = options.signal;
      signal.addEventListener('abort', () => reject(signal.reason), { once: true });
    }));
    const task = store.dispatch(loadBrands('0189'));
    task.abort();
    const aborted = await task;
    expect(signal.aborted).toBe(true);
    expect(aborted.meta.aborted).toBe(true);
    expect(store.getState().catalog.brands).toMatchObject({ status: 'idle', data: [], error: null });
    fetchSpy.mockResolvedValueOnce(Response.json({ goods: [{ brand: 'ZEN' }] }));
    await store.dispatch(loadBrands('0189'));
    expect(store.getState().catalog.brands).toMatchObject({ status: 'succeeded', data: ['ZEN'], error: null });
  });

  test('aborts a timed-out request and distinguishes it from user cancellation', async () => {
    let signal;
    fetchSpy.mockImplementationOnce((_url, options) => new Promise((_resolve, reject) => {
      signal = options.signal;
      signal.addEventListener('abort', () => reject(signal.reason), { once: true });
    }));
    await expect(requestGoods({ number: '0189' }, { timeoutMs: 5 })).rejects.toThrow('не ответил за 15 секунд');
    expect(signal.aborted).toBe(true);
  });

  test('a failed request can be retried and empty responses are successful', async () => {
    fetchSpy.mockRejectedValueOnce(new TypeError('Offline'));
    await store.dispatch(loadBrands('0189'));
    expect(store.getState().catalog.brands.status).toBe('failed');
    fetchSpy.mockResolvedValueOnce(Response.json([{}]));
    await store.dispatch(loadBrands('0189'));
    expect(store.getState().catalog.brands).toMatchObject({ status: 'succeeded', data: [], error: null });
    fetchSpy.mockResolvedValueOnce(new Response('', { status: 200 }));
    await store.dispatch(loadBrands('empty'));
    expect(store.getState().catalog.brands).toMatchObject({ status: 'succeeded', data: [], error: null });
  });

  test('clearing the article invalidates an in-flight response even when fetch ignores cancellation', async () => {
    let resolve;
    fetchSpy.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    store.dispatch(articleChanged('0189'));
    const task = store.dispatch(loadBrands('0189'));
    store.dispatch(articleChanged(''));
    resolve(Response.json({ goods: [{ brand: 'OUTDATED' }] }));
    await task;
    expect(store.getState().catalog.brands).toMatchObject({ status: 'idle', data: [], error: null });
  });

  test('a late failure for an earlier brand cannot overwrite the current offers', async () => {
    let reject;
    fetchSpy.mockImplementationOnce(() => new Promise((_resolve, fail) => { reject = fail; }));
    store.dispatch(articleChanged('0189'));
    store.dispatch(brandSelected('ZEN'));
    const previous = store.dispatch(loadOffers({ number: '0189', brand: 'ZEN' }));
    store.dispatch(brandSelected('CARGO'));
    fetchSpy.mockResolvedValueOnce(Response.json({ goods: [{ brand: 'CARGO', number: '0189', warehouses: [] }] }));
    await store.dispatch(loadOffers({ number: '0189', brand: 'CARGO' }));
    reject(new TypeError('Old request failed'));
    await previous;
    expect(store.getState().catalog.offers).toMatchObject({ status: 'succeeded', error: null, arg: { number: '0189', brand: 'CARGO' } });
    expect(store.getState().catalog.offers.data[0].brand).toBe('CARGO');
  });

  test('URL restoration and whitespace edits retain only results matching the current search', async () => {
    store.dispatch(articleChanged('0189'));
    store.dispatch(brandSelected('ZEN'));
    fetchSpy.mockResolvedValueOnce(Response.json({ goods: [{ brand: 'ZEN' }] }));
    await store.dispatch(loadBrands('0189'));
    fetchSpy.mockResolvedValueOnce(Response.json({ goods: [{ brand: 'ZEN', number: '0189', warehouses: [] }] }));
    await store.dispatch(loadOffers({ number: '0189', brand: 'ZEN' }));
    store.dispatch(filterChanged('фильтр'));
    store.dispatch(sortChanged('price-asc'));
    store.dispatch(searchRestored({ article: '0189', brand: 'ZEN', filter: 'zen', sort: 'price-desc' }));
    expect(store.getState().catalog.offers.status).toBe('succeeded');
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    store.dispatch(articleChanged(' 0189 '));
    expect(store.getState().catalog.brands.status).toBe('succeeded');
    expect(store.getState().catalog.offers.status).toBe('idle');
    store.dispatch(searchRestored({ article: '01089', brand: 'CAFFARO' }));
    expect(store.getState().catalog.brands).toMatchObject({ status: 'idle', data: [] });
  });
});
