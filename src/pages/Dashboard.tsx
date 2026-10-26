import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { request } from '../lib/api'
import type { DashboardSummary, LogPose } from '../lib/types'
import { useResource } from '../lib/useResource'
import { EmptyState, ErrorState, Loading } from '../components/Feedback'
import { WantedCard } from '../components/WantedCard'
import { number } from '../lib/format'
import { fruits, statuses } from '../lib/wantedQuery'

export function Dashboard() {
  const load = useCallback((signal: AbortSignal) => Promise.all([
    request<DashboardSummary>('/dashboard/summary', { signal }), request<LogPose>('/log-pose', { signal }),
  ]), [])
  const resource = useResource('dashboard', load)
  return <><div className="page-heading"><div><p className="eyebrow">La Guild · Centro de operaciones</p><h1>Bitácora de la tripulación</h1><p className="muted">Un vistazo al mundo antes de zarpar.</p></div><Link className="button" to="/wanted">Explorar carteles →</Link></div>
    {resource.loading ? <Loading /> : resource.error ? <ErrorState error={resource.error} retry={resource.retry} /> : resource.data && (() => {
      const [summary, pose] = resource.data
      return <><section className="pose-panel" aria-label="Estado del Log Pose"><span className="pose-icon" aria-hidden="true">⌖</span><div><p className="eyebrow">Log Pose · {pose.status === 'UNLOCKED' ? 'Desbloqueado' : 'Bloqueado'}</p><h2>{pose.grandLineUnlocked ? 'Grand Line abierto' : 'Rumbo a Reverse Mountain'}</h2><p>{pose.message}</p></div><button className="secondary" onClick={resource.retry}>Actualizar estado</button></section>
        {summary.wanted.total === 0 ? <EmptyState title="La bitácora está vacía" text="Este workspace todavía no tiene carteles de recompensa." /> : <>
          <section className="stats-grid" aria-label="Indicadores"><div><span>Carteles registrados</span><strong>{number(summary.wanted.total)}</strong></div><div><span>Recompensa total</span><strong>{number(summary.wanted.totalBounty)}</strong><small>berries</small></div><div><span>Recompensa promedio</span><strong>{number(summary.wanted.averageBounty)}</strong><small>berries</small></div><div><span>Tripulaciones</span><strong>{number(summary.crews.total)}</strong></div></section>
          <div className="breakdown-grid"><section className="panel"><h2>Estado de los carteles</h2><dl>{Object.entries(statuses).map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{number(summary.wanted.byStatus[key as keyof typeof statuses])}</dd></div>)}</dl></section><section className="panel"><h2>Frutas del diablo</h2><dl>{Object.entries(fruits).map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{number(summary.wanted.byFruit[key as keyof typeof fruits])}</dd></div>)}</dl></section><section className="panel"><h2>Tripulación más buscada</h2><p>{summary.crews.mostWanted?.name ?? 'Sin tripulación'}</p>{summary.crews.mostWanted && <p className="bounty">{number(summary.crews.mostWanted.totalBounty)} <small>berries</small></p>}</section></div>
          <div className="section-heading"><h2>Las mayores recompensas</h2><Link to="/wanted">Ver todos →</Link></div><div className="wanted-grid">{summary.topBounties.map(wanted => <WantedCard key={wanted.id} wanted={wanted} />)}</div>
        </>}<p className="muted timestamp">Workspace {summary.team.code} · Actualizado {new Date(summary.generatedAt).toLocaleString('es-PE')}</p></>
    })()}</>
}
