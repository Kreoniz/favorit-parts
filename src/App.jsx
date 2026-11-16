import { useEffect } from 'react';
import { skipToken } from '@reduxjs/toolkit/query';
import { useDispatch, useSelector } from 'react-redux';
import { useGetBrandsQuery, useGetOffersQuery } from './api';
import { articleChanged, brandSelected, filterChanged, searchRestored, sortChanged } from './store';
import { useDebouncedValue } from './hooks/useDebouncedValue';
import { useColorMode } from './hooks/useColorMode';
import { SearchForm } from './components/SearchForm';
import { ResultsView } from './components/ResultsView';
import { ThemeToggle } from './components/ThemeToggle';
import { ErrorAlert, Loader, StatusPanel } from './components/StatusPanel';

export default function App() {
  const dispatch = useDispatch();
  const [colorMode, setColorMode] = useColorMode();
  const { article, brand, filter, sort } = useSelector((state) => state.search);
  const number = article.trim();
  const debouncedNumber = useDebouncedValue(number);
  const waitingForInput = number !== debouncedNumber;
  const brandsQuery = useGetBrandsQuery(number && !waitingForInput ? number : skipToken, { refetchOnMountOrArgChange: true });
  // currentData is scoped to the current arguments; responses for older inputs cannot appear here.
  const brands = brandsQuery.currentData ?? [];
  const brandsLoading = Boolean(number) && (waitingForInput || brandsQuery.isFetching);
  const matchedBrand = !brandsLoading ? brands.find((value) => value.toLowerCase() === brand.toLowerCase()) || '' : '';
  const offersQuery = useGetOffersQuery(number && matchedBrand ? { number, brand: matchedBrand } : skipToken, { refetchOnMountOrArgChange: true });
  const parts = offersQuery.currentData ?? [];
  const offersLoading = Boolean(matchedBrand) && offersQuery.isFetching;
  const brandsError = brandsQuery.isError && !waitingForInput ? brandsQuery.error : null;
  const hasResults = Boolean(matchedBrand) && !offersLoading && !offersQuery.isError && parts.length > 0;

  useEffect(() => {
    if (brand && !brandsLoading && brandsQuery.isSuccess && matchedBrand !== brand) {
      // Canonicalize a linked brand after stage one, without adding a history entry.
      dispatch(searchRestored({ article, brand: matchedBrand, filter, sort }));
    }
  }, [article, brand, filter, sort, brandsLoading, brandsQuery.isSuccess, matchedBrand, dispatch]);

  let content;
  if (!number) {
    content = <StatusPanel title="Начните с артикула">Введите номер детали, чтобы найти производителей.</StatusPanel>;
  } else if (brandsLoading || brandsError) {
    content = null;
  } else if (!brands.length) {
    content = <StatusPanel title="Производители не найдены">Проверьте артикул или попробуйте другой номер.</StatusPanel>;
  } else if (!matchedBrand) {
    content = <StatusPanel title="Выберите производителя">После выбора появятся цены, остатки и аналоги детали.</StatusPanel>;
  } else if (offersLoading) {
    content = <Loader>Получаем предложения и аналоги…</Loader>;
  } else if (offersQuery.isError) {
    content = <ErrorAlert title="Не удалось получить предложения" onRetry={offersQuery.refetch}>{offersQuery.error.message}</ErrorAlert>;
  } else if (!parts.length) {
    content = <StatusPanel title="Детали не найдены">Выберите другого производителя или проверьте артикул.</StatusPanel>;
  } else {
    content = (
      <ResultsView
        parts={parts}
        brand={matchedBrand}
        number={number}
        query={filter}
        onQueryChange={(value) => dispatch(filterChanged(value))}
        sort={sort}
        onSortChange={(value) => dispatch(sortChanged(value))}
      />
    );
  }

  return (
    <main className="container app-container px-3 px-md-4 py-4">
      <div className="d-flex justify-content-between align-items-center gap-3 mb-4">
        <h1 className="app-title fw-semibold mb-0">Поиск запчастей</h1>
        <ThemeToggle mode={colorMode} onChange={setColorMode} />
      </div>
      <SearchForm
        article={article}
        onArticleChange={(value) => dispatch(articleChanged(value))}
        selectedBrand={matchedBrand}
        onBrandSelect={(value) => dispatch(brandSelected(value))}
        brands={brands}
        loading={brandsLoading}
        error={brandsError}
        onRetry={brandsQuery.refetch}
      />
      <section aria-label="Предложения и аналоги" aria-busy={offersLoading}>
        {matchedBrand && !hasResults && (
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <h2 className="fs-5 fw-semibold text-break mb-0">{matchedBrand} · {number}</h2>
          </div>
        )}
        {content}
      </section>
    </main>
  );
}
