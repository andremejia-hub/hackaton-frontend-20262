import { ApiError } from '../lib/api'
import { ErrorState } from './Feedback'

export function GrandLineFeedback({ error, retry }: { error: Error; retry: () => void }) {
  if (error instanceof ApiError && error.status === 423 && error.code === 'LOG_POSE_REQUIRED') {
    return (
      <section className="grand-line-locked" role="alert">
        <p className="eyebrow">Grand Line bloqueado</p>
        <h2>El Log Pose aún no está habilitado</h2>
        <p>{error.message}</p>
        <p>Completa la inspección del CP3 en Reverse Mountain para acceder a estas rutas.</p>
        <button className="secondary" onClick={retry}>Reintentar</button>
      </section>
    )
  }
  return <ErrorState error={error} retry={retry} />
}
