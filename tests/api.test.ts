import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, configureSession, request } from '../src/lib/api'

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); configureSession(null) })
describe('Cliente HTTP y sesión', () => {
  it('lee la URL del entorno y envía el bearer en rutas privadas', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://contract.test/api/v1/')
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ total: 3 })))
    vi.stubGlobal('fetch', fetch)
    configureSession('test-token')
    expect(await request('/dashboard/summary')).toEqual({ total: 3 })
    expect(fetch.mock.calls[0][0]).toBe('https://contract.test/api/v1/dashboard/summary')
    expect((fetch.mock.calls[0][1].headers as Headers).get('Authorization')).toBe('Bearer test-token')
  })
  it('no envía bearer ni invalida la sesión por credenciales incorrectas en login', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://contract.test')
    const logout = vi.fn()
    configureSession('test-token', logout)
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 'INVALID_CREDENTIALS', message: 'Credenciales incorrectas' }), { status: 401 }))
    vi.stubGlobal('fetch', fetch)
    await expect(request('/auth/login', { method: 'POST', body: '{}' }, false)).rejects.toBeInstanceOf(ApiError)
    expect((fetch.mock.calls[0][1].headers as Headers).has('Authorization')).toBe(false)
    expect(logout).not.toHaveBeenCalled()
  })
  it('invalida sesión por 401 en un endpoint protegido', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://contract.test')
    const logout = vi.fn()
    configureSession('test-token', logout)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"code":"TOKEN_EXPIRED","message":"Sesión vencida"}', { status: 401 })))
    await expect(request('/wanted')).rejects.toMatchObject({ status: 401, code: 'TOKEN_EXPIRED' })
    expect(logout).toHaveBeenCalledOnce()
  })
  it('una respuesta 401 anterior no cierra una sesión nueva', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://contract.test')
    let resolve!: (value: Response) => void
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(done => { resolve = done })))
    configureSession('old')
    const pending = request('/wanted')
    const logout = vi.fn()
    configureSession('new', logout)
    resolve(new Response('{}', { status: 401 }))
    await expect(pending).rejects.toBeInstanceOf(ApiError)
    expect(logout).not.toHaveBeenCalled()
  })
  it('explica configuración ausente y errores de red', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    await expect(request('/wanted')).rejects.toThrow('VITE_API_BASE_URL')
    vi.stubEnv('VITE_API_BASE_URL', 'https://contract.test')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(request('/wanted')).rejects.toThrow('No se pudo conectar')
  })
})
