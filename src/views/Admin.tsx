import { useMemo, useState } from 'react'
import { Bracket, type Entry, type Match, type Round, type Tournament } from '../utils'
import { supabase } from '../lib/supabase'

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

function buildDummyTeams(theme: 'Trophies'|'Pizzas'|'Mixed'){
  const regions = ['West','East','South','Midwest']
  const trophy = ['Cup','Plaque','Medal','Ribbon','Crystal','Engraving','Champion','MVP','All-Star','Gold','Silver','Bronze','Victory','Legends','Dynasty','Clutch']
  const pizza = ['Pepperoni','Sausage','Mushroom','Margherita','Supreme','Hawaiian','BBQ Chicken','Veggie','Meat Lovers','White Pie','Calzone','Garlic Knots','Wings','Slice','Deep Dish','Thin Crust']
  const pick = (arr: string[], i: number) => arr[(i-1) % arr.length]
  const teams:any[] = []
  for (const r of regions){
    for (let seed=1; seed<=16; seed++){
      let name = ''
      if (theme === 'Trophies') name = `${r} ${pick(trophy, seed)}`
      if (theme === 'Pizzas') name = `${r} ${pick(pizza, seed)}`
      if (theme === 'Mixed') name = seed % 2 === 0 ? `${r} ${pick(pizza, seed)}` : `${r} ${pick(trophy, seed)}`
      teams.push({ id: `${r}-${seed}`, name, seed, region: r })
    }
  }
  return teams
}

export default function Admin(props: {
  tournament: Tournament
  tournamentId: string | null
  onUpdateTournament: (t: Tournament)=>void
  entries: Entry[]
  onRefresh: ()=>Promise<void>
}){
  const [lockISO, setLockISO] = useState(props.tournament.lockTime ?? '')
  const [fastList, setFastList] = useState(true)
  const [dummyTheme, setDummyTheme] = useState<'Trophies'|'Pizzas'|'Mixed'>('Mixed')
  const locked = useMemo(()=> Bracket.isLocked(props.tournament), [props.tournament])

  const resetBetaData = async () => {
    if (!props.tournamentId) return
    if (!confirm('Reset ALL beta entries? This cannot be undone.')) return
    const { error } = await supabase.rpc('reset_beta_entries', { p_tournament_id: props.tournamentId })
    if (error) {
      alert(error.message)
      return
    }
    await props.onRefresh()
    alert('Beta entries reset.')
  }

  const setWinner = (matchId: string, winnerTeamId: string | null) => {
    const matches = props.tournament.matches.map(m => m.id === matchId ? { ...m, winner: winnerTeamId } : m)
    props.onUpdateTournament({ ...props.tournament, matches })
  }

  const applyDummyTeams = async () => {
    const teams = buildDummyTeams(dummyTheme)
    const clearedMatches = props.tournament.matches.map(m => ({ ...m, winner: null }))
    const t = { ...props.tournament, teams, matches: clearedMatches }
    props.onUpdateTournament(t)
    alert('Dummy teams applied (and results cleared).')
  }

  const rounds: Round[] = ['R64','R32','S16','E8','F4','CH']
  const allMatches = useMemo(()=> {
    const order: Record<Round, number> = { R64:0, R32:1, S16:2, E8:3, F4:4, CH:5 }
    return [...props.tournament.matches].sort((a,b)=> order[a.round]-order[b.round] || a.region.localeCompare(b.region) || a.id.localeCompare(b.id))
  }, [props.tournament.matches])

  return (
    <div className="grid cols-2">
      <div className="card">
        <h2 style={{margin:'4px 0 12px'}}>Admin (beta)</h2>

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
            <button className="btn" onClick={props.onRefresh}>Refresh entries</button>
            <button className="btn" onClick={resetBetaData}>Reset Beta Data</button>
          </div>

          <div className="row" style={{alignItems:'center'}}>
            <span className="badge">Admin View</span>
            <button className="btn" onClick={()=>setFastList(v=>!v)}>{fastList ? 'Switch to Bracket View' : 'Switch to Fast List'}</button>
          </div>

          <hr className="sep" />

          <h3 style={{margin:'4px 0 8px'}}>Dummy teams</h3>
          <div className="row" style={{alignItems:'center'}}>
            <select value={dummyTheme} onChange={(e)=>setDummyTheme(e.target.value as any)} style={{maxWidth: 240}}>
              <option value="Mixed">Mixed (Trophies + Pizzas)</option>
              <option value="Trophies">Trophies theme</option>
              <option value="Pizzas">Pizzas theme</option>
            </select>
            <button className="btn" onClick={applyDummyTeams}>Apply Dummy Teams</button>
          </div>
          <small className="muted">This overwrites the team names and clears results (winners).</small>

          <div className="kv" style={{marginTop:10}}>
            <div><small className="muted">Entries</small></div><div><strong>{props.entries.length}</strong></div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{margin:'4px 0 12px'}}>Finalize official results (beta)</h3>
        <small className="muted">{fastList ? 'Fast list view: scroll and click winners.' : 'Bracket view by round.'}</small>
        <div style={{height:10}} />

        {fastList ? (
          <div className="grid">
            {allMatches.map(m => (
              <div key={m.id} className="card" style={{padding:12}}>
                <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
                  <strong>{ROUND_LABELS[m.round]}</strong>
                  <span className="badge">{m.region}</span>
                </div>
                <div style={{height:8}} />
                <WinnerPicker tournament={props.tournament} match={m} onSetWinner={setWinner} />
              </div>
            ))}
          </div>
        ) : (
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
        )}
      </div>
    </div>
  )
}
