export function Loading({ text = 'Consultando la bitácora…' }: { text?: string }) {
  return <div className="feedback" role="status"><span className="spinner" aria-hidden="true" /><p>{text}</p></div>
}
export function ErrorState({ error, retry }: { error: Error; retry: () => void }) {
  return <div className="feedback" role="alert"><h2>No pudimos completar la consulta</h2><p>{error.message}</p><button onClick={retry}>Reintentar</button></div>
}
export function EmptyState({ title, text }: { title: string; text: string }) {
  return <div className="feedback" role="status"><h2>{title}</h2><p>{text}</p></div>
}
