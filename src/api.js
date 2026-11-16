import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiErrorMessage, getBrands, getParts, readGoods } from './parts';

const apiKey = import.meta.env?.VITE_FAVORIT_API_KEY?.trim();
const apiUrl = import.meta.env?.VITE_FAVORIT_API_URL?.trim() || 'https://api.favorit-parts.ru/hs/hsprice/';

function httpError(status) {
  return status === 429
    ? 'Слишком много запросов. Подождите немного и попробуйте снова.'
    : `Сервис временно недоступен (HTTP ${status}). Попробуйте позже.`;
}

export async function requestGoods(params, { signal, timeoutMs = 15000 } = {}) {
  if (!apiKey) throw new Error('Не настроен доступ к сервису. Проверьте конфигурацию приложения.');
  const url = new URL(apiUrl);
  url.search = new URLSearchParams({ key: apiKey, ...params });
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  signal?.addEventListener('abort', abort, { once: true });
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    let response;
    let body;
    try {
      response = await fetch(url, { signal: controller.signal });
      body = await response.text();
    } catch {
      if (signal?.aborted) throw new DOMException('Запрос отменён.', 'AbortError');
      if (timedOut) throw new Error('Сервис не ответил за 15 секунд. Попробуйте ещё раз.');
      throw new Error('Не удалось связаться с сервисом. Проверьте подключение к интернету и повторите запрос.');
    }
    let data;
    try {
      data = body.trim() ? JSON.parse(body) : null;
    } catch {
      throw new Error(response.ok ? 'Сервис вернул некорректный ответ. Попробуйте позже.' : httpError(response.status));
    }
    if (data?.error) throw new Error(apiErrorMessage(data.error));
    if (!response.ok) throw new Error(httpError(response.status));
    return readGoods(data);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}

export const loadBrands = createAsyncThunk('catalog/brands', async (number, { signal }) =>
  getBrands(await requestGoods({ number }, { signal })),
);

export const loadOffers = createAsyncThunk('catalog/offers', async ({ number, brand }, { signal }) =>
  getParts(await requestGoods({ number, brand, analogues: 'on' }, { signal })),
);
