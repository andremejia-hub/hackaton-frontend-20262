import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { configureSession, request } from '../lib/api'
import type { LoginResponse, Session } from '../lib/types'
import { AuthContext } from './AuthContext'

const storageKey = 'logpose.token'
function readToken() { try { return localStorage.getItem(storageKey) } catch { return null } }
function saveToken(token: string | null) {
  try { if (token) localStorage.setItem(storageKey, token); else localStorage.removeItem(storageKey) } catch { /* Session still works in memory when storage is unavailable. */ }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [restoring, setRestoring] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const generation = useRef(0)
  const logout = useCallback(() => {
    generation.current++
    saveToken(null); configureSession(null)
    setSession(null); setRestoring(false); setError(null)
  }, [])
  const restore = useCallback(() => {
    const token = readToken()
    const version = ++generation.current
    setError(null)
    if (!token) { configureSession(null); setSession(null); setRestoring(false); return }
    setRestoring(true)
    configureSession(token, logout)
    request<Session>('/auth/me').then(data => {
      if (generation.current === version) { setSession(data); setRestoring(false) }
    }).catch(cause => {
      if (generation.current === version) { setError(cause instanceof Error ? cause : new Error('No se pudo restaurar la sesión')); setRestoring(false) }
    })
  }, [logout])
  useEffect(() => {
    let active = true
    const counter = generation
    queueMicrotask(() => { if (active) restore() })
    const synchronize = (event: StorageEvent) => { if (event.key === storageKey || event.key === null) restore() }
    window.addEventListener('storage', synchronize)
    return () => { active = false; counter.current++; window.removeEventListener('storage', synchronize) }
  }, [restore])
  const authenticate = useCallback((response: LoginResponse) => {
    generation.current++
    saveToken(response.token); configureSession(response.token, logout)
    setSession({ user: response.user, team: response.team, expiresAt: response.expiresAt })
    setError(null); setRestoring(false)
  }, [logout])
  useEffect(() => {
    if (!session) return
    const check = () => { if (Date.parse(session.expiresAt) <= Date.now()) logout() }
    check()
    const timer = window.setInterval(check, 1000)
    window.addEventListener('focus', check)
    return () => { clearInterval(timer); window.removeEventListener('focus', check) }
  }, [session, logout])
  return <AuthContext.Provider value={{ session, restoring, error, authenticate, logout, restore }}>{children}</AuthContext.Provider>
}
