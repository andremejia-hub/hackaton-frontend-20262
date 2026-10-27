import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Outlet, useSearchParams } from 'react-router-dom'
import { request } from '../lib/api'
import { EmptyState, Loading } from '../components/Feedback'
import { GrandLineFeedback } from '../components/GrandLineFeedback'
import { date } from '../lib/format'
import type { NewsFeed as NewsFeedPage, NewsItem, NewsOutletContext, NewsPriority, NewsStatus, NewsType } from '../lib/types'

const newsTypes: Record<NewsType, string> = {
  BOUNTY_UPDATE: 'Actualización de recompensas',
  BATTLE: 'Batalla',
  MARINE_OPERATION: 'Operación de la Marina',
  WORLD_GOVERNMENT: 'Gobierno Mundial',
  DISCOVERY: 'Descubrimiento',
}
const newsPriorities: Record<NewsPriority, string> = {
  LOW: 'Baja', MEDIUM: 'Media', HIGH: 'Alta', CRITICAL: 'Crítica',
}
const newsStatuses: Record<NewsStatus, string> = {
  RUMOR: 'Rumor', CONFIRMED: 'Confirmada', DEBUNKED: 'Desmentida',
}
const validTypes = Object.keys(newsTypes) as NewsType[]
const validPriorities = Object.keys(newsPriorities) as NewsPriority[]
const validStatuses = Object.keys(newsStatuses) as NewsStatus[]
const limit = 20

interface FeedState {
  key: string
  items: NewsItem[]
  nextCursor: string | null
  hasMore: boolean
  loading: boolean
  loadingMore: boolean
  error?: Error
  firstPageError: boolean
}
function isValue<T extends string>(value: string | null, valid: readonly T[]): value is T {
  return value !== null && valid.includes(value as T)
}

