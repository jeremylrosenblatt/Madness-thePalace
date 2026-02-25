import { useMemo, useState } from 'react'
import { Bracket, type Entry, type Match, type Round, type Tournament } from '../utils'

const ROUND_LABELS: Record<Round, string> = {
  R64: 'Round of 64',
  R32: 'Round of 32',
  S16: 'Sweet 16',
  E8: 'Elite 8',
  F4: 'Final Four',
  CH: 'Championship'
}

function WinnerPicker(props: {
  tournament: Tournament
  match: Match
  onSetWinner: (matchId: string, winnerTeamId: string | null)=>void
}){
  const { tournament, match } = props
  const a = match.a ? Bracket.teamById(tournament, match.a) : null
  const b = match.b ? Bracket.teamById(tournament, match.b) : null
  // For later rounds, winners depend on prior winners (official results), not user picks.
  const aFromWinner = match.aFrom ? (Bracket.matchById(tournament, match.aFrom)?.winner ?? null) : null
  const bFromWinner = match.bFrom ? (Bracket.matchById(tournament, match.bFrom)?.winner ?? null) : null
  const aId = a ? a.id : aFromWinner
  const bId = b ? b.id : bFromWinner
  const aTeam = aId ? Bracket.teamById(tournament, aId) : null
  const bTeam = bId ? Bracket.teamById(tournament, bId) : null

  return (
    <div className="match" style={{opacity: aTeam && bTeam ? 1 : .6}}>
      <div className="team">
        <span className="seed">{aTeam ? aTeam.seed : ''}</span>
        <button onClick={()=> aTeam && props.onSetWinner(match.id, aTeam.id)} className={match.winner===aId ? 'picked' : undefined}>
          {aTeam ? aTeam.name : 'TBD'}
        </button>
      </div>
      <div style={{display:'flex', flexDirection:'column', gap:6, alignItems:'center'}}>
        <small className="muted">{match.region}</small>
        <button className="btn" onClick={()=>props.onSetWinner(match.id, null)}>Clear</button>
      </div>
      <div className="team" style={{justifyContent:'flex-end'}}>
        <button onClick={()=> bTeam && props.onSetWinner(match.id, bTeam.id)} className={match.winner===bId ? 'picked' : undefined}>
          {bTeam ? bTeam.name : 'TBD'}
        </button>
        <span className="seed">{bTeam ? bTeam.seed : ''}</span>
      </div>
    </div>
  )
}

export default function Admin(props: {
  tournament: Tournament
  onUpdateTournament: (t: Tournament)=>void
  entries: Entry[]
  onResetAll: ()=>void
}){
  const [lockISO, setLockISO] = useState(props.tournament.lockTime ?? '')
  const locked = useMemo(()=> Bracket.isLocked(props.tournament), [props.tournament])

  const setWinner = (matchId: string, winnerTeamId: string | null) => {
    const matches = props.tournament.matches.map(m => m.id === matchId ? { ...m, winner: winnerTeamId } : m)
    props.onUpdateTournament({ ...props.tournament, matches })
  }

  const rounds: Round[] = ['R64','R32','S16','E8','F4','CH']

  return (
    <div className="grid cols-2">
      <div className="card">
        <h2 style={{margin:'4px 0 12px'}}>Admin (demo)</h2>

        <div className="grid">
          <div>
            <label>Status</label>
            <select
              value={props.tournament.status}
              onChange={(e)=>props.onUpdateTournament({ ...props.tournament, status: e.target.value as any })}
            >
              <option value="DRAFT">DRAFT</option>
              <option value="PUBLISHED">PUBLISHED</option>
            </select>
          </div>

          <div>
            <label>Lock time (ISO)</label>
            <input
              value={lockISO}
              onChange={(e)=>setLockISO(e.target.value)}
              placeholder="2026-03-19T09:15:00-07:00"
            />
            <div style={{height:8}} />
            <button className="btn" onClick={()=>{
              props.onUpdateTournament({ ...props.tournament, lockTime: lockISO.trim() || null })
            }}>Save lock time</button>
            <div style={{height:6}} />
            <small className="muted">Locked now? <strong>{locked ? 'Yes' : 'No'}</strong></small>
          </div>

          <div className="row">
            <button className="btn" onClick={props.onResetAll}>Reset all entries</button>
          </div>
        </div>

        <hr className="sep" />
        <div className="kv">
          <div><small className="muted">Entries</small></div><div><strong>{props.entries.length}</strong></div>
          <div><small className="muted">Tip</small></div><div><strong>Set winners in order to test scoring</strong></div>
        </div>
      </div>

      <div className="card">
        <h3 style={{margin:'4px 0 12px'}}>Finalize official results (demo)</h3>
        <small className="muted">Later rounds unlock as earlier winners are set.</small>
        <div style={{height:10}} />
        <div className="grid">
          {rounds.map(r => (
            <div key={r} className="card" style={{padding:12}}>
              <h4 style={{margin:'0 0 10px'}}>{ROUND_LABELS[r]}</h4>
              <div className="grid">
                {props.tournament.matches.filter(m=>m.round===r).map(m => (
                  <WinnerPicker key={m.id} tournament={props.tournament} match={m} onSetWinner={setWinner} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
