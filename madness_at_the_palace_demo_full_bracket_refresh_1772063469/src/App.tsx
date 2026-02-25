import { useEffect, useMemo, useState } from 'react'
import tournamentDummy from './tournament.dummy.json'
import { Bracket, computeLeaderboard, computeScore, type Entry, type Tournament } from './utils'
import Landing from './views/Landing'
import CreateEntry from './views/CreateEntry'
import MyBracket from './views/MyBracket'
import Leaderboard from './views/Leaderboard'
import Admin from './views/Admin'

type Route = 'home' | 'create' | 'my' | 'leaderboard' | 'admin'

const LS_TOURNAMENT = 'matp:tournament'
const LS_ENTRIES = 'matp:entries'
const LS_ACTIVE_ENTRY = 'matp:activeEntryId'

function loadTournament(): Tournament {
  const raw = localStorage.getItem(LS_TOURNAMENT)
  if (!raw) return tournamentDummy as unknown as Tournament
  try { return JSON.parse(raw) as Tournament } catch { return tournamentDummy as unknown as Tournament }
}
function saveTournament(t: Tournament){ localStorage.setItem(LS_TOURNAMENT, JSON.stringify(t)) }

function loadEntries(): Entry[] {
  const raw = localStorage.getItem(LS_ENTRIES)
  if (!raw) return []
  try { return JSON.parse(raw) as Entry[] } catch { return [] }
}
function saveEntries(es: Entry[]){ localStorage.setItem(LS_ENTRIES, JSON.stringify(es)) }

export default function App(){
  const [route, setRoute] = useState<Route>('home')
  const [tournament, setTournament] = useState<Tournament>(() => tournamentDummy as unknown as Tournament)
  const [entries, setEntries] = useState<Entry[]>([])
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null)

  useEffect(() => {
    // init from localStorage
    const t = loadTournament()
    setTournament(t)
    setEntries(loadEntries())
    setActiveEntryId(localStorage.getItem(LS_ACTIVE_ENTRY))
  }, [])

  useEffect(() => { saveTournament(tournament) }, [tournament])
  useEffect(() => { saveEntries(entries) }, [entries])
  useEffect(() => {
    if (activeEntryId) localStorage.setItem(LS_ACTIVE_ENTRY, activeEntryId)
  }, [activeEntryId])

  const activeEntry = useMemo(() => entries.find(e => e.id === activeEntryId) ?? null, [entries, activeEntryId])

  const leaderboard = useMemo(() => computeLeaderboard(tournament, entries), [tournament, entries])

  const lockInfo = useMemo(() => {
    const locked = Bracket.isLocked(tournament)
    return { locked, lockTime: tournament.lockTime }
  }, [tournament])

  const headerSrc = useMemo(() => {
    // use desktop image everywhere; mobile can use mobile image later
    return '/header_desktop.png'
  }, [])

  return (
    <div>
      <div className="topbar">
        <div className="topbar-inner">
          <div style={{display:'flex', gap:10, alignItems:'center'}}>
            <span className="badge">Madness at the Palace</span>
            <span className="badge">{tournament.status}</span>
            {lockInfo.locked ? <span className="badge">Locked</span> : <span className="badge">Open</span>}
          </div>
          <div className="nav">
            <button className="btn" onClick={()=>setRoute('home')}>Home</button>
            <button className="btn" onClick={()=>setRoute('create')}>Create Bracket</button>
            <button className="btn" onClick={()=>setRoute('my')} disabled={!activeEntry}>My Bracket</button>
            <button className="btn" onClick={()=>setRoute('leaderboard')}>Leaderboard</button>
            <button className="btn" onClick={()=>setRoute('admin')}>Admin</button>
          </div>
        </div>
      </div>

      <div className="container">
        <img className="hdrimg" src={headerSrc} alt="Madness at the Palace header" />
        <div style={{height:12}} />

        {route === 'home' && (
          <Landing
            tournament={tournament}
            entriesCount={entries.length}
            activeEntry={activeEntry}
            onCreate={()=>setRoute('create')}
            onMy={()=>setRoute('my')}
            onLeaderboard={()=>setRoute('leaderboard')}
          />
        )}

        {route === 'create' && (
          <CreateEntry
            tournament={tournament}
            onCreated={(entry) => {
              setEntries(prev => [entry, ...prev])
              setActiveEntryId(entry.id)
              setRoute('my')
            }}
          />
        )}

        {route === 'my' && activeEntry && (
          <MyBracket
            tournament={tournament}
            entry={activeEntry}
            onUpdateEntry={(updated) => {
              setEntries(prev => prev.map(e => e.id === updated.id ? updated : e))
            }}
            score={computeScore(tournament, activeEntry)}
          />
        )}

        {route === 'leaderboard' && (
          <Leaderboard leaderboard={leaderboard} activeEntryId={activeEntryId} />
        )}

        {route === 'admin' && (
          <Admin
            tournament={tournament}
            onUpdateTournament={setTournament}
            entries={entries}
            onResetAll={()=>{
              localStorage.removeItem('matp:entries')
              localStorage.removeItem('matp:activeEntryId')
              setEntries([])
              setActiveEntryId(null)
            }}
          />
        )}

        <div style={{height:24}} />
        <small className="muted">
          Demo build: dummy teams + local storage. Next step is adding real data import + hosted leaderboard.
        </small>
      </div>
    </div>
  )
}
