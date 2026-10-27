import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { EmptyState, Loading } from '../components/Feedback'
import { GrandLineFeedback } from '../components/GrandLineFeedback'
import { request } from '../lib/api'
import { number } from '../lib/format'
import type { SagaStage, SagaStory } from '../lib/types'
import { useResource } from '../lib/useResource'
import { runViewTransition } from '../lib/viewTransition'

interface SagaStyle extends CSSProperties {
  '--saga-background': string
  '--saga-surface': string
  '--saga-primary': string
  '--saga-accent': string
  '--saga-text': string
}

export function SagaStoryPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const requestedSlug = params.get('stage') ?? ''
  const [furthest, setFurthest] = useState({ sagaId: id, index: 0 })
  const stageElements = useRef(new Map<string, HTMLElement>())
  const storyRef = useRef<HTMLElement>(null)
  const load = useCallback((signal: AbortSignal) => request<SagaStory>(`/sagas/${encodeURIComponent(id)}/story`, { signal }), [id])
  const resource = useResource(id, load)
  const story = resource.data
  const activeStage = story?.stages.find(stage => stage.slug === requestedSlug) ?? story?.stages[0]
  const activeIndex = activeStage ? story?.stages.findIndex(stage => stage.id === activeStage.id) ?? 0 : -1
  const furthestIndex = furthest.sagaId === id ? furthest.index : 0
  const visitedStages = useMemo(() => story?.stages.slice(0, Math.max(activeIndex, furthestIndex) + 1) ?? [], [story, activeIndex, furthestIndex])
  const activeMetrics = activeStage?.metrics ?? []

  const selectStage = useCallback((stage: SagaStage, smooth = true) => {
    const stageIndex = story?.stages.findIndex(entry => entry.id === stage.id) ?? 0
    setFurthest(current => ({ sagaId: id, index: Math.max(current.sagaId === id ? current.index : 0, stageIndex) }))
    if (requestedSlug !== stage.slug) {
      setParams(current => {
        const next = new URLSearchParams(current)
        next.set('stage', stage.slug)
        return next
      }, { replace: true })
    }
    stageElements.current.get(stage.slug)?.scrollIntoView({
      behavior: smooth && !window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'auto',
      block: 'center',
    })
  }, [id, requestedSlug, setParams, story])

  useEffect(() => {
    if (!story?.stages.length) return
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
      if (!visible) return
      const slug = (visible.target as HTMLElement).dataset.stageSlug
      const stage = story.stages.find(entry => entry.slug === slug)
      if (!stage) return
      const stageIndex = story.stages.findIndex(entry => entry.id === stage.id)
      setFurthest(current => ({ sagaId: id, index: Math.max(current.sagaId === id ? current.index : 0, stageIndex) }))
      if (params.get('stage') !== stage.slug) {
        setParams(current => {
          const next = new URLSearchParams(current)
          next.set('stage', stage.slug)
          return next
        }, { replace: true })
      }
    }, { rootMargin: '-34% 0px -45% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] })
    for (const element of stageElements.current.values()) observer.observe(element)
    return () => observer.disconnect()
  }, [id, story, params, setParams])

  useEffect(() => {
    if (!requestedSlug) return
    stageElements.current.get(requestedSlug)?.scrollIntoView({ behavior: 'auto', block: 'center' })
  }, [story, requestedSlug])

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      const target = event.target
      if (target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON', 'A'].includes(target.tagName))) return
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowDown' && event.key !== 'ArrowLeft' && event.key !== 'ArrowUp') return
      if (!story?.stages.length) return
      event.preventDefault()
      const delta = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1
      const next = story.stages[Math.min(Math.max(activeIndex + delta, 0), story.stages.length - 1)]
      selectStage(next)
    }
    const container = storyRef.current
    container?.addEventListener('keydown', onKeyDown)
    return () => container?.removeEventListener('keydown', onKeyDown)
  }, [activeIndex, selectStage, story])

  const returnToSagas = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    runViewTransition(() => navigate('/sagas'))
  }

  if (resource.loading) return <Loading text="Descifrando el Poneglyph…" />
  if (resource.error) return <GrandLineFeedback error={resource.error} retry={resource.retry} />
  if (!story) return <EmptyState title="Historia no disponible" text="No se encontró la historia de esta saga." />
  if (!story.stages.length) return <EmptyState title="Esta saga no tiene etapas" text="La Guild todavía no ha publicado su recorrido narrativo." />

  const activePalette = activeStage?.palette ?? story.saga.palette
  const activePosition = activeStage?.island ?? story.stages[0].island
  const mapStyle: SagaStyle = {
    '--saga-background': activePalette.background,
    '--saga-surface': activePalette.surface,
    '--saga-primary': activePalette.primary,
    '--saga-accent': activePalette.accent,
    '--saga-text': activePalette.text,
  }
  const routePoints = story.stages.map(stage => `${stage.island.x},${stage.island.y}`).join(' ')
  const routeLength = story.stages.slice(1).reduce((distance, stage, index) => {
    const previous = story.stages[index].island
    return distance + Math.hypot(stage.island.x - previous.x, stage.island.y - previous.y)
  }, 0)
  const travelledLength = visitedStages.slice(1).reduce((distance, stage, index) => {
    const previous = visitedStages[index].island
    return distance + Math.hypot(stage.island.x - previous.x, stage.island.y - previous.y)
  }, 0)
  const progress = activeStage ? (activeStage.order / story.stages.length) * 100 : 0

  return <section className="saga-story" style={mapStyle} ref={storyRef} tabIndex={0} aria-label={`Historia de ${story.saga.title}. Usa las flechas para avanzar entre etapas.`}>
    <Link className="back-link saga-back-link" to="/sagas" onClick={returnToSagas}>← Todas las sagas</Link>
    <header className="saga-story-heading">
      <p className="eyebrow">Poneglyph · Saga {story.saga.order}</p>
      <h1>{story.saga.title}</h1>
      <p className="saga-story-subtitle">{story.saga.subtitle}</p>
      <p>{story.saga.intro}</p>
      <div className="saga-progress" aria-label={`Progreso: etapa ${activeStage?.order ?? 1} de ${story.stages.length}`}>
        <div><span>Progreso del recorrido</span><strong>Etapa {activeStage?.order ?? 1} / {story.stages.length}</strong></div>
        <div className="saga-progress-track"><span style={{ width: `${progress}%` }} /></div>
      </div>
    </header>
    <div className="saga-experience">
      <section className="saga-chapters" aria-label="Etapas de la historia">
        {story.stages.map((stage, index) => <article
          className={`saga-stage${activeStage?.id === stage.id ? ' is-active' : ''}`}
          key={stage.id}
          data-stage-slug={stage.slug}
          ref={node => { if (node) stageElements.current.set(stage.slug, node); else stageElements.current.delete(stage.slug) }}
          tabIndex={0}
          aria-current={activeStage?.id === stage.id ? 'step' : undefined}
          style={{ backgroundColor: stage.palette.surface, color: stage.palette.text, borderColor: stage.palette.primary }}
        >
          <p className="eyebrow" style={{ color: stage.palette.accent }}>Etapa {stage.order} · {stage.island.name}</p>
          <h2>{stage.title}</h2>
          {stage.narrative.map((paragraph, paragraphIndex) => <p key={`${paragraphIndex}-${paragraph}`}>{paragraph}</p>)}
          <button className="secondary saga-stage-button" onClick={() => selectStage(stage, false)} aria-label={`Mostrar etapa ${stage.order} en el mapa`}>Ver esta etapa en el mapa</button>
          {index < story.stages.length - 1 && <span className="saga-chapter-marker" aria-hidden="true">⌖</span>}
        </article>)}
      </section>
      <aside className="saga-map-panel" aria-label="Mapa y métricas de la saga">
        <div className="saga-map">
          <div className="saga-map-heading"><div><p className="eyebrow">Mapa del Grand Line</p><h2>{activePosition.name}</h2></div><span>Etapa {activeStage?.order ?? 1}</span></div>
          <svg viewBox={`0 0 ${story.map.width} ${story.map.height}`} role="img" aria-label={`Ruta recorrida hasta ${activePosition.name}`}>
            <defs><pattern id="map-grid" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M 50 0 L 0 0 0 50" fill="none" stroke="currentColor" strokeOpacity=".12" strokeWidth="2" /></pattern></defs>
            <rect width={story.map.width} height={story.map.height} fill="url(#map-grid)" />
            {story.stages.length > 1 && <polyline className="saga-route" points={routePoints} fill="none" stroke={activePalette.accent} strokeWidth={Math.max(story.map.width / 350, 4)} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${routeLength} ${routeLength}`} strokeDashoffset={routeLength - travelledLength} />}
            {story.stages.map(stage => <g key={stage.id} className={visitedStages.some(visited => visited.id === stage.id) ? 'is-visited' : ''}>
              <circle cx={stage.island.x} cy={stage.island.y} r={stage.id === activeStage?.id ? story.map.width / 42 : story.map.width / 65} fill={stage.palette.primary} stroke={stage.palette.text} strokeWidth={Math.max(story.map.width / 300, 3)} />
              <text x={stage.island.x} y={stage.island.y + story.map.width / 22} textAnchor="middle">{stage.island.name}</text>
            </g>)}
            <g className="saga-ship" transform={`translate(${activePosition.x} ${activePosition.y})`} aria-label="Barco de la tripulación">
              <path d={`M 0 ${-story.map.width / 24} L ${story.map.width / 35} 0 L 0 ${story.map.width / 45} L ${-story.map.width / 35} 0 Z`} fill={activePalette.accent} stroke={activePalette.text} strokeWidth={Math.max(story.map.width / 500, 2)} />
            </g>
          </svg>
          <p className="saga-map-caption">La ruta iluminada muestra las islas ya recorridas.</p>
        </div>
        <div className="saga-metrics" aria-live="polite">
          <p className="eyebrow">Bitácora de esta etapa</p>
          <h2>{activeStage?.title}</h2>
          <dl>{activeMetrics.map(metric => <div key={metric.key}><dt>{metric.label}</dt><dd>{number(metric.value)} {metric.unit}</dd></div>)}</dl>
        </div>
        <nav className="saga-stage-nav" aria-label="Navegar entre etapas">
          <button className="secondary" disabled={activeIndex <= 0} onClick={() => selectStage(story.stages[Math.max(activeIndex - 1, 0)])}>← Anterior</button>
          <button disabled={activeIndex >= story.stages.length - 1} onClick={() => selectStage(story.stages[Math.min(activeIndex + 1, story.stages.length - 1)])}>Siguiente →</button>
        </nav>
      </aside>
    </div>
  </section>
}
