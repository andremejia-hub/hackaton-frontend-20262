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
export type NewsType = 'BOUNTY_UPDATE' | 'BATTLE' | 'MARINE_OPERATION' | 'WORLD_GOVERNMENT' | 'DISCOVERY'
export type NewsPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type NewsStatus = 'RUMOR' | 'CONFIRMED' | 'DEBUNKED'
export interface RelatedWanted { id: string; name: string }
export interface NewsItem {
  id: string
  type: NewsType
  priority: NewsPriority
  status: NewsStatus
  title: string
  summary: string
  source: string
  island: string
  relatedWanted: RelatedWanted | null
  publishedAt: string
  updatedAt: string
  verifiedAt: string | null
}
export interface NewsDetail extends NewsItem { body: string[] }
export interface NewsFeed { items: NewsItem[]; nextCursor: string | null; hasMore: boolean }
export type NewsStatusUpdate = 'CONFIRMED' | 'DEBUNKED'
export interface NewsOutletContext { updateNews: (updated: NewsItem) => void }

export interface SagaPalette {
  background: string
  surface: string
  primary: string
  accent: string
  text: string
}
export interface SagaSummary {
  id: string
  order: number
  title: string
  subtitle: string
  synopsis: string
  stageCount: number
  totalDistanceNm: number
  firstIsland: string
  lastIsland: string
  palette: SagaPalette
}
export type SagaMetricKey = 'distanceNm' | 'crewMorale' | 'bountyPool' | 'marineThreat'
export interface SagaMetric { key: SagaMetricKey; label: string; value: number; unit: string }
export interface SagaStage {
  id: string
  order: number
  slug: string
  title: string
  narrative: string[]
  island: { id: string; name: string; x: number; y: number }
  palette: SagaPalette
  metrics: SagaMetric[]
}
export interface SagaStory {
  saga: SagaSummary & { intro: string }
  map: { width: number; height: number }
  stages: SagaStage[]
}
