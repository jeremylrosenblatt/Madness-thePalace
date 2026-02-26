export type TournamentRow = {
  id: string
  year: number
  name: string
  mode: 'BETA' | 'LIVE'
  status: 'DRAFT' | 'PUBLISHED'
  lock_time: string | null
  data: any
  updated_at: string
}

export type EntryRow = {
  id: string
  tournament_id: string
  name: string
  tiebreaker: number | null
  picks: any
  created_at: string
}
