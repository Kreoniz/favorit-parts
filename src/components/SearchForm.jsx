import { useRef } from 'react';
import { plural } from '../parts';
import { ErrorAlert } from './StatusPanel';

export function SearchForm({ article, onArticleChange, selectedBrand, onBrandSelect, brands, loading, error, onRetry }) {
  const inputRef = useRef(null);
  const hasArticle = Boolean(article.trim());
  const disabled = !hasArticle || loading || Boolean(error) || !brands.length;

  let placeholder = 'Выберите производителя';
  if (!hasArticle) placeholder = 'Сначала введите артикул';
  else if (loading) placeholder = 'Ищем производителей…';
  else if (error) placeholder = 'Поиск недоступен';
  else if (!brands.length) placeholder = 'Производители не найдены';

  function clear() {
    onArticleChange('');
    inputRef.current?.focus();
  }

  return (
    <form className="search-form bg-body-tertiary rounded p-3 p-md-4 mb-4" onSubmit={(event) => event.preventDefault()} aria-label="Поиск запчастей">
      <div className="row g-3">
        <div className="col-12 col-md-6">
          <label className="form-label fw-medium" htmlFor="article">Артикул</label>
          <div className="input-group">
            <input
              id="article"
              ref={inputRef}
              className="form-control"
              type="text"
              value={article}
              onChange={(event) => onArticleChange(event.target.value)}
              placeholder="Номер детали"
              autoComplete="off"
              spellCheck={false}
              aria-describedby="article-hint"
            />
            <button className="btn btn-outline-secondary px-3" type="button" onClick={clear} disabled={!article} aria-label="Очистить артикул">
              <span aria-hidden="true">×</span>
            </button>
          </div>
          <p className="form-text mb-0 mt-2" id="article-hint">
            Например, <button className="btn btn-link p-0 align-baseline example-button" type="button" onClick={() => onArticleChange('0189')}>0189</button>. Поиск после ввода.
          </p>
        </div>
        <div className="col-12 col-md-6" aria-busy={loading}>
          <label className="form-label fw-medium" htmlFor="manufacturer">Производитель</label>
          <select
            id="manufacturer"
            className="form-select"
            value={selectedBrand}
            onChange={(event) => onBrandSelect(event.target.value)}
            disabled={disabled}
            aria-describedby="manufacturer-hint"
          >
            <option value="">{placeholder}</option>
            {!disabled && brands.map((brand) => <option key={brand} value={brand}>{brand}</option>)}
          </select>
          <p className="form-text mb-0 mt-2" id="manufacturer-hint" role="status">
            {loading ? <><span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />Ищем производителей…</>
              : !hasArticle ? 'Список появится после поиска.'
                : error ? 'Повторите запрос ниже.'
                  : brands.length ? `Найдено ${plural(brands.length, ['производитель', 'производителя', 'производителей'])}.`
                    : 'Попробуйте другой артикул.'}
          </p>
        </div>
        {error && (
          <div className="col-12">
            <ErrorAlert title="Не удалось найти производителей" onRetry={onRetry}>{error.message}</ErrorAlert>
          </div>
        )}
      </div>
    </form>
  );
}
