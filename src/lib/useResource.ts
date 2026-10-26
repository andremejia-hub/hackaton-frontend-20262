import { useEffect, useState } from 'react'

type Resource<T> = { key: string; data?: T; error?: Error; loading: boolean }
// Abort plus an active flag covers servers/transports that ignore cancellation.
export function useResource<T>(key: string, load: (signal: AbortSignal) => Promise<T>) {
  const [state, setState] = useState<Resource<T>>({ key, loading: true })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    let active = true
    load(controller.signal).then(
      data => { if (active) setState({ key, data, loading: false }) },
      error => { if (active) setState({ key, error: error instanceof Error ? error : new Error('Error inesperado'), loading: false }) },
    )
    return () => { active = false; controller.abort() }
  }, [key, attempt, load])
  const visible = state.key === key ? state : { key, loading: true }
  return { ...visible, retry: () => { setState({ key, loading: true }); setAttempt(n => n + 1) } }
}
