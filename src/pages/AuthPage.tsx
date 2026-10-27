import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { ApiError, request } from '../lib/api'
import type { LoginResponse } from '../lib/types'
import { FormField } from '../components/FormField'

export function AuthPage({ register = false }: { register?: boolean }) {
  const { session, authenticate } = useAuth()
  const location = useLocation()
  const state = location.state as { from?: string } | null
  const from = state?.from?.startsWith('/') && !state.from.startsWith('//') ? state.from : '/'
  const [pending, setPending] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')
  const pendingLogin = useRef<AbortController | null>(null)
  useEffect(() => {
    if (register) return
    const login = pendingLogin
    return () => { login.current?.abort() }
  }, [register])
  if (session) return <Navigate to={from} replace />
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') ?? '').trim()
    const password = String(form.get('password') ?? '')
    const teamName = String(form.get('teamName') ?? '').trim()
    const fields: Record<string, string> = {}
    if (register && (teamName.length < 3 || teamName.length > 40)) fields.teamName = 'Usa entre 3 y 40 caracteres.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) fields.email = 'Ingresa un email válido (máximo 120 caracteres).'
    if (password.length < (register ? 8 : 1) || password.length > (register ? 72 : 120)) fields.password = register ? 'Usa entre 8 y 72 caracteres.' : 'Ingresa tu contraseña (máximo 120 caracteres).'
    setErrors(fields); setMessage('')
    if (Object.keys(fields).length) return
    setPending(true)
    // Only login is cancellable here; the teammate-owned registration path stays unchanged.
    const loginController = register ? null : new AbortController()
    if (loginController) pendingLogin.current = loginController
    try {
      if (!register && loginController) {
        const response = await request<LoginResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }), signal: loginController.signal }, false)
        if (!loginController.signal.aborted) authenticate(response)
        return
      }
      authenticate(await request<LoginResponse>(register ? '/auth/register' : '/auth/login', { method: 'POST', body: JSON.stringify(register ? { teamName, email, password } : { email, password }) }, false))
    } catch (error) {
      if (loginController?.signal.aborted) return
      if (error instanceof ApiError) {
        const next = Object.fromEntries(error.details.map(detail => [detail.field, detail.message]))
        if (error.code === 'EMAIL_ALREADY_REGISTERED') next.email = error.message
        if (error.code === 'TEAM_NAME_TAKEN') next.teamName = error.message
        setErrors(next)
      }
      setMessage(error instanceof Error ? error.message : 'No se pudo iniciar sesión.')
    } finally { if (!loginController?.signal.aborted) setPending(false) }
  }
  return <main className="auth-shell"><section className="auth-intro"><span className="eyebrow">East Blue · Log Pose Console</span><div className="compass" aria-hidden="true">⌖</div><h1>Tu próximo rumbo<br />empieza aquí.</h1><p>La bitácora de la Guild de Cazarrecompensas. Consulta recompensas y sigue el rastro de las tripulaciones del Grand Line.</p></section>
    <section className="auth-panel"><span className="eyebrow">{register ? 'Nueva tripulación' : 'Bienvenido a bordo'}</span><h2>{register ? 'Registrar tripulación' : 'Iniciar sesión'}</h2><p className="muted">Una cuenta compartida por los integrantes de tu equipo.</p>
      <form onSubmit={submit} noValidate aria-busy={pending}>
        {register && <FormField name="teamName" label="Nombre de la tripulación" autoComplete="organization" required minLength={3} maxLength={40} error={errors.teamName} />}
        <FormField name="email" label="Email" type="email" autoComplete="username" required maxLength={120} error={errors.email} />
        <FormField name="password" label="Contraseña" type="password" autoComplete={register ? 'new-password' : 'current-password'} required minLength={register ? 8 : 1} maxLength={register ? 72 : 120} error={errors.password} />
        {message && <p role="alert" className="field-error">{message}</p>}
        <button disabled={pending} type="submit">{pending ? 'Conectando…' : register ? 'Crear cuenta y zarpar' : 'Entrar a la consola'}</button>
      </form>
      <p className="auth-switch">{register ? '¿Ya tienen una cuenta?' : '¿Primera vez en la Guild?'} <Link to={register ? '/login' : '/register'} state={{ from }}>{register ? 'Iniciar sesión' : 'Registrar tripulación'}</Link></p>
    </section></main>
}
