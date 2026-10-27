import { useCallback, useState } from 'react'
import { Link, useLocation, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { ApiError, request } from '../lib/api'
import { EmptyState, Loading } from '../components/Feedback'
import { GrandLineFeedback } from '../components/GrandLineFeedback'
import { date } from '../lib/format'
import { useResource } from '../lib/useResource'
import type { NewsDetail as NewsDetailData, NewsOutletContext, NewsStatusUpdate } from '../lib/types'

export function NewsDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { updateNews } = useOutletContext<NewsOutletContext>()
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState<Error | null>(null)
  const [confirmation, setConfirmation] = useState('')
  const [retryStatus, setRetryStatus] = useState<NewsStatusUpdate | null>(null)
  const [updatedNews, setUpdatedNews] = useState<NewsDetailData | null>(null)
  const load = useCallback((signal: AbortSignal) => request<NewsDetailData>(`/news/${encodeURIComponent(id)}`, { signal }), [id])
  const resource = useResource(id, load)
  const news = updatedNews ?? resource.data

  const verify = async (status: NewsStatusUpdate) => {
    if (!news || news.status !== 'RUMOR' || submitting) return
    setSubmitting(true)
    setRetryStatus(status)
    setActionError(null)
    setConfirmation('')
    try {
      const updated = await request<NewsDetailData>(`/news/${encodeURIComponent(id)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      setUpdatedNews(updated)
      updateNews(updated)
      setConfirmation(status === 'CONFIRMED' ? 'La noticia fue confirmada.' : 'La noticia fue desmentida.')
      setRetryStatus(null)
    } catch (error) {
      setActionError(error instanceof Error ? error : new Error('No se pudo verificar la noticia.'))
    } finally {
      setSubmitting(false)
    }
  }
  const returnToFeed = () => navigate(`/news${location.search}`, { replace: false })

  return <div className="news-detail-backdrop">
    <section className="news-detail-dialog panel" role="dialog" aria-modal="true" aria-labelledby="news-detail-title">
      <button className="secondary news-detail-close" onClick={returnToFeed}>← Volver a noticias</button>
      {resource.loading ? <Loading text="Abriendo la noticia…" />
        : resource.error ? resource.error instanceof ApiError && resource.error.status === 404
          ? <EmptyState title="Noticia no encontrada" text="No existe en el workspace de esta tripulación." />
          : <GrandLineFeedback error={resource.error} retry={resource.retry} />
          : news && <>
            <div className="page-heading news-detail-heading"><div>
              <p className="eyebrow">{news.type.replaceAll('_', ' ')} · {news.island}</p>
              <h1 id="news-detail-title">{news.title}</h1>
              <p className="muted">{news.summary}</p>
            </div><span className={`priority priority-${news.priority.toLowerCase()}`}>{news.priority}</span></div>
            <div className="news-detail-meta"><span>Fuente: {news.source}</span><time dateTime={news.publishedAt}>{date(news.publishedAt)}</time><strong>Estado: {news.status}</strong></div>
            <div className="news-body">{news.body.map((paragraph, index) => <p key={`${index}-${paragraph}`}>{paragraph}</p>)}</div>
            {news.relatedWanted && <p>Cartel relacionado: <Link to={`/wanted/${encodeURIComponent(news.relatedWanted.id)}`}>{news.relatedWanted.name}</Link></p>}
            {news.status === 'RUMOR' && <section className="verification-panel" aria-label="Verificar rumor">
              <h2>Verificar rumor</h2>
              <p>Confirma la noticia o desmiéntela con la información disponible.</p>
              <div className="verification-actions">
                <button disabled={submitting} onClick={() => void verify('CONFIRMED')}>{submitting ? 'Verificando…' : 'Confirmar'}</button>
                <button className="secondary" disabled={submitting} onClick={() => void verify('DEBUNKED')}>{submitting ? 'Verificando…' : 'Desmentir'}</button>
              </div>
              {actionError && <div className="inline-error" role="alert">{actionError instanceof ApiError && actionError.status === 423 ? 'Grand Line bloqueado: ' : ''}{actionError.message}{retryStatus && <button className="secondary" disabled={submitting} onClick={() => void verify(retryStatus)}>Reintentar verificación</button>}</div>}
            </section>}
            {news.status !== 'RUMOR' && <p className="news-verified" role="status">Esta noticia ya fue {news.status === 'CONFIRMED' ? 'confirmada' : 'desmentida'}.</p>}
            {confirmation && <p className="success-message" role="status">{confirmation}</p>}
          </>}
    </section>
    <button className="news-detail-dismiss" aria-label="Cerrar detalle y volver al feed" onClick={returnToFeed} />
  </div>
}
