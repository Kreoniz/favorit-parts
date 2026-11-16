import { configureStore, createSlice } from '@reduxjs/toolkit';
import { partsApi } from './api';

const searchSlice = createSlice({
  name: 'search',
  initialState: { article: '', brand: '' },
  reducers: {
    articleChanged(state, action) {
      state.article = action.payload;
      state.brand = '';
    },
    brandSelected(state, action) {
      state.brand = action.payload;
    },
  },
});

export const { articleChanged, brandSelected } = searchSlice.actions;

export function createAppStore() {
  return configureStore({
    reducer: { search: searchSlice.reducer, [partsApi.reducerPath]: partsApi.reducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(partsApi.middleware),
  });
}
