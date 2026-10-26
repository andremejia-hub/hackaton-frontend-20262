import { Link } from 'react-router-dom'
import type { Wanted } from '../lib/types'
import { statuses } from '../lib/wantedQuery'
import { number } from '../lib/format'

export function WantedCard({ wanted, search = '' }: { wanted: Wanted; search?: string }) {
  return <article className="wanted-card">
    <div className="flex items-center justify-between gap-2"><span className="eyebrow">Se busca</span><span className="badge">{statuses[wanted.status]}</span></div>
    <h2><Link to={{ pathname: `/wanted/${encodeURIComponent(wanted.id)}`, search }} state={{ from: `/wanted${search}` }}>{wanted.name}</Link></h2>
    <p className="epithet">«{wanted.epithet}»</p>
    <p className="bounty">{number(wanted.bounty)} <small>berries</small></p>
    <div className="card-meta"><p>{wanted.crew.name}</p><p>{wanted.devilFruit ? `${wanted.devilFruit.name} · ${wanted.devilFruit.type}` : 'Sin fruta del diablo'}</p><p>Última isla: {wanted.lastSeenIsland}</p><p>Amenaza: {wanted.threatLevel}/5</p></div>
  </article>
}
