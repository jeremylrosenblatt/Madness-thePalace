import { useMemo, useState } from 'react'
import { Bracket, type Entry, type Match, type Round, type Tournament } from '../utils'

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

function ReadonlyMatchCard(props: {
  tournament: Tournament
  entry: Entry
  match: Match
}){
  const { tournament, entry, match } = props
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
        <span className={pick === aId ? 'picked' : undefined} style={{fontWeight: 700}}>{a ? a.name : 'TBD'}</span>
      </div>
      <div style={{opacity:.6}}>vs</div>
      <div className="team" style={{justifyContent:'flex-end'}}>
        <span className={pick === bId ? 'picked' : undefined} style={{fontWeight: 700}}>{b ? b.name : 'TBD'}</span>
        <span className="seed">{b ? b.seed : ''}</span>
      </div>
    </div>
  )
}

function RegionRoundColumn(props: { tournament: Tournament; entry: Entry; region: string; round: Round }){
  const matches = props.tournament.matches.filter(m => m.region === props.region && m.round === props.round)
  return (
    <div className="card">
      <h4 style={{margin:'4px 0 10px'}}>{titleForRound(props.round)}</h4>
      <div className="grid">
        {matches.map(m => <ReadonlyMatchCard key={m.id} tournament={props.tournament} entry={props.entry} match={m} />)}
      </div>
    </div>
  )
}

export default function ViewBrackets(props: {
  tournament: Tournament
  entries: Entry[]
  allow: boolean
}){
  const [q, setQ] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('Full')

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return props.entries
    return props.entries.filter(e => e.name.toLowerCase().includes(s))
  }, [props.entries, q])

  const selected = useMemo(()=> props.entries.find(e => e.id === selectedId) ?? null, [props.entries, selectedId])

  if (!props.allow){
    return (
      <div className="card">
        <h2 style={{margin:'4px 0 10px'}}>Brackets</h2>
        <p>Bracket viewing is currently disabled.</p>
      </div>
    )
  }

  return (
    <div className="grid cols-2">
      <div className="card">
        <h2 style={{margin:'4px 0 10px'}}>View Brackets</h2>
        <label>Search by name</label>
        <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Type a name…" />
        <div style={{height:10}} />
        <div style={{maxHeight: 520, overflow:'auto', border:'1px solid #eee', borderRadius: 12}}>
          <table className="table">
            <thead><tr><th>Name</th></tr></thead>
            <tbody>
              {filtered.map(e => (
                <tr key={e.id} style={e.id === selectedId ? {fontWeight: 700} : undefined}>
                  <td style={{cursor:'pointer'}} onClick={()=>setSelectedId(e.id)}>{e.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <small className="muted">Admins can test early. Public viewing typically starts after lock.</small>
      </div>

      <div className="card">
        <h3 style={{margin:'4px 0 10px'}}>{selected ? selected.name : 'Select a bracket'}</h3>
        {!selected ? (
          <p>Pick a name from the list to view their bracket.</p>
        ) : (
          <>
            <div className="row" style={{alignItems:'center'}}>
              <label style={{margin:0}}>View</label>
              <select value={tab} onChange={(e)=>setTab(e.target.value as Tab)} style={{maxWidth: 220}}>
                <option value="Full">Full Bracket</option>
                <option value="West">West</option>
                <option value="East">East</option>
                <option value="South">South</option>
                <option value="Midwest">Midwest</option>
                <option value="FinalFour">Final Four</option>
              </select>
              <button className="btn" onClick={()=>{
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

            <div id="printable-bracket" style={{marginTop: 12}}>
              {tab === 'Full' ? (
                <div className="grid">
                  {(['West','East','South','Midwest'] as const).map(region => (
                    <div key={region} className="card" style={{padding:12}}>
                      <h3 style={{margin:'0 0 10px'}}>{region}</h3>
                      <div className="grid cols-3">
                        {ROUND_ORDER.map(r => (
                          <RegionRoundColumn key={r} tournament={props.tournament} entry={selected} region={region} round={r} />
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="card" style={{padding:12}}>
                    <h3 style={{margin:'0 0 10px'}}>Final Four + Championship</h3>
                    <div className="grid cols-2">
                      <div className="card">
                        <h4 style={{margin:'4px 0 10px'}}>Final Four</h4>
                        <div className="grid">
                          {props.tournament.matches.filter(m=>m.round==='F4').map(m => (
                            <ReadonlyMatchCard key={m.id} tournament={props.tournament} entry={selected} match={m} />
                          ))}
                        </div>
                      </div>
                      <div className="card">
                        <h4 style={{margin:'4px 0 10px'}}>Championship</h4>
                        <div className="grid">
                          {props.tournament.matches.filter(m=>m.round==='CH').map(m => (
                            <ReadonlyMatchCard key={m.id} tournament={props.tournament} entry={selected} match={m} />
                          ))}
                        </div>
                        <hr className="sep" />
                        <div><small className="muted">Tie-breaker:</small> <strong>{selected.tiebreaker ?? ''}</strong></div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : tab === 'FinalFour' ? (
                <div className="grid cols-2">
                  <div className="card">
                    <h4 style={{margin:'4px 0 10px'}}>Final Four</h4>
                    <div className="grid">
                      {props.tournament.matches.filter(m=>m.round==='F4').map(m => (
                        <ReadonlyMatchCard key={m.id} tournament={props.tournament} entry={selected} match={m} />
                      ))}
                    </div>
                  </div>
                  <div className="card">
                    <h4 style={{margin:'4px 0 10px'}}>Championship</h4>
                    <div className="grid">
                      {props.tournament.matches.filter(m=>m.round==='CH').map(m => (
                        <ReadonlyMatchCard key={m.id} tournament={props.tournament} entry={selected} match={m} />
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid cols-3">
                  {ROUND_ORDER.map(r => (
                    <RegionRoundColumn key={r} tournament={props.tournament} entry={selected} region={tab} round={r} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
