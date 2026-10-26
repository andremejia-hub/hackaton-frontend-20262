export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details: { field: string; message: string }[] = []) { super(message) }
}

let currentToken: string | null = null
let unauthorized: (() => void) | undefined
export function configureSession(token: string | null, onUnauthorized?: () => void) {
  currentToken = token
  unauthorized = onUnauthorized
}

export async function request<T>(path: string, options: RequestInit = {}, authenticated = true): Promise<T> {
  const base = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '')
  if (!base) throw new Error('Falta configurar VITE_API_BASE_URL. Consulta el README y reinicia Vite.')
  const sentToken = currentToken
  const headers = new Headers(options.headers)
  if (options.body) headers.set('Content-Type', 'application/json')
  if (authenticated && sentToken) headers.set('Authorization', `Bearer ${sentToken}`)
  let response: Response
  try { response = await fetch(`${base}${path}`, { ...options, headers }) }
  catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new Error('No se pudo conectar con la API. Revisa tu conexión y reintenta.')
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { code?: string; message?: string; details?: { field: string; message: string }[] }
    // An old request must never log out a newly authenticated session.
    if (response.status === 401 && authenticated && sentToken === currentToken) unauthorized?.()
    throw new ApiError(response.status, body.code ?? 'HTTP_ERROR', body.message ?? `Error del servidor (${response.status}).`, body.details)
  }
  return response.json() as Promise<T>
}
