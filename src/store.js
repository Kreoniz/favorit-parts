import { configureStore, createSlice } from '@reduxjs/toolkit';
import { partsApi } from './api';
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

export function createAppStore(initialSearch = {}, extraMiddleware = []) {
  return configureStore({
    preloadedState: { search: normalizeSearch(initialSearch) },
    reducer: { search: searchSlice.reducer, [partsApi.reducerPath]: partsApi.reducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(partsApi.middleware, ...extraMiddleware),
  });
}
