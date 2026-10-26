import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useResource } from '../src/lib/useResource'

describe('Protección de rumbo y recuperación', () => {
  it('ignora respuestas antiguas incluso si el transporte ignora AbortSignal', async () => {
    let resolveOld!: (value: string) => void
    const old = new Promise<string>(resolve => { resolveOld = resolve })
    let oldSignal: AbortSignal | undefined
    const first = (signal: AbortSignal) => { oldSignal = signal; return old }
    const second = () => Promise.resolve('nuevo rumbo')
    const { result, rerender } = renderHook(({ key, load }) => useResource(key, load), { initialProps: { key: 'old', load: first } })
    rerender({ key: 'new', load: second })
    await waitFor(() => expect(result.current.data).toBe('nuevo rumbo'))
    expect(oldSignal?.aborted).toBe(true)
    await act(async () => { resolveOld('rumbo antiguo'); await old })
    expect(result.current.data).toBe('nuevo rumbo')
  })
  it('permite reintentar después de un error', async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error('Servidor ocupado')).mockResolvedValueOnce('recuperado')
    const { result } = renderHook(() => useResource('same', load))
    await waitFor(() => expect(result.current.error?.message).toBe('Servidor ocupado'))
    act(() => result.current.retry())
    await waitFor(() => expect(result.current.data).toBe('recuperado'))
    expect(load).toHaveBeenCalledTimes(2)
  })
})
