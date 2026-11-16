export function StatusPanel({ title, children, actions }) {
  return (
    <div className="border rounded p-4 p-md-5 text-center" role="status">
      <h2 className="fs-5 mb-2">{title}</h2>
      {children && <p className="text-body-secondary mb-0">{children}</p>}
      {actions}
    </div>
  );
}

export function ErrorAlert({ title, children, onRetry }) {
  return (
    <div className="alert alert-danger mb-0" role="alert">
      <h2 className="fs-6 fw-semibold mb-2">{title}</h2>
      <p className="mb-3">{children}</p>
      <button className="btn btn-primary" type="button" onClick={onRetry}>Повторить запрос</button>
    </div>
  );
}

export function Loader({ children }) {
  return (
    <div className="border rounded p-4 p-md-5 text-center" role="status">
      <div className="spinner-border text-primary mb-3" aria-hidden="true" />
      <p className="text-body-secondary mb-0">{children}</p>
    </div>
  );
}
