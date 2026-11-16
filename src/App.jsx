import { skipToken } from '@reduxjs/toolkit/query';
import { useDispatch, useSelector } from 'react-redux';
import { useGetBrandsQuery, useGetOffersQuery } from './api';
import { articleChanged, brandSelected } from './store';
import { useDebouncedValue } from './hooks/useDebouncedValue';
import { plural } from './parts';
import { useColorMode } from './hooks/useColorMode';
import { SearchForm } from './components/SearchForm';
import { OffersTable } from './components/OffersTable';
import { ErrorAlert, Loader, StatusPanel } from './components/StatusPanel';

export default function App() {
  const dispatch = useDispatch();
  const [colorMode, setColorMode] = useColorMode();
  const { article, brand } = useSelector((state) => state.search);
  const number = article.trim();
  const debouncedNumber = useDebouncedValue(number);
  const waitingForInput = number !== debouncedNumber;
  const brandsQuery = useGetBrandsQuery(number && !waitingForInput ? number : skipToken, { refetchOnMountOrArgChange: true });
  const offersQuery = useGetOffersQuery(number && brand ? { number, brand } : skipToken, { refetchOnMountOrArgChange: true });
  // currentData is scoped to the current arguments; responses for older inputs cannot appear here.
  const brands = brandsQuery.currentData ?? [];
  const parts = offersQuery.currentData ?? [];
  const brandsLoading = Boolean(number) && (waitingForInput || brandsQuery.isFetching);
  const offersLoading = Boolean(brand) && offersQuery.isFetching;
  const brandsError = brandsQuery.isError && !waitingForInput ? brandsQuery.error : null;
  const offerCount = parts.reduce((sum, part) => sum + part.offers.length, 0);

  let content;
  if (!number) {
    content = <StatusPanel title="Начните с артикула">Введите номер детали, чтобы найти производителей.</StatusPanel>;
  } else if (brandsLoading || brandsError) {
    content = null;
  } else if (!brands.length) {
    content = <StatusPanel title="Производители не найдены">Проверьте артикул или попробуйте другой номер.</StatusPanel>;
  } else if (!brand) {
    content = <StatusPanel title="Выберите производителя">После выбора появятся цены, остатки и аналоги детали.</StatusPanel>;
  } else if (offersLoading) {
    content = <Loader>Получаем предложения и аналоги…</Loader>;
  } else if (offersQuery.isError) {
    content = <ErrorAlert title="Не удалось получить предложения" onRetry={offersQuery.refetch}>{offersQuery.error.message}</ErrorAlert>;
  } else if (!parts.length) {
    content = <StatusPanel title="Детали не найдены">Выберите другого производителя или проверьте артикул.</StatusPanel>;
  } else {
    content = <OffersTable parts={parts} />;
  }

  return (
    <main className="container app-container px-3 px-md-4 py-4">
      <div className="d-flex justify-content-between align-items-center gap-3 mb-4">
        <h1 className="app-title fw-semibold mb-0">Поиск запчастей</h1>
        <div className="d-flex align-items-center gap-2">
          <label className="text-body-secondary small d-none d-sm-inline" htmlFor="color-mode">Тема</label>
          <select id="color-mode" className="form-select w-auto" value={colorMode} onChange={(event) => setColorMode(event.target.value)} aria-label="Цветовая тема">
            <option value="auto">Авто</option>
            <option value="light">Светлая</option>
            <option value="dark">Тёмная</option>
          </select>
        </div>
      </div>
      <SearchForm
        article={article}
        onArticleChange={(value) => dispatch(articleChanged(value))}
        selectedBrand={brand}
        onBrandSelect={(value) => dispatch(brandSelected(value))}
        brands={brands}
        loading={brandsLoading}
        error={brandsError}
        onRetry={brandsQuery.refetch}
      />
      <section aria-label="Предложения и аналоги" aria-busy={offersLoading}>
        {brand && (
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <h2 className="fs-5 fw-semibold text-break mb-0">{brand} · {number}</h2>
            {!offersLoading && !offersQuery.isError && parts.length > 0 && (
              <p className="small text-body-secondary mb-0" role="status">
                {plural(parts.length, ['деталь', 'детали', 'деталей'])} · {plural(offerCount, ['предложение', 'предложения', 'предложений'])}
              </p>
            )}
          </div>
        )}
        {brand && !offersLoading && !offersQuery.isError && parts.length > 0 && offerCount === 0 && (
          <p className="small text-body-secondary" role="status">Детали найдены, но складских предложений сейчас нет.</p>
        )}
        {content}
      </section>
    </main>
  );
}
