import { useRef } from 'react';
import { X } from 'lucide-react';
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
    <form className="search-form bg-body-tertiary rounded p-3 mb-4" onSubmit={(event) => event.preventDefault()} aria-label="Поиск запчастей">
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
            />
            <button className="btn btn-outline-secondary px-3" type="button" onClick={clear} disabled={!article} aria-label="Очистить артикул">
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="col-12 col-md-6" aria-busy={loading}>
          <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
            <label className="form-label fw-medium mb-0" htmlFor="manufacturer">Производитель</label>
            {loading ? <span className="spinner-border spinner-border-sm text-primary" aria-hidden="true" />
              : !error && brands.length > 0 ? <span className="small text-body-secondary" aria-hidden="true">{brands.length}</span> : null}
          </div>
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
          <p className="visually-hidden" id="manufacturer-hint" role="status">
            {loading ? 'Ищем производителей…'
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
