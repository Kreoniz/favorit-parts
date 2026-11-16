import { formatPrice } from '../parts';

function Stock({ value }) {
  if (value === null) return <span className="text-body-secondary">Не указан</span>;
  return <span className={`text-nowrap tabular-numbers ${value > 0 ? 'text-success-emphasis' : 'text-body-secondary'}`}>{value} шт.</span>;
}

function PartDetails({ part }) {
  return (
    <>
      <div className="fw-semibold text-break">{part.name}</div>
      <div className="small text-body-secondary text-break mt-1">
        {part.brand} · {part.number || '-'} · {part.requested ? 'Искомая' : 'Аналог'}
      </div>
    </>
  );
}

function OfferStock({ offer }) {
  return offer ? <Stock value={offer.stock} /> : <span className="text-body-secondary">Нет предложений</span>;
}

export function OffersTable({ rows }) {
  return (
    <>
      <div className="d-none d-md-block border rounded overflow-hidden">
        <table className="table table-sm table-hover align-middle offers-table mb-0">
          <caption className="visually-hidden">Запрошенная деталь и аналоги: складские предложения, цены в рублях.</caption>
          <thead>
            <tr>
              <th scope="col">Деталь</th>
              <th scope="col">Склад</th>
              <th scope="col" className="text-end">Остаток</th>
              <th scope="col" className="text-end">Цена</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ part, offer }) => (
              <tr key={`${part.id}:${offer?.id ?? 'no-offers'}`}>
                <td><PartDetails part={part} /></td>
                <td className="small text-body-secondary text-break">{offer?.warehouse ?? '-'}</td>
                <td className="small text-end"><OfferStock offer={offer} /></td>
                <td className={`text-end text-nowrap fw-semibold tabular-numbers ${offer?.price == null ? 'text-body-secondary' : ''}`}>
                  {formatPrice(offer?.price ?? null)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="d-md-none border rounded overflow-hidden">
        <div className="list-group list-group-flush" aria-label="Складские предложения">
          {rows.map(({ part, offer }) => (
            <article className="list-group-item p-3" key={`${part.id}:${offer?.id ?? 'no-offers'}`}>
              <PartDetails part={part} />
              <dl className="row g-1 small mb-0 mt-3">
                <dt className="col-5 fw-normal text-body-secondary">Склад</dt>
                <dd className="col-7 text-end text-break mb-1">{offer?.warehouse ?? '-'}</dd>
                <dt className="col-5 fw-normal text-body-secondary">Остаток</dt>
                <dd className="col-7 text-end mb-1"><OfferStock offer={offer} /></dd>
                <dt className="col-5 fw-normal text-body-secondary">Цена</dt>
                <dd className={`col-7 text-end fw-semibold tabular-numbers fs-6 mb-0 ${offer?.price == null ? 'text-body-secondary' : ''}`}>
                  {formatPrice(offer?.price ?? null)}
                </dd>
              </dl>
            </article>
          ))}
        </div>
      </div>
      <p className="small text-body-secondary mt-3 mb-0">Цена и остаток для указанного склада. Прочерк означает, что цена не предоставлена.</p>
    </>
  );
}
