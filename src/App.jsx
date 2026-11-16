import { skipToken } from '@reduxjs/toolkit/query';
import { useDispatch, useSelector } from 'react-redux';
import { useGetBrandsQuery, useGetOffersQuery, usesDemoKey } from './api';
import { articleChanged, brandSelected } from './store';
import { useDebouncedValue } from './hooks/useDebouncedValue';
import { plural } from './parts';
import { Icon } from './components/Icon';
import { SearchSidebar } from './components/SearchSidebar';
import { OffersTable } from './components/OffersTable';
import { Loader, StatusPanel } from './components/StatusPanel';

export default function App() {
  const dispatch = useDispatch();
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
  const offerCount = parts.reduce((sum, part) => sum + part.offers.length, 0);

  let content;
  if (!number) {
    content = <StatusPanel title="Начните с артикула" icon="search">Введите номер детали слева. Мы найдём производителей, а затем — предложения и аналоги.</StatusPanel>;
  } else if (!brand) {
    content = <StatusPanel title={brands.length ? 'Выберите производителя' : 'Подберите нужную деталь'}>Предложения и аналоги появятся после выбора производителя в списке.</StatusPanel>;
  } else if (offersLoading) {
    content = <Loader skeleton>Получаем предложения и аналоги…</Loader>;
  } else if (offersQuery.isError) {
    content = <StatusPanel title="Не удалось получить предложения" error onRetry={offersQuery.refetch}>{offersQuery.error.message}</StatusPanel>;
  } else if (!parts.length) {
    content = <StatusPanel title="Предложения не найдены" icon="search">Для этого производителя сервис не вернул деталей. Выберите другой бренд или измените артикул.</StatusPanel>;
  } else {
    content = <OffersTable parts={parts} />;
  }

  return <div className="app-shell">
    <header className="app-header">
      <div className="wordmark"><span className="brand-mark"><Icon name="box" /></span><span>favorit<span className="wordmark-light"> parts</span></span></div>
      <span className="access-label" title={usesDemoKey ? 'Публичный ключ из документации Favorit Parts. Данные загружаются из настоящего API.' : 'Данные загружаются из API Favorit Parts.'}><span className="access-dot" />{usesDemoKey ? 'Демо-доступ' : 'API Favorit Parts'}</span>
    </header>
    <main>
      <div className="page-heading"><div><p className="eyebrow">Каталог запчастей</p><h1>Поиск и подбор</h1></div><p className="heading-note">От артикула<br />к предложениям</p></div>
      <div className="workspace">
        <SearchSidebar article={article} onArticleChange={(value) => dispatch(articleChanged(value))} selectedBrand={brand} onBrandSelect={(value) => dispatch(brandSelected(value))} brands={brands} loading={brandsLoading} error={brandsQuery.isError && !waitingForInput ? brandsQuery.error : null} onRetry={brandsQuery.refetch} />
        <section className="results-section" aria-label="Предложения и аналоги" aria-busy={offersLoading}>
          <div className="results-heading"><div className="selected-brand"><span className="brand-initial">{brand ? brand.slice(0, 2) : <Icon name="box" />}</span><div><h2>{brand || 'Предложения и аналоги'}</h2><p>{brand ? `${number} · аналоги и наличие` : 'Два шага до нужной детали'}</p></div></div>{brand && !offersLoading && !offersQuery.isError && parts.length > 0 && <p className="results-count">{plural(parts.length, ['позиция', 'позиции', 'позиций'])}<br />{plural(offerCount, ['предложение', 'предложения', 'предложений'])}</p>}</div>
          <div className={brand && (offersLoading || parts.length) && !offersQuery.isError ? '' : 'panel'}>{content}</div>
        </section>
      </div>
    </main>
    <footer className="app-footer">Данные предоставляет <a href="https://lk.favorit-parts.ru/static/wsprice.pdf" target="_blank" rel="noreferrer">API Favorit Parts<Icon name="right" /></a></footer>
  </div>;
}
