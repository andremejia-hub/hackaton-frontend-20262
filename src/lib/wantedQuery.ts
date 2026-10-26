export const statuses = { AT_LARGE: 'Prófugo', CAPTURED: 'Capturado', MISSING: 'Desaparecido' } as const
export const fruits = { PARAMECIA: 'Paramecia', ZOAN: 'Zoan', LOGIA: 'Logia', NONE: 'Sin fruta' } as const
export const sorts = { 'bounty,desc': 'Mayor recompensa', 'name,asc': 'Nombre A–Z', 'updatedAt,desc': 'Actualizados recientemente' } as const
export interface WantedQuery { page: number; size: number; status: string; crewId: string; fruit: string; q: string; sort: string }
export function parseWantedQuery(params: URLSearchParams): WantedQuery {
  const page = Number(params.get('page') ?? 0)
  const size = Number(params.get('size') ?? 20)
  const status = params.get('status') ?? ''
  const fruit = params.get('fruit') ?? ''
  const sort = params.get('sort') ?? ''
  return {
    page: Number.isSafeInteger(page) && page >= 0 ? page : 0,
    size: [10, 20, 50].includes(size) ? size : 20,
    status: Object.hasOwn(statuses, status) ? status : '',
    fruit: Object.hasOwn(fruits, fruit) ? fruit : '',
    sort: Object.hasOwn(sorts, sort) ? sort : 'bounty,desc',
    q: (params.get('q') ?? '').trim().slice(0, 100),
    crewId: (params.get('crewId') ?? '').slice(0, 200),
  }
}
export function serializeWantedQuery(query: WantedQuery): URLSearchParams {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) if (value !== '') params.set(key, String(value))
  return params
}
