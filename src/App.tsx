import { useEffect, useMemo, useState } from 'react'
import tournamentDummy from './tournament.dummy.json'
import { computeLeaderboard, computeScore, type Entry, type Tournament } from './utils'
import Landing from './views/Landing'
import CreateEntry from './views/CreateEntry'
import MyBracket from './views/MyBracket'
import Leaderboard from './views/Leaderboard'
import Admin from './views/Admin'
import { supabase } from './lib/supabase'
import type { EntryRow, TournamentRow } from './lib/dbTypes'

type Route = 'home' | 'create' | 'my' | 'leaderboard' | 'admin'

const LS_ACTIVE_ENTRY = 'matp:activeEntryId'
const LS_ACTIVE_EDIT = 'matp:activeEditCode'
const LS_TOURNAMENT_ID = 'matp:tournamentId'

function hasSupabase(){
  return !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
}

function mapTournamentRow(row: TournamentRow): Tournament {
  return row.data as Tournament
}

function mapEntryRow(row: EntryRow): Entry {
  return {
    id: row.id,
    createdAt: row.created_at,
    name: row.name,
    email: '', // contact stored separately in DB
    phone: '',
    tiebreaker: row.tiebreaker ?? undefined,
    picks: row.picks as any
  }
}

export default function App(){
  const [route, setRoute] = useState<Route>('home')
  const [tournament, setTournament] = useState<Tournament>(() => tournamentDummy as unknown as Tournament)
  const [entries, setEntries] = useState<Entry[]>([])
  const [activeEntryId, setActiveEntryId] = useState<string | null>(localStorage.getItem(LS_ACTIVE_ENTRY))
  const [activeEditCode, setActiveEditCode] = useState<string | null>(localStorage.getItem(LS_ACTIVE_EDIT))
  const [tournamentId, setTournamentId] = useState<string | null>(localStorage.getItem(LS_TOURNAMENT_ID))
  const [modeLabel, setModeLabel] = useState<'LOCAL_DEMO'|'CLOUDFLARE_BETA'>('LOCAL_DEMO')
  const [adminUnlocked, setAdminUnlocked] = useState<boolean>(() => localStorage.getItem('matp:adminUnlocked') === 'true')
  const adminPass = import.meta.env.VITE_ADMIN_PASSCODE as string | undefined
  const [showAdminPrompt, setShowAdminPrompt] = useState(false)
  const [adminInput, setAdminInput] = useState('')

  const refreshEntries = async (tid: string) => {
    if (!hasSupabase()) return
    const { data, error } = await supabase
      .from('entries')
      .select('id,tournament_id,name,tiebreaker,picks,created_at')
      .eq('tournament_id', tid)
      .order('created_at', { ascending: true })
    if (error) { console.error(error); return }
    setEntries((data ?? []).map(mapEntryRow))
  }

  useEffect(() => {
    const init = async () => {
      if (!hasSupabase()){
        setModeLabel('LOCAL_DEMO')
        setTournament(tournamentDummy as unknown as Tournament)
        setEntries([])
        return
      }
      setModeLabel('CLOUDFLARE_BETA')

      const { data: trows, error: terr } = await supabase
        .from('tournaments')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)

      if (terr) { console.error(terr); return }

      if (!trows || trows.length === 0) {
        const payload = {
          year: (tournamentDummy as any).year,
          name: (tournamentDummy as any).name,
          mode: 'BETA',
          status: 'DRAFT',
          lock_time: null,
          data: tournamentDummy
        }
        const { data: inserted, error: ierr } = await supabase
          .from('tournaments')
          .insert(payload)
          .select('*')
          .single()
        if (ierr) { console.error(ierr); return }
        const tid = (inserted as any).id as string
        setTournamentId(tid)
        localStorage.setItem(LS_TOURNAMENT_ID, tid)
        setTournament(mapTournamentRow(inserted as any))
        await refreshEntries(tid)
      } else {
        const trow = trows[0] as any as TournamentRow
        setTournamentId(trow.id)
        localStorage.setItem(LS_TOURNAMENT_ID, trow.id)
        setTournament(mapTournamentRow(trow))
        await refreshEntries(trow.id)
      }
    }
    init()
  }, [])

  useEffect(() => {
    if (!activeEntryId) localStorage.removeItem(LS_ACTIVE_ENTRY)
    else localStorage.setItem(LS_ACTIVE_ENTRY, activeEntryId)
  }, [activeEntryId])

  useEffect(() => {
    localStorage.setItem('matp:adminUnlocked', adminUnlocked ? 'true' : 'false')
  }, [adminUnlocked])

  useEffect(() => {
    if (!activeEditCode) localStorage.removeItem(LS_ACTIVE_EDIT)
    else localStorage.setItem(LS_ACTIVE_EDIT, activeEditCode)
  }, [activeEditCode])

  const activeEntry = useMemo(() => entries.find(e => e.id === activeEntryId) ?? null, [entries, activeEntryId])
  const leaderboard = useMemo(() => computeLeaderboard(tournament, entries), [tournament, entries])

  return (
    <div>
      <div className="topbar">
        <div className="topbar-inner">
          <div style={{display:'flex', gap:10, alignItems:'center'}}>
            <span className="badge">Madness at the Palace</span>
            <span className="badge">{tournament.status}</span>
            <span className="badge">{modeLabel}</span>
          </div>
          <div className="nav">
            {!adminUnlocked && adminPass && <button className="btn" onClick={()=>setShowAdminPrompt(true)}>Unlock Admin</button>}
            {adminUnlocked && <span className="badge">Admin</span>}
            <button className="btn" onClick={()=>setRoute('home')}>Home</button>
            <button className="btn" onClick={()=>setRoute('create')}>Create Bracket</button>
            <button className="btn" onClick={()=>setRoute('my')} disabled={!activeEntry}>My Bracket</button>
            <button className="btn" onClick={()=>setRoute('leaderboard')}>Leaderboard</button>
            <button className="btn" onClick={()=>setRoute('admin')} disabled={!adminUnlocked}>Admin</button>
          </div>
        </div>
      </div>

      <div className="container">
        <picture>
          <source media="(max-width: 600px)" srcSet="/header_mobile.png" />
          <img className="hdrimg" src="/header_desktop.png" alt="Madness at the Palace header" />
        </picture>
        <div style={{height:12}} />
        {showAdminPrompt && (
          <div className="card" style={{maxWidth: 520, margin: '0 auto 12px'}}>
            <h3 style={{margin:'4px 0 8px'}}>Admin access</h3>
            <p style={{margin:'0 0 10px'}} className="muted">Enter the admin passcode to access Admin tools.</p>
            <label>Passcode</label>
            <input value={adminInput} onChange={(e)=>setAdminInput(e.target.value)} placeholder="Enter passcode" />
            <div style={{height:10}} />
            <div className="row">
              <button className="btn primary" onClick={()=>{
                if (!adminPass) return
                if (adminInput === adminPass){
                  setAdminUnlocked(true)
                  setShowAdminPrompt(false)
                  setAdminInput('')
                } else {
                  alert('Incorrect passcode')
                }
              }}>Unlock</button>
              <button className="btn" onClick={()=>{ setShowAdminPrompt(false); setAdminInput('') }}>Cancel</button>
            </div>
          </div>
        )}
        <div style={{height:12}} />

        {modeLabel === 'CLOUDFLARE_BETA' && (
          <div className="card" style={{marginBottom:12}}>
            <strong>BETA MODE</strong> — This is a test site. Entries may be reset.
          </div>
        )}

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
            tournamentId={tournamentId}
            onCreated={async ({ entry, editCode }) => {
              setActiveEntryId(entry.id)
              setActiveEditCode(editCode)
              if (tournamentId) await refreshEntries(tournamentId)
              setRoute('my')
            }}
          />
        )}

        {route === 'my' && activeEntry && (
          <MyBracket
            tournament={tournament}
            entry={activeEntry}
            editCode={activeEditCode}
            onUpdateEntry={(updated) => {
              setEntries(prev => prev.map(e => e.id === updated.id ? updated : e))
            }}
            onSaved={async ()=>{
              if (tournamentId) await refreshEntries(tournamentId)
            }}
            score={computeScore(tournament, activeEntry)}
          />
        )}

        {route === 'leaderboard' && (
          <Leaderboard leaderboard={leaderboard} activeEntryId={activeEntryId} />
        )}

        {route === 'admin' && adminUnlocked && (
          <Admin
            tournament={tournament}
            tournamentId={tournamentId}
            onUpdateTournament={async (t) => {
              setTournament(t)
              if (!hasSupabase() || !tournamentId) return
              const { error } = await supabase.from('tournaments').update({ data: t, lock_time: t.lockTime }).eq('id', tournamentId)
              if (error) console.error(error)
            }}
            entries={entries}
            onRefresh={async ()=>{ if (tournamentId) await refreshEntries(tournamentId) }}
          />
        )}

        <div style={{height:24}} />
        <small className="muted">
          If Supabase env vars are missing, the app still works as a local demo (but entries won't be shared).
        </small>
      </div>
    </div>
  )
}
