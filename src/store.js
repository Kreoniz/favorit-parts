import { configureStore, createSlice } from '@reduxjs/toolkit';
import { loadBrands, loadOffers } from './api';
import { normalizeSearch } from './searchUrl';

const searchSlice = createSlice({
  name: 'search',
  initialState: normalizeSearch(),
  reducers: {
    articleChanged(state, action) {
      state.article = action.payload;
      state.brand = '';
      state.filter = '';
      state.sort = 'default';
    },
    brandSelected(state, action) {
      state.brand = action.payload;
      state.filter = '';
      state.sort = 'default';
    },
    filterChanged(state, action) {
      state.filter = state.brand ? action.payload : '';
    },
    sortChanged(state, action) {
      state.sort = normalizeSearch({ ...state, sort: action.payload }).sort;
    },
    searchRestored: {
      reducer: (_state, action) => normalizeSearch(action.payload),
      prepare: (search) => ({ payload: search, meta: { history: 'replace' } }),
    },
  },
});

export const { articleChanged, brandSelected, filterChanged, sortChanged, searchRestored } = searchSlice.actions;

const emptyRequest = () => ({ status: 'idle', arg: null, requestId: null, data: [], error: null });
const catalogSlice = createSlice({
  name: 'catalog',
  initialState: { brands: emptyRequest(), offers: emptyRequest() },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(articleChanged, (state, action) => {
        if (state.brands.arg !== action.payload.trim()) state.brands = emptyRequest();
        state.offers = emptyRequest();
      })
      .addCase(brandSelected, (state) => { state.offers = emptyRequest(); })
      .addCase(searchRestored, (state, action) => {
        const { article, brand } = action.payload;
        if (state.brands.arg !== article.trim()) state.brands = emptyRequest();
        if (state.offers.arg?.number !== article.trim() || state.offers.arg?.brand !== brand) state.offers = emptyRequest();
      });
    for (const [thunk, key] of [[loadBrands, 'brands'], [loadOffers, 'offers']]) {
      builder
        .addCase(thunk.pending, (state, action) => {
          if (key === 'brands') state.offers = emptyRequest();
          state[key] = { ...emptyRequest(), status: 'loading', arg: action.meta.arg, requestId: action.meta.requestId };
        })
        .addCase(thunk.fulfilled, (state, action) => {
          if (state[key].requestId !== action.meta.requestId) return;
          state[key].status = 'succeeded';
          state[key].data = action.payload;
          state[key].requestId = null;
        })
        .addCase(thunk.rejected, (state, action) => {
          if (state[key].requestId !== action.meta.requestId) return;
          state[key].status = action.meta.aborted ? 'idle' : 'failed';
          state[key].error = action.meta.aborted ? null : action.error.message;
          state[key].requestId = null;
        });
    }
  },
});

export function createAppStore(initialSearch = {}, extraMiddleware = []) {
  return configureStore({
    preloadedState: { search: normalizeSearch(initialSearch) },
    reducer: { search: searchSlice.reducer, catalog: catalogSlice.reducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(...extraMiddleware),
  });
}
