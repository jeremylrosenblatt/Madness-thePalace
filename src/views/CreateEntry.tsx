import { useMemo, useState } from 'react'
import { Bracket, type Entry, type Tournament } from '../utils'
import { supabase } from '../lib/supabase'

function uid(){ return Math.random().toString(16).slice(2) + '-' + Date.now().toString(16) }

export default function CreateEntry(props: {
  tournament: Tournament
  tournamentId: string | null
  onCreated: (payload: { entry: Entry; editCode: string })=>void
}){
  const locked = useMemo(()=> Bracket.isLocked(props.tournament), [props.tournament])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [tiebreaker, setTiebreaker] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const canUseSupabase = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)

  return (
    <div className="card">
      <h2 style={{margin:'4px 0 12px'}}>Create your bracket</h2>
      {locked && (
        <p><strong>Bracket is locked.</strong> New entries are closed.</p>
      )}
      {err && <p style={{color:'#b00020'}}><strong>{err}</strong></p>}

      <div className="grid cols-2">
        <div>
          <label>Name *</label>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" />
        </div>
        <div>
          <label>Championship total points (tie-breaker)</label>
          <input value={tiebreaker} onChange={e=>setTiebreaker(e.target.value)} placeholder="e.g., 142" inputMode="numeric" />
        </div>
        <div>
          <label>Email *</label>
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@email.com" />
        </div>
        <div>
          <label>Phone *</label>
          <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="(555) 555-5555" />
        </div>
      </div>

      <div style={{height:12}} />
      <button
        className="btn primary"
        disabled={busy || locked || !name.trim() || !email.trim() || !phone.trim()}
        onClick={async ()=>{
          setErr(null)
          setBusy(true)
          try{
            const entry: Entry = {
              id: uid(),
              createdAt: new Date().toISOString(),
              name: name.trim(),
              email: email.trim(),
              phone: phone.trim(),
              tiebreaker: tiebreaker.trim() ? Number(tiebreaker) : undefined,
              picks: Object.fromEntries(props.tournament.matches.map(m => [m.id, null]))
            }

            if (!canUseSupabase || !props.tournamentId){
              props.onCreated({ entry, editCode: 'local' })
              return
            }

            const { data, error } = await supabase.rpc('create_entry', {
              p_entry_id: entry.id,
              p_tournament_id: props.tournamentId,
              p_name: entry.name,
              p_email: entry.email,
              p_phone: entry.phone,
              p_tiebreaker: entry.tiebreaker ?? null,
              p_picks: entry.picks
            })
            if (error) throw error
            const editCode = (data as any)?.edit_code as string
            if (!editCode) throw new Error('Missing edit code response')
            props.onCreated({ entry, editCode })
          } catch(e:any){
            setErr(e?.message ?? 'Failed to create entry')
          } finally {
            setBusy(false)
          }
        }}
      >
        {busy ? 'Creating…' : 'Start Picking'}
      </button>

      <div style={{height:8}} />
      <small className="muted">Email and phone are required for prize contact.</small>
    </div>
  )
}
