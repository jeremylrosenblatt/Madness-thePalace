import { useMemo, useState } from 'react'
import { Bracket, type Entry, type Match, type Round, type Tournament } from '../utils'
import { supabase } from '../lib/supabase'

const ROUND_ORDER: Round[] = ['R64','R32','S16','E8']
type Tab = 'West'|'East'|'South'|'Midwest'|'FinalFour'|'Full'

function titleForRound(r: Round){
  switch(r){
    case 'R64': return 'Round of 64'
    case 'R32': return 'Round of 32'
    case 'S16': return 'Sweet 16'
    case 'E8': return 'Elite 8'
    case 'F4': return 'Final Four'
    case 'CH': return 'Championship'
  }
}

function MatchCard(props: {
  tournament: Tournament
  entry: Entry
  match: Match
  locked: boolean
  onPick: (matchId: string, winnerTeamId: string)=>void
}){
  const { tournament, entry, match, locked } = props
  const aId = Bracket.participantTeamId(tournament, entry, match, 'a')
  const bId = Bracket.participantTeamId(tournament, entry, match, 'b')
  const a = aId ? Bracket.teamById(tournament, aId) : null
  const b = bId ? Bracket.teamById(tournament, bId) : null
  const pick = entry.picks[match.id]
  const pickable = !!a && !!b

  return (
    <div className="match" style={{opacity: pickable ? 1 : .6}}>
      <div className="team">
        <span className="seed">{a ? a.seed : ''}</span>
        <button
          disabled={locked || !pickable}
          onClick={()=> a && props.onPick(match.id, a.id)}
          className={pick === aId ? 'picked' : undefined}
          title="Pick winner"
        >
          {a ? a.name : 'TBD'}
        </button>
      </div>
      <div style={{opacity:.6}}>vs</div>
      <div className="team" style={{justifyContent:'flex-end'}}>
        <button
          disabled={locked || !pickable}
          onClick={()=> b && props.onPick(match.id, b.id)}
          className={pick === bId ? 'picked' : undefined}
          title="Pick winner"
        >
          {b ? b.name : 'TBD'}
        </button>
        <span className="seed">{b ? b.seed : ''}</span>
      </div>
    </div>
  )
}

