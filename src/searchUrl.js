import { SORT_OPTIONS } from './parts';

export function normalizeSearch(search = {}) {
  const article = typeof search.article === 'string' ? search.article : '';
  const brand = article.trim() && typeof search.brand === 'string' ? search.brand.trim() : '';
  return {
    article,
    brand,
    filter: brand && typeof search.filter === 'string' ? search.filter : '',
    sort: brand && SORT_OPTIONS.some((option) => option.value === search.sort) ? search.sort : 'default',
  };
}

export function readSearchUrl(href) {
  const params = new URL(href).searchParams;
  return normalizeSearch({
    article: params.get('number')?.trim() || '',
    brand: params.get('brand') || '',
    filter: params.get('q') || '',
    sort: params.get('sort') || 'default',
  });
}

export function buildSearchUrl(href, state) {
  const url = new URL(href);
  const search = normalizeSearch(state);
  for (const key of ['number', 'brand', 'q', 'sort']) url.searchParams.delete(key);
  if (search.article.trim()) url.searchParams.set('number', search.article.trim());
  if (search.brand) url.searchParams.set('brand', search.brand);
  if (search.filter.trim()) url.searchParams.set('q', search.filter.trim());
  if (search.sort !== 'default') url.searchParams.set('sort', search.sort);
  return url.href;
}

export function createSearchUrlSync(browser) {
  let pending;

  function write(search, method) {
    const href = buildSearchUrl(browser.location.href, search);
    if (href !== browser.location.href) {
      browser.history[`${method}State`](browser.history.state, '', href);
    }
  }

  const middleware = ({ getState }) => (next) => (action) => {
    const previous = getState().search;
    const result = next(action);
    const current = getState().search;
    if (current === previous) return result;
    clearTimeout(pending);

    if (action.meta?.history === 'replace') {
      write(current, 'replace');
    } else if (current.article !== previous.article && current.article.trim()) {
      pending = setTimeout(() => write(getState().search, 'push'), 400);
    } else {
      write(current, current.filter !== previous.filter && current.brand === previous.brand ? 'replace' : 'push');
    }
    return result;
  };

  function connect(store, restoreSearch) {
    const onPopState = () => store.dispatch(restoreSearch(readSearchUrl(browser.location.href)));
    browser.addEventListener('popstate', onPopState);
    write(store.getState().search, 'replace');
    return () => {
      clearTimeout(pending);
      browser.removeEventListener('popstate', onPopState);
    };
  }

  return { middleware, connect };
}
