import { useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { filterParts, plural } from '../parts';
import { OffersTable } from './OffersTable';
import { StatusPanel } from './StatusPanel';

export function ResultsView({ parts, brand, number }) {
  const [query, setQuery] = useState('');
  const searchRef = useRef(null);
  const filtered = filterParts(parts, query);
  const offerCount = parts.reduce((sum, part) => sum + part.offers.length, 0);
  const visibleOffers = filtered.reduce((sum, part) => sum + part.offers.length, 0);

  function clearFilter() {
    setQuery('');
    searchRef.current?.focus();
  }

  return (
    <>
      <div className="results-toolbar d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-3">
        <div>
          <h2 className="fs-5 fw-semibold text-break mb-1">{brand} · {number}</h2>
          <p className="small text-body-secondary mb-0" role="status">
            {query.trim() ? `Показано ${filtered.length} из ${parts.length}` : plural(parts.length, ['деталь', 'детали', 'деталей'])} · {plural(visibleOffers, ['предложение', 'предложения', 'предложений'])}
          </p>
        </div>
        <div className="input-group results-search">
          <span className="input-group-text" aria-hidden="true"><Search size={18} strokeWidth={1.75} /></span>
          <input ref={searchRef} className="form-control" type="text" role="searchbox" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Название, бренд или артикул" aria-label="Поиск в результатах" />
          {query && (
            <button className="btn btn-outline-secondary px-3" type="button" onClick={clearFilter} aria-label="Сбросить поиск в результатах">
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
      {offerCount === 0 && <p className="small text-body-secondary" role="status">Детали найдены, но складских предложений сейчас нет.</p>}
      {filtered.length ? <OffersTable parts={filtered} /> : (
        <StatusPanel title="Совпадений не найдено">Измените текст поиска или очистите фильтр.</StatusPanel>
      )}
    </>
  );
}
