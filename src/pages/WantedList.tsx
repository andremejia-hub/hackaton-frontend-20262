import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { request } from '../lib/api'
import type { Crew, WantedPage } from '../lib/types'
import { useResource } from '../lib/useResource'
import { fruits, parseWantedQuery, serializeWantedQuery, sorts, statuses, type WantedQuery } from '../lib/wantedQuery'
import { EmptyState, ErrorState, Loading } from '../components/Feedback'
import { WantedCard } from '../components/WantedCard'
import { number } from '../lib/format'

// Reset draft edits when history/filter state changes, while retaining input focus.
function SearchInput({ value, resetKey, commit }: { value: string; resetKey: string; commit: (q: string) => void }) {
  const [input, setInput] = useState({ key: resetKey, draft: value })
  if (input.key !== resetKey) setInput({ key: resetKey, draft: value })
  const draft = input.key === resetKey ? input.draft : value
  useEffect(() => {
    if (draft.trim() === value) return
    const timer = window.setTimeout(() => commit(draft.trim()), 400)
    return () => window.clearTimeout(timer)
  }, [draft, value, commit])
  return <label className="search-label">Buscar por nombre o epíteto<input type="search" placeholder="Sigue el rastro de un pirata…" value={draft} maxLength={100} onChange={event => setInput({ key: resetKey, draft: event.target.value })} /></label>
}

export function WantedList() {
  const [params, setParams] = useSearchParams()
  const query = parseWantedQuery(params)
  const canonical = serializeWantedQuery(query).toString()
  const raw = params.toString()
  useEffect(() => { if (raw !== canonical) setParams(canonical, { replace: true }) }, [raw, canonical, setParams])
  const update = useCallback((patch: Partial<WantedQuery>) => {
    setParams(current => serializeWantedQuery({ ...parseWantedQuery(current), ...patch, page: patch.page ?? 0 }))
  }, [setParams])
  const search = useCallback((q: string) => update({ q }), [update])
  const loadCrews = useCallback((signal: AbortSignal) => request<Crew[]>('/crews', { signal }), [])
  const crews = useResource('crews', loadCrews)
  const load = useCallback((signal: AbortSignal) => request<WantedPage>(`/wanted?${canonical}`, { signal }), [canonical])
  const resource = useResource(canonical, load)
  const resultsRef = useRef<HTMLDivElement>(null)
  // Capture before React removes the tall list DOM and the browser clamps scrollY.
  useLayoutEffect(() => () => {
    try { sessionStorage.setItem(`wanted.window:${canonical}`, String(window.scrollY)) } catch { /* Storage may be disabled. */ }
  }, [canonical])
  useLayoutEffect(() => {
    if (!resource.data || !resultsRef.current) return
    try {
      resultsRef.current.scrollTop = Number(sessionStorage.getItem(`wanted.scroll:${canonical}`) ?? 0)
      window.scrollTo(0, Number(sessionStorage.getItem(`wanted.window:${canonical}`) ?? 0))
    } catch { /* Storage may be disabled. */ }
  }, [canonical, resource.data])
  const data = resource.data
  const outOfRange = !!data && query.page > 0 && query.page >= data.totalPages
  useEffect(() => {
    if (outOfRange && data) setParams(serializeWantedQuery({ ...parseWantedQuery(new URLSearchParams(canonical)), page: Math.max(0, data.totalPages - 1) }), { replace: true })
  }, [outOfRange, data, canonical, setParams])
  return <>
    <div className="page-heading"><div><p className="eyebrow">Archivo de recompensas · East Blue</p><h1>Carteles de «Se Busca»</h1><p className="muted">Cada nombre tiene una historia. Cada rastro, una recompensa.</p></div><span className="badge">Registro de la Guild</span></div>
    <section className="filters panel" aria-label="Filtros de carteles">
      <SearchInput resetKey={canonical} value={query.q} commit={search} />
      <div className="filter-grid">
        <label>Estado<select value={query.status} onChange={event => update({ status: event.target.value })}><option value="">Todos los estados</option>{Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Tripulación<select value={query.crewId} onChange={event => update({ crewId: event.target.value })} disabled={crews.loading || !!crews.error}><option value="">Todas las tripulaciones</option>{query.crewId && !crews.data?.some(crew => crew.id === query.crewId) && <option value={query.crewId}>Tripulación no encontrada</option>}{crews.data?.map(crew => <option key={crew.id} value={crew.id}>{crew.name}</option>)}</select></label>
        <label>Fruta del diablo<select value={query.fruit} onChange={event => update({ fruit: event.target.value })}><option value="">Todos los tipos</option>{Object.entries(fruits).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Ordenar por<select value={query.sort} onChange={event => update({ sort: event.target.value })}>{Object.entries(sorts).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </div>
      <div className="filter-bottom"><button className="text-button" onClick={() => setParams(serializeWantedQuery(parseWantedQuery(new URLSearchParams())))}>Limpiar filtros</button><label className="size-label">Por página<select value={query.size} onChange={event => update({ size: Number(event.target.value) })}>{[10, 20, 50].map(size => <option key={size}>{size}</option>)}</select></label></div>
      {crews.loading && <p role="status">Cargando tripulaciones…</p>}
      {crews.error && <div role="alert" className="inline-error">No se cargaron las tripulaciones: {crews.error.message} <button className="secondary" onClick={crews.retry}>Reintentar tripulaciones</button></div>}
    </section>
    <section className="results" aria-label="Resultados de carteles" aria-busy={resource.loading || outOfRange}>
      <div className="results-heading" role="status">{data && !outOfRange ? `${number(data.totalElements)} carteles encontrados` : 'Consultando carteles…'}</div>
      <div className="results-body" ref={resultsRef} tabIndex={0} aria-label="Área de carteles" onScroll={event => { try { sessionStorage.setItem(`wanted.scroll:${canonical}`, String(event.currentTarget.scrollTop)) } catch { /* Storage may be disabled. */ } }}>
        {resource.loading || outOfRange ? <Loading text="Buscando los carteles de este rumbo…" /> : resource.error ? <ErrorState error={resource.error} retry={resource.retry} /> : data?.content.length ? <div className="wanted-grid">{data.content.map(wanted => <WantedCard key={wanted.id} wanted={wanted} search={`?${canonical}`} />)}</div> : <EmptyState title="No hay carteles en este rumbo" text="Prueba otro nombre o combina otros filtros." />}
      </div>
      <nav className="pagination" aria-label="Paginación de carteles"><button className="secondary" disabled={query.page === 0} onClick={() => update({ page: query.page - 1 })}>← Anterior</button><span>Página {query.page + 1}{data && !outOfRange ? ` de ${Math.max(1, data.totalPages)}` : ''}</span><button className="secondary" disabled={!data || resource.loading || outOfRange || query.page + 1 >= data.totalPages} onClick={() => update({ page: query.page + 1 })}>Siguiente →</button></nav>
    </section>
  </>
}
