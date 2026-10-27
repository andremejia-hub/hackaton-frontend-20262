import { test as base, expect, type Page } from '@playwright/test'
import type { DashboardSummary, LoginResponse, WantedDetail } from '../../src/lib/types'

// Isolated test fixtures only. The production app never imports this directory.
export const session: LoginResponse = { token: 'test-session', tokenType: 'Bearer', expiresAt: '2099-01-01T00:00:00.000Z', user: { id: 'test-user', name: 'Tripulación de pruebas', email: 'test@example.test' }, team: { code: 'TEST-001', name: 'Tripulación de pruebas' } }
export const wanted: WantedDetail = {
  id: 'test-wanted', name: 'Navegante de pruebas', epithet: 'Rumbo seguro', bounty: 123000, status: 'AT_LARGE', crew: { id: 'test-crew', name: 'Piratas de pruebas' }, role: 'CAPTAIN', devilFruit: null,
  threatLevel: 2, lastSeenIsland: 'Isla de pruebas', updatedAt: '2026-10-01T00:00:00Z', age: 25, heightCm: 180, bio: 'Biografía del contrato de pruebas.', lastSeen: { island: 'Isla de pruebas', seenAt: '2026-10-01T00:00:00Z' }, bountyHistory: [{ amount: 123000, issuedAt: '2026-10-01T00:00:00Z' }],
}
export const summary: DashboardSummary = {
  team: session.team, wanted: { total: 45, totalBounty: 1000000, averageBounty: 22222, byStatus: { AT_LARGE: 30, CAPTURED: 10, MISSING: 5 }, byFruit: { PARAMECIA: 10, ZOAN: 10, LOGIA: 10, NONE: 15 } },
  crews: { total: 1, mostWanted: null }, topBounties: [wanted], generatedAt: '2026-10-01T00:00:00Z',
}
export async function signIn(page: Page) {
  await page.addInitScript(() => {
    // Seed once, so reload/direct navigation after logout cannot silently sign in again.
    if (!sessionStorage.getItem('test.session.initialized')) {
      localStorage.setItem('logpose.token', 'test-session')
      sessionStorage.setItem('test.session.initialized', 'true')
    }
  })
}
export const test = base.extend<{ api: void }>({
  api: [async ({ context }, use) => {
    await context.route('**/api/v1/**', async route => {
      const url = new URL(route.request().url())
      const path = url.pathname.replace('/api/v1', '')
      const json = path === '/auth/me' ? session
        : path === '/auth/login' || path === '/auth/register' ? session
        : path === '/dashboard/summary' ? summary
        : path === '/log-pose' ? { status: 'LOCKED', grandLineUnlocked: false, unlockedAt: null, message: 'Pidan la inspección en Reverse Mountain.' }
        : path === '/crews' ? [{ id: 'test-crew', name: 'Piratas de pruebas', shipName: 'Barco', jollyRogerColor: '#112233', memberCount: 45, totalBounty: 1000000 }]
        : path === '/wanted' ? { content: [{ ...wanted, name: `Cartel página ${url.searchParams.get('page') ?? 0}` }], totalElements: 45, totalPages: Math.ceil(45 / Number(url.searchParams.get('size') ?? 20)), page: Number(url.searchParams.get('page') ?? 0), size: Number(url.searchParams.get('size') ?? 20) }
        : path === '/wanted/test-wanted' ? wanted : null
      await route.fulfill({ status: json ? 200 : 404, json: json ?? { code: 'NOT_FOUND', message: 'No encontrado' } })
    })
    await use()
  }, { auto: true }],
})
export { expect }
