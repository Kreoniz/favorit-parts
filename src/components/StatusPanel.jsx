import { Icon } from './Icon';

export function StatusPanel({ title, children, error = false, onRetry, compact = false, icon = 'box' }) {
  return <div className={`status-panel ${compact ? 'status-compact' : ''} ${error ? 'status-error' : ''}`} role={error ? 'alert' : 'status'}>
    <span className="status-icon"><Icon name={error ? 'alert' : icon} /></span>
    <h3>{title}</h3>
    {children && <p>{children}</p>}
    {onRetry && <button className="btn btn-outline-secondary retry-button" type="button" onClick={onRetry}>Повторить запрос</button>}
  </div>;
}

export function Loader({ children, skeleton = false }) {
  return <div className={skeleton ? 'offers-loader panel' : 'brands-loader'}>
    <div className="loading-label" role="status"><span className="spinner-border spinner-border-sm" aria-hidden="true" />{children}</div>
    {skeleton && <div className="skeletons" aria-hidden="true">{[0, 1, 2].map((row) => <div className="skeleton-row" key={row}><span /><span /><span /></div>)}</div>}
  </div>;
}
