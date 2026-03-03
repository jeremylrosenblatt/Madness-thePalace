export type Team = { id: string; name: string; seed: number; region: string }
export type Round = 'R64' | 'R32' | 'S16' | 'E8' | 'F4' | 'CH'

export type Match = {
  id: string
  round: Round
  region: string
  // For R64, a/b are teamIds. For later rounds, aFrom/bFrom reference prior match ids.
  a: string | null
  b: string | null
  aFrom: string | null
  bFrom: string | null
  winner: string | null
}

export type Tournament = {
  name: string
  year: number
  status: 'DRAFT' | 'PUBLISHED'
  lockTime: string | null // ISO string or null
  teams: Team[]
  matches: Match[]
  scoring: Record<Round, number>
}

export type Entry = {
  id: string
  createdAt: string
  name: string
  email: string
  phone: string
  tiebreaker?: number
  picks: Record<string, string | null> // matchId -> winnerTeamId
}

export const Bracket = {
  isLocked(t: Tournament){
    if (!t.lockTime) return false
    return Date.now() >= new Date(t.lockTime).getTime()
  },
  teamById(t: Tournament, id: string){
    return t.teams.find(x => x.id === id) ?? null
  },
  matchById(t: Tournament, id: string){
    return t.matches.find(m => m.id === id) ?? null
  },
  // returns the current participant teamId for a slot of a match given an entry's picks
  participantTeamId(t: Tournament, e: Entry, m: Match, slot: 'a'|'b'): string | null {
    const direct = slot === 'a' ? m.a : m.b
    const from = slot === 'a' ? m.aFrom : m.bFrom
    if (direct) return direct
    if (!from) return null
    const picked = e.picks[from]
    return picked ?? null
  },
  // which matches depend on a given match (to clear downstream picks)
  dependentsMap(t: Tournament): Map<string, string[]>{
    const dep = new Map<string, string[]>()
    for (const m of t.matches){
      for (const from of [m.aFrom, m.bFrom]){
        if (!from) continue
        if (!dep.has(from)) dep.set(from, [])
        dep.get(from)!.push(m.id)
      }
    }
    return dep
  },
  // Clear picks in downstream matches if they are no longer valid after a change.
  sanitizeDownstream(t: Tournament, e: Entry, changedMatchId: string): Entry {
    const dep = Bracket.dependentsMap(t)
    const next = { ...e, picks: { ...e.picks } }
    const queue = [...(dep.get(changedMatchId) ?? [])]
    while (queue.length){
      const mid = queue.shift()!
      const m = Bracket.matchById(t, mid)
      if (!m) continue
      const aId = Bracket.participantTeamId(t, next, m, 'a')
      const bId = Bracket.participantTeamId(t, next, m, 'b')
      const pick = next.picks[mid]
      if (pick && pick !== aId && pick !== bId){
        next.picks[mid] = null
      }
      const kids = dep.get(mid) ?? []
      queue.push(...kids)
    }
    return next
  }
}

export function computeScore(t: Tournament, e: Entry){
  let score = 0
  for (const m of t.matches){
    if (!m.winner) continue
    const pick = e.picks[m.id]
    if (pick && pick === m.winner) score += t.scoring[m.round]
  }
  return score
}

export type LeaderRow = { rank: number; entryId: string; name: string; score: number }

export function computeLeaderboard(t: Tournament, entries: Entry[]): LeaderRow[] {
  const rows = entries.map(e => ({ entryId: e.id, name: e.name, score: computeScore(t, e) }))
  rows.sort((a,b)=> b.score - a.score || a.name.localeCompare(b.name))
  let rank = 1
  return rows.map((r, idx) => ({ ...r, rank: idx === 0 ? 1 : (r.score === rows[idx-1].score ? rank : (rank = idx+1)) }))
}