export function NewsFeed() {
  const [params, setParams] = useSearchParams()
  const type = isValue(params.get('type'), validTypes) ? params.get('type') as NewsType : ''
  const priority = isValue(params.get('priority'), validPriorities) ? params.get('priority') as NewsPriority : ''
  const status = isValue(params.get('status'), validStatuses) ? params.get('status') as NewsStatus : ''
  const query = useMemo(() => {
    const next = new URLSearchParams()
    if (type) next.set('type', type)
    if (priority) next.set('priority', priority)
    if (status) next.set('status', status)
    return next
  }, [type, priority, status])
  const filterKey = query.toString()
  const [feed, setFeed] = useState<FeedState>({
    key: filterKey, items: [], nextCursor: null, hasMore: true, loading: true, loadingMore: false, firstPageError: false,
  })
  const [attempt, setAttempt] = useState(0)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const cursorInFlight = useRef<string | null>(null)
  const lastLoadedCursor = useRef<string | null>(null)
  const generation = useRef(0)
  const activeController = useRef<AbortController | null>(null)

  // Adjust state when the URL filters change, before committing the new view.
  if (feed.key !== filterKey) {
    setFeed({ key: filterKey, items: [], nextCursor: null, hasMore: true, loading: true, loadingMore: false, firstPageError: false })
  }

  useEffect(() => {
    const generationRef = generation
    const currentGeneration = ++generation.current
    const controller = new AbortController()
    activeController.current = controller
    let active = true
    cursorInFlight.current = null
    lastLoadedCursor.current = null
    const search = new URLSearchParams(query)
    search.set('limit', String(limit))
    request<NewsFeedPage>(`/news/feed?${search.toString()}`, { signal: controller.signal }).then(
      page => {
        if (!active || generation.current !== currentGeneration) return
        const unique = new Map(page.items.map(item => [item.id, item]))
        setFeed({ key: filterKey, items: [...unique.values()], nextCursor: page.nextCursor, hasMore: page.hasMore, loading: false, loadingMore: false, firstPageError: false })
      },
      error => {
        if (!active || generation.current !== currentGeneration || controller.signal.aborted) return
        setFeed({ key: filterKey, items: [], nextCursor: null, hasMore: false, loading: false, loadingMore: false, error: error instanceof Error ? error : new Error('Error inesperado'), firstPageError: true })
      },
    )
    return () => {
      active = false
      controller.abort()
      activeController.current?.abort()
      activeController.current = null
      generationRef.current++
    }
  }, [filterKey, query, attempt])

  const loadMore = useCallback(() => {
    if (feed.key !== filterKey || !feed.hasMore || feed.loading || feed.loadingMore || (feed.error && feed.firstPageError) || !feed.nextCursor) return
    const cursor = feed.nextCursor
    if (cursorInFlight.current === cursor || lastLoadedCursor.current === cursor) return
    cursorInFlight.current = cursor
    const currentGeneration = generation.current
    const controller = new AbortController()
    activeController.current = controller
    setFeed(previous => ({ ...previous, loadingMore: true, error: undefined }))
    const search = new URLSearchParams(query)
    search.set('limit', String(limit))
    search.set('cursor', cursor)
    request<NewsFeedPage>(`/news/feed?${search.toString()}`, { signal: controller.signal }).then(
      page => {
        if (controller.signal.aborted || generation.current !== currentGeneration) return
        lastLoadedCursor.current = cursor
        setFeed(previous => {
          if (previous.key !== filterKey) return previous
          const unique = new Map(previous.items.map(item => [item.id, item]))
          page.items.forEach(item => unique.set(item.id, item))
          return { ...previous, items: [...unique.values()], nextCursor: page.nextCursor, hasMore: page.hasMore, loadingMore: false, error: undefined }
        })
      },
      error => {
        if (controller.signal.aborted || generation.current !== currentGeneration) return
        setFeed(previous => previous.key !== filterKey ? previous : {
          ...previous, loadingMore: false, error: error instanceof Error ? error : new Error('Error inesperado'), firstPageError: false,
        })
      },
    ).finally(() => {
      if (generation.current !== currentGeneration) return
      cursorInFlight.current = null
      if (activeController.current === controller) activeController.current = null
    })
  }, [feed, filterKey, query])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || feed.loading || feed.loadingMore || feed.error || !feed.hasMore || !feed.nextCursor || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) loadMore()
    }, { rootMargin: '300px' })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [feed.loading, feed.loadingMore, feed.error, feed.hasMore, feed.nextCursor, loadMore])

  const retry = () => {
    activeController.current?.abort()
    generation.current++
    setFeed({ key: filterKey, items: [], nextCursor: null, hasMore: true, loading: true, loadingMore: false, firstPageError: false })
    setAttempt(previous => previous + 1)
  }
  const changeFilter = (name: string, value: string) => {
    setParams(previous => {
      const next = new URLSearchParams(previous)
      if (value) next.set(name, value)
      else next.delete(name)
      next.delete('cursor')
      return next
    })
  }
  const updateNews = useCallback((updated: NewsItem) => {
    setFeed(previous => ({
      ...previous,
      items: previous.items.flatMap(item => item.id !== updated.id ? [item]
        : (type && updated.type !== type) || (priority && updated.priority !== priority) || (status && updated.status !== status) ? [] : [updated]),
    }))
  }, [type, priority, status])

  return <>
    <div className="page-heading"><div><p className="eyebrow">Grand Line · Noticias</p><h1>Noticias del mundo</h1><p className="muted">Sigue los últimos acontecimientos de la travesía.</p></div></div>
    <section className="panel filter-grid news-filter-grid" aria-label="Filtros de noticias">
      <label>Tipo<select value={type} onChange={event => changeFilter('type', event.target.value)}><option value="">Todos los tipos</option>{validTypes.map(value => <option key={value} value={value}>{newsTypes[value]}</option>)}</select></label>
      <label>Prioridad<select value={priority} onChange={event => changeFilter('priority', event.target.value)}><option value="">Todas las prioridades</option>{validPriorities.map(value => <option key={value} value={value}>{newsPriorities[value]}</option>)}</select></label>
      <label>Estado<select value={status} onChange={event => changeFilter('status', event.target.value)}><option value="">Todos los estados</option>{validStatuses.map(value => <option key={value} value={value}>{newsStatuses[value]}</option>)}</select></label>
    </section>
    <section className="news-feed" aria-label="Noticias" aria-busy={feed.loading || feed.loadingMore}>
      {feed.loading ? <Loading text="Buscando noticias…" />
        : feed.error && feed.firstPageError ? <GrandLineFeedback error={feed.error} retry={retry} />
          : <>
            {feed.items.length ? <div className="news-grid">{feed.items.map(item => <article className="news-card panel" key={item.id}>
              <div className="news-card-meta"><span>{newsStatuses[item.status]}</span><span className={`priority priority-${item.priority.toLowerCase()}`}>{newsPriorities[item.priority]}</span></div>
              <p className="eyebrow">{newsTypes[item.type]} · {item.island}</p>
              <h2><Link to={{ pathname: `/news/${encodeURIComponent(item.id)}`, search: params.toString() }}>{item.title}</Link></h2>
              <p>{item.summary}</p>
              {item.relatedWanted && <p className="related-news">Cartel relacionado: <Link to={`/wanted/${encodeURIComponent(item.relatedWanted.id)}`}>{item.relatedWanted.name}</Link></p>}
              <div className="news-card-footer"><span>{item.source}</span><time dateTime={item.publishedAt}>{date(item.publishedAt)}</time></div>
            </article>)}</div> : <EmptyState title="No hay noticias" text="No se encontraron noticias con estos filtros." />}
            {feed.loadingMore && <Loading text="Cargando más noticias…" />}
            {feed.error && <GrandLineFeedback error={feed.error} retry={loadMore} />}
            {feed.hasMore && feed.nextCursor && !feed.error && <button className="secondary" onClick={loadMore} disabled={feed.loadingMore}>Cargar más noticias</button>}
            {!feed.hasMore && feed.items.length > 0 && <p className="news-end">Has llegado al final de las noticias.</p>}
          </>}
      <div className="news-sentinel" ref={sentinelRef} aria-hidden="true" />
    </section>
    <Outlet context={{ updateNews } satisfies NewsOutletContext} />
  </>
}