export default function MyBracket(props: {
  tournament: Tournament
  entry: Entry
  editCode: string | null
  onUpdateEntry: (e: Entry)=>void
  onSaved: ()=>Promise<void>
  score: number
}){
  const locked = useMemo(()=> Bracket.isLocked(props.tournament), [props.tournament])
  const [tab, setTab] = useState<Tab>('West')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const byRegion = useMemo(() => {
    const map = new Map<string, Match[]>()
    for (const m of props.tournament.matches){
      if (!map.has(m.region)) map.set(m.region, [])
      map.get(m.region)!.push(m)
    }
    for (const [k, arr] of map){
      arr.sort((a,b)=> a.round.localeCompare(b.round) || a.id.localeCompare(b.id))
      map.set(k, arr)
    }
    return map
  }, [props.tournament.matches])

  const canUseSupabase = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)

  const save = async (nextEntry: Entry) => {
    if (!canUseSupabase || !props.editCode || props.editCode === 'local') return
    setSaving(true)
    setErr(null)
    try{
      const { error } = await supabase.rpc('update_entry', {
        p_entry_id: nextEntry.id,
        p_edit_code: props.editCode,
        p_picks: nextEntry.picks,
        p_tiebreaker: nextEntry.tiebreaker ?? null
      })
      if (error) throw error
      await props.onSaved()
    } catch(e:any){
      setErr(e?.message ?? 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const pick = async (matchId: string, winnerTeamId: string) => {
    const updated: Entry = { ...props.entry, picks: { ...props.entry.picks, [matchId]: winnerTeamId } }
    const cleaned = Bracket.sanitizeDownstream(props.tournament, updated, matchId)
    props.onUpdateEntry(cleaned)
    await save(cleaned)
  }

  const RegionBracket = ({ region }: { region: string }) => {
    const matches = byRegion.get(region) ?? []
    const groups = new Map<Round, Match[]>()
    for (const r of ROUND_ORDER){
      groups.set(r, matches.filter(m => m.round === r))
    }
    return (
      <div className="grid cols-3">
        {ROUND_ORDER.map(r => (
          <div key={r} className="card">
            <h3 style={{margin:'4px 0 10px'}}>{titleForRound(r)}</h3>
            <div className="grid">
              {(groups.get(r) ?? []).map(m => (
                <MatchCard key={m.id} tournament={props.tournament} entry={props.entry} match={m} locked={locked} onPick={pick} />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const FinalFourBracket = () => {
    const f4 = props.tournament.matches.filter(m => m.round === 'F4').sort((a,b)=>a.id.localeCompare(b.id))
    const ch = props.tournament.matches.filter(m => m.round === 'CH')
    return (
      <div className="grid cols-2">
        <div className="card">
          <h3 style={{margin:'4px 0 10px'}}>{titleForRound('F4')}</h3>
          <div className="grid">
            {f4.map(m => (
              <MatchCard key={m.id} tournament={props.tournament} entry={props.entry} match={m} locked={locked} onPick={pick} />
            ))}
          </div>
        </div>
        <div className="card">
          <h3 style={{margin:'4px 0 10px'}}>{titleForRound('CH')}</h3>
          <div className="grid">
            {ch.map(m => (
              <MatchCard key={m.id} tournament={props.tournament} entry={props.entry} match={m} locked={locked} onPick={pick} />
            ))}
          </div>
          <hr className="sep" />
          <label>Championship total points (tie-breaker)</label>
          <input
            value={props.entry.tiebreaker ?? ''}
            onChange={async (e)=>{
              const v = e.target.value.trim()
              const next = { ...props.entry, tiebreaker: v ? Number(v) : undefined }
              props.onUpdateEntry(next)
              await save(next)
            }}
            placeholder="e.g., 142"
            inputMode="numeric"
            disabled={locked}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="grid" style={{gap:12}}>
      <div className="card">
        <h2 style={{margin:'4px 0 8px'}}>My Bracket</h2>
        <div className="row" style={{alignItems:'center'}}>
          <span className="badge"><strong>{props.entry.name}</strong></span>
          <span className="badge">Score: <strong>{props.score}</strong></span>
          {locked ? <span className="badge">Locked</span> : <span className="badge">Editable</span>}
          {saving && <span className="badge">Saving…</span>}
        </div>
        {err && <p style={{color:'#b00020', margin:'8px 0 0'}}><strong>{err}</strong></p>}

        <div style={{height:10}} />
        <div className="row" style={{alignItems:'center'}}>
          <label style={{margin:0}}>View</label>
          <select value={tab} onChange={(e)=>setTab(e.target.value as Tab)} style={{maxWidth: 220}}>
            <option value="West">West</option>
            <option value="East">East</option>
            <option value="South">South</option>
            <option value="Midwest">Midwest</option>
            <option value="FinalFour">Final Four</option>
            <option value="Full">Full Bracket</option>
          </select>
          <small className="muted">Pick winners and they advance automatically.</small>
          <button className="btn" onClick={() => {
            const w = window.open('', '_blank')
            if (!w) return
            w.document.write('<html><head><title>Bracket</title></head><body>')
            w.document.write(document.getElementById('printable-bracket')?.innerHTML ?? '')
            w.document.write('</body></html>')
            w.document.close()
            w.focus()
            w.print()
          }}>Print / Save PDF</button>
        </div>
      </div>

      <div id="printable-bracket">
      {tab === 'Full' ? (
        <div className="grid">
          {(['West','East','South','Midwest'] as const).map(region => (
            <div key={region} className="card" style={{padding:12}}>
              <h3 style={{margin:'0 0 10px'}}>{region}</h3>
              <div className="grid cols-3">
                {ROUND_ORDER.map(r => (
                  <div key={r} className="card">
                    <h3 style={{margin:'4px 0 10px'}}>{titleForRound(r)}</h3>
                    <div className="grid">
                      {(byRegion.get(region) ?? []).filter(m=>m.round===r).map(m => (
                        <MatchCard key={m.id} tournament={props.tournament} entry={props.entry} match={m} locked={locked} onPick={pick} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <FinalFourBracket />
        </div>
      ) : (tab !== 'FinalFour' ? <RegionBracket region={tab} /> : <FinalFourBracket />)}
    </div>
      <small className="muted">Beta saves to Supabase, so everyone shares the leaderboard.</small>
    </div>
  )
}
