import { useCallback, useEffect } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ApiError, request } from '../lib/api'
import type { WantedDetail as Detail } from '../lib/types'
import { useResource } from '../lib/useResource'
import { EmptyState, ErrorState, Loading } from '../components/Feedback'
import { date, number } from '../lib/format'
import { statuses } from '../lib/wantedQuery'

export function WantedDetail() {
  const { id = '' } = useParams()
  useEffect(() => { window.scrollTo(0, 0) }, [id])
  const location = useLocation()
  const load = useCallback((signal: AbortSignal) => request<Detail>(`/wanted/${encodeURIComponent(id)}`, { signal }), [id])
  const resource = useResource(id, load)
  const wanted = resource.data
  return <><Link className="back-link" to={`/wanted${location.search}`}>← Volver a los carteles</Link>
    {resource.loading ? <Loading /> : resource.error ? resource.error instanceof ApiError && resource.error.status === 404 ? <EmptyState title="Cartel no encontrado" text="El cartel no existe en el workspace de esta tripulación." /> : <ErrorState error={resource.error} retry={resource.retry} /> : wanted && <>
      <div className="page-heading"><div><p className="eyebrow">Expediente de la Guild · Se busca</p><h1>{wanted.name}</h1><p className="epithet">«{wanted.epithet}»</p></div><span className="badge">{statuses[wanted.status]}</span></div>
      <div className="detail-grid"><section className="wanted-card detail-poster"><p className="eyebrow">Recompensa</p><p className="bounty">{number(wanted.bounty)} <small>berries</small></p><dl><div><dt>Tripulación</dt><dd>{wanted.crew.name}</dd></div><div><dt>Rol</dt><dd>{wanted.role}</dd></div><div><dt>Fruta del diablo</dt><dd>{wanted.devilFruit ? `${wanted.devilFruit.name} (${wanted.devilFruit.type})` : 'Sin fruta'}</dd></div><div><dt>Amenaza</dt><dd>{wanted.threatLevel}/5</dd></div><div><dt>Edad</dt><dd>{wanted.age} años</dd></div><div><dt>Altura</dt><dd>{wanted.heightCm} cm</dd></div></dl></section>
      <div className="detail-info"><section className="panel"><h2>Historia del cartel</h2><p className="bio">{wanted.bio}</p><h3>Último avistamiento</h3><p>{wanted.lastSeen.island} · {date(wanted.lastSeen.seenAt)}</p><p className="muted">Cartel actualizado: {date(wanted.updatedAt)}</p></section>
      <section className="panel"><h2>Historial de recompensas</h2>{wanted.bountyHistory.length ? <ol className="history">{wanted.bountyHistory.map((entry, index) => <li key={`${entry.issuedAt}-${index}`}><time dateTime={entry.issuedAt}>{date(entry.issuedAt)}</time><strong>{number(entry.amount)} berries</strong></li>)}</ol> : <p>No hay emisiones anteriores.</p>}</section></div></div>
    </>}
  </>
}
