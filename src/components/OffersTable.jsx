import { formatPrice } from '../parts';
import { Icon } from './Icon';

function Stock({ value }) {
  if (value === null) return <span className="stock-unknown">Не указан</span>;
  return <span className={`stock ${value > 0 ? 'in-stock' : ''}`}><span className="stock-dot" />{value} шт.</span>;
}

export function OffersTable({ parts }) {
  return <>
    <div className="panel offers-table-wrap">
      <table className="table offers-table mb-0">
        <caption className="visually-hidden">Запрошенные детали и аналоги: предложения по каждому складу. Цены в рублях.</caption>
        <thead><tr><th scope="col">Деталь / производитель</th><th scope="col">Склад</th><th scope="col">Остаток</th><th scope="col" className="text-end">Цена</th></tr></thead>
        <tbody>{parts.flatMap((part) => (part.offers.length ? part.offers : [null]).map((offer, index) => <tr key={`${part.id}:${offer?.id ?? 'no-offers'}`}>
          <td className="part-cell"><div className="part-name">{part.name}</div><div className="part-details"><span>{part.brand} · <span className="part-number">{part.number || '—'}</span></span>{index === 0 && <span className={`part-tag ${part.requested ? 'requested' : ''}`}>{part.requested ? 'Запрошенная деталь' : 'Аналог'}</span>}</div></td>
          <td className="warehouse-cell" data-label="Склад">{offer?.warehouse ?? '—'}</td>
          <td className="stock-cell" data-label="Остаток">{offer ? <Stock value={offer.stock} /> : <span className="stock-unknown">Нет предложений</span>}</td>
          <td className={`price-cell ${offer?.price == null ? 'price-missing' : ''}`} data-label="Цена">{formatPrice(offer?.price ?? null)}</td>
        </tr>))}</tbody>
      </table>
    </div>
    <p className="table-note"><Icon name="info" /><span>Цена и остаток указаны для каждого склада. Прочерк означает, что цена не предоставлена.</span></p>
  </>;
}
