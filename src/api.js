import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { apiErrorMessage, getBrands, getParts, readGoods } from './parts';

const apiKey = import.meta.env?.VITE_FAVORIT_API_KEY?.trim();
export const API_URL = import.meta.env?.VITE_FAVORIT_API_URL?.trim() || 'https://api.favorit-parts.ru/hs/hsprice/';

const request = fetchBaseQuery({ baseUrl: API_URL, timeout: 15000 });

function requestErrorMessage(error) {
  if (error.data?.error) return apiErrorMessage(error.data.error);
  if (error.status === 'TIMEOUT_ERROR') return 'Сервис не ответил за 15 секунд. Попробуйте ещё раз.';
  if (error.status === 'FETCH_ERROR') return 'Не удалось связаться с сервисом. Проверьте подключение к интернету и повторите запрос.';
  const status = typeof error.status === 'number' ? error.status : error.originalStatus;
  if (status === 429) return 'Слишком много запросов. Подождите немного и попробуйте снова.';
  if (typeof status === 'number' && status >= 400) return `Сервис временно недоступен (HTTP ${status}). Попробуйте позже.`;
  if (error.status === 'PARSING_ERROR') return 'Сервис вернул некорректный ответ. Попробуйте позже.';
  return 'Сервис временно недоступен. Попробуйте позже.';
}

export const partsApi = createApi({
  reducerPath: 'partsApi',
  baseQuery: async (params, api, extraOptions) => {
    if (!apiKey) {
      const message = 'Не настроен доступ к сервису. Проверьте конфигурацию приложения.';
      return { error: { status: 'CUSTOM_ERROR', error: message, message } };
    }
    const result = await request({ url: '', params: { key: apiKey, ...params } }, api, extraOptions);
    if (result.error) return { error: { ...result.error, message: requestErrorMessage(result.error) } };
    try {
      return { data: readGoods(result.data) };
    } catch (error) {
      return { error: { status: 'CUSTOM_ERROR', error: error.message, message: error.message } };
    }
  },
  keepUnusedDataFor: 30,
  endpoints: (builder) => ({
    getBrands: builder.query({
      query: (number) => ({ number }),
      transformResponse: getBrands,
    }),
    getOffers: builder.query({
      query: ({ number, brand }) => ({ number, brand, analogues: 'on' }),
      transformResponse: getParts,
    }),
  }),
});

export const { useGetBrandsQuery, useGetOffersQuery } = partsApi;
