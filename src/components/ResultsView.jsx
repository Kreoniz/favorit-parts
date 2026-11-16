import { useRef } from 'react';
import { Search, X } from 'lucide-react';
import { filterParts, getOfferRows, plural, SORT_OPTIONS } from '../parts';
import { OffersTable } from './OffersTable';
import { StatusPanel } from './StatusPanel';

export function ResultsView({ parts, brand, number, query, onQueryChange, sort, onSortChange }) {
  const searchRef = useRef(null);
  const filtered = filterParts(parts, query);
  const rows = getOfferRows(filtered, sort);
  const offerCount = parts.reduce((sum, part) => sum + part.offers.length, 0);
  const visibleOffers = filtered.reduce((sum, part) => sum + part.offers.length, 0);

  function clearFilter() {
    onQueryChange('');
    searchRef.current?.focus();
  }

  return (
    <>
      <div className="results-toolbar d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-3">
        <div>
          <h2 className="fs-5 fw-semibold text-break mb-1">{brand} · {number}</h2>
          <p className="small text-body-secondary mb-0" role="status">
            {query.trim() ? `Показано ${filtered.length} из ${parts.length}` : plural(parts.length, ['деталь', 'детали', 'деталей'])} · {plural(visibleOffers, ['предложение', 'предложения', 'предложений'])}
          </p>
        </div>
        <div className="results-tools d-flex flex-column flex-sm-row gap-2">
          <div className="input-group results-search">
            <span className="input-group-text" aria-hidden="true"><Search size={18} strokeWidth={1.75} /></span>
            <input ref={searchRef} className="form-control" type="text" role="searchbox" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Название, бренд или артикул" aria-label="Поиск в результатах" />
            {query && (
              <button className="btn btn-outline-secondary px-3" type="button" onClick={clearFilter} aria-label="Сбросить поиск в результатах">
                <X size={16} aria-hidden="true" />
              </button>
            )}
          </div>
          <select className="form-select results-sort" value={sort} onChange={(event) => onSortChange(event.target.value)} aria-label="Сортировка предложений">
            {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
      </div>
      {offerCount === 0 && <p className="small text-body-secondary" role="status">Детали найдены, но складских предложений сейчас нет.</p>}
      {filtered.length ? <OffersTable rows={rows} /> : (
        <StatusPanel title="Совпадений не найдено">Измените текст поиска или очистите фильтр.</StatusPanel>
      )}
    </>
  );
}
