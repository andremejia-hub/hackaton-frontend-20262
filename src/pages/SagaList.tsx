import { useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GrandLineFeedback } from '../components/GrandLineFeedback'
import { EmptyState, Loading } from '../components/Feedback'
import { request } from '../lib/api'
import { number } from '../lib/format'
import type { SagaSummary } from '../lib/types'
import { useResource } from '../lib/useResource'
import { runViewTransition } from '../lib/viewTransition'

export function SagaList() {
  const navigate = useNavigate()
  const load = useCallback((signal: AbortSignal) => request<SagaSummary[]>('/sagas', { signal }), [])
  const resource = useResource('sagas', load)
  return <>
    <div className="page-heading"><div><p className="eyebrow">Poneglyph · Grand Line</p><h1>La Gran Saga</h1><p className="muted">Cada travesía revela una nueva parte de la historia.</p></div><span className="badge">Crónicas de la Guild</span></div>
    {resource.loading ? <Loading text="Buscando las sagas disponibles…" />
      : resource.error ? <GrandLineFeedback error={resource.error} retry={resource.retry} />
        : resource.data?.length ? <section className="saga-list" aria-label="Sagas disponibles">
          {resource.data.map(saga => <article className="saga-card panel" key={saga.id} style={{ borderColor: saga.palette.primary }}>
            <div className="saga-card-copy"><p className="eyebrow">Saga {saga.order} · {saga.stageCount} etapas</p><h2>{saga.title}</h2><p className="saga-subtitle">{saga.subtitle}</p><p>{saga.synopsis}</p>
              <dl className="saga-summary-meta"><div><dt>Recorrido</dt><dd>{number(saga.totalDistanceNm)} mn</dd></div><div><dt>Ruta</dt><dd>{saga.firstIsland} → {saga.lastIsland}</dd></div></dl>
              <Link className="button" to={`/sagas/${encodeURIComponent(saga.id)}`} onClick={event => {
                if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
                event.preventDefault()
                runViewTransition(() => navigate(`/sagas/${encodeURIComponent(saga.id)}`))
              }}>Leer la historia</Link>
            </div>
            <div className="saga-card-art" aria-hidden="true" style={{ backgroundColor: saga.palette.background, color: saga.palette.text, borderColor: saga.palette.accent }}>
              <span style={{ color: saga.palette.primary }}>⌖</span><strong>{String(saga.order).padStart(2, '0')}</strong><small>{saga.lastIsland}</small>
            </div>
          </article>)}
        </section> : <EmptyState title="Aún no hay sagas disponibles" text="Regresa cuando la Guild publique una nueva travesía." />}
  </>
}
