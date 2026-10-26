import { describe, expect, it } from 'vitest'
import { parseWantedQuery, serializeWantedQuery } from '../src/lib/wantedQuery'

describe('Contrato URL de CP2', () => {
  it('usa los defaults exactos de OpenAPI', () => {
    expect(parseWantedQuery(new URLSearchParams())).toEqual({ page: 0, size: 20, status: '', fruit: '', crewId: '', q: '', sort: 'bounty,desc' })
  })
  it.each(['-1', 'NaN', 'Infinity', '1.5', '9007199254740992'])('normaliza página inválida %s', page => {
    expect(parseWantedQuery(new URLSearchParams({ page })).page).toBe(0)
  })
  it('normaliza enums, tamaños y longitudes sin enviar parámetros inválidos', () => {
    const query = parseWantedQuery(new URLSearchParams({ size: '999', status: 'unknown', fruit: 'unknown', sort: 'unknown', q: 'x'.repeat(110), crewId: 'x'.repeat(210) }))
    expect(query).toMatchObject({ size: 20, status: '', fruit: '', sort: 'bounty,desc' })
    expect(query.q).toHaveLength(100)
    expect(query.crewId).toHaveLength(200)
  })
  it('preserva todos los controles al compartir y recargar', () => {
    const query = { page: 4, size: 50, status: 'MISSING', fruit: 'NONE', crewId: 'opaque-id', q: 'Garra & Sal', sort: 'name,asc' }
    expect(parseWantedQuery(serializeWantedQuery(query))).toEqual(query)
  })
  it('ignora parámetros desconocidos y recorta espacios de búsqueda', () => {
    const params = serializeWantedQuery(parseWantedQuery(new URLSearchParams('q=%20ramon%20&other=1')))
    expect(params.get('q')).toBe('ramon')
    expect(params.has('other')).toBe(false)
  })
})
