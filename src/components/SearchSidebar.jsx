import { useRef } from 'react';
import { Icon } from './Icon';
import { Loader, StatusPanel } from './StatusPanel';

export function SearchSidebar({ article, onArticleChange, selectedBrand, onBrandSelect, brands, loading, error, onRetry }) {
  const inputRef = useRef(null);
  function clear() {
    onArticleChange('');
    inputRef.current?.focus();
  }
  return <aside className="panel search-sidebar" aria-label="Поиск производителей">
    <label className="form-label" htmlFor="article">Артикул детали</label>
    <div className="search-field">
      <Icon name="search" />
      <input id="article" ref={inputRef} className="form-control" type="text" value={article} onChange={(event) => onArticleChange(event.target.value)} placeholder="Например, 0189" autoComplete="off" spellCheck={false} aria-describedby="article-hint" />
      {article && <button className="clear-input" type="button" onClick={clear} aria-label="Очистить артикул"><Icon name="close" /></button>}
    </div>
    <p className="search-hint" id="article-hint">Поиск после ввода · пример: <button type="button" onClick={() => onArticleChange('0189')}>0189</button></p>
    <section className="brands-section" aria-label="Производители" aria-busy={loading}>
      {loading ? <Loader>Ищем производителей…</Loader>
        : error ? <StatusPanel title="Не удалось найти производителей" error compact onRetry={onRetry}>{error.message}</StatusPanel>
          : !article.trim() ? <p className="sidebar-hint">Введите артикул, чтобы увидеть список производителей.</p>
            : !brands.length ? <StatusPanel title="Ничего не найдено" icon="search" compact>Проверьте артикул или попробуйте другой номер.</StatusPanel>
              : <>
                <div className="brands-heading"><h2>Производители</h2><span>Найдено: {brands.length}</span></div>
                <div className="brand-list">{brands.map((brand) => <button className={`brand-button ${brand === selectedBrand ? 'selected' : ''}`} key={brand} type="button" onClick={() => onBrandSelect(brand)} aria-pressed={brand === selectedBrand}><span>{brand}</span><Icon name={brand === selectedBrand ? 'check' : 'right'} /></button>)}</div>
              </>}
    </section>
  </aside>;
}
