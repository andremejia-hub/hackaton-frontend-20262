// Contract: docs/openapi.json. IDs are opaque and always supplied by the API.
export type WantedStatus = 'AT_LARGE' | 'CAPTURED' | 'MISSING'
export type FruitType = 'PARAMECIA' | 'ZOAN' | 'LOGIA'
export interface Team { code: string; name: string }
export interface Session { user: { id: string; name: string; email: string }; team: Team; expiresAt: string }
export interface LoginResponse extends Session { token: string; tokenType: 'Bearer' }
export interface Crew { id: string; name: string; shipName: string; jollyRogerColor: string; memberCount: number; totalBounty: number }
export interface Wanted {
  id: string; name: string; epithet: string; bounty: number; status: WantedStatus
  crew: { id: string; name: string }; role: string
  devilFruit: { name: string; type: FruitType } | null
  threatLevel: number; lastSeenIsland: string; updatedAt: string
}
export interface WantedDetail extends Wanted {
  age: number; heightCm: number; bio: string
  lastSeen: { island: string; seenAt: string }
  bountyHistory: { amount: number; issuedAt: string }[]
}
export interface WantedPage { content: Wanted[]; totalElements: number; totalPages: number; page: number; size: number }
export interface DashboardSummary {
  team: Team
  wanted: { total: number; totalBounty: number; averageBounty: number; byStatus: Record<WantedStatus, number>; byFruit: Record<FruitType | 'NONE', number> }
  crews: { total: number; mostWanted: Crew | null }; topBounties: Wanted[]; generatedAt: string
}
export interface LogPose { status: 'LOCKED' | 'UNLOCKED'; grandLineUnlocked: boolean; unlockedAt: string | null; message: string }
