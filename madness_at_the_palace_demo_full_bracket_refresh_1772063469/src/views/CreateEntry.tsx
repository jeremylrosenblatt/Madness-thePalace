import { useMemo, useState } from 'react'
import { Bracket, type Entry, type Tournament } from '../utils'

function uid(){ return Math.random().toString(16).slice(2) + '-' + Date.now().toString(16) }

export default function CreateEntry(props: {
  tournament: Tournament
  onCreated: (entry: Entry)=>void
}){
  const locked = useMemo(()=> Bracket.isLocked(props.tournament), [props.tournament])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [tiebreaker, setTiebreaker] = useState('')

  return (
    <div className="card">
      <h2 style={{margin:'4px 0 12px'}}>Create your bracket</h2>
      {locked && (
        <p><strong>Bracket is locked.</strong> New entries are closed.</p>
      )}
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
        disabled={locked || !name.trim() || !email.trim() || !phone.trim()}
        onClick={()=>{
          const entry: Entry = {
            id: uid(),
            createdAt: new Date().toISOString(),
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim(),
            tiebreaker: tiebreaker.trim() ? Number(tiebreaker) : undefined,
            picks: Object.fromEntries(props.tournament.matches.map(m => [m.id, null]))
          }
          props.onCreated(entry)
        }}
      >
        Start Picking
      </button>
      <div style={{height:8}} />
      <small className="muted">Email and phone are required for prize contact.</small>
    </div>
  )
}
