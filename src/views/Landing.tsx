import type { Entry, Tournament } from '../utils'

export default function Landing(props: {
  tournament: Tournament
  entriesCount: number
  activeEntry: Entry | null
  onCreate: ()=>void
  onMy: ()=>void
  onLeaderboard: ()=>void
}){
  const { tournament, entriesCount, activeEntry } = props
  return (
    <div className="grid cols-2">
      <div className="card">
        <h2 style={{margin:'4px 0 8px'}}>{tournament.name} ({tournament.year})</h2>
        <p style={{margin:'0 0 10px'}}>
          Make your picks, submit once, and track your rank live throughout the tournament.
        </p>
        <div className="row">
          <button className="btn primary" onClick={props.onCreate}>Create Bracket</button>
          <button className="btn" onClick={props.onLeaderboard}>View Leaderboard</button>
          <button className="btn" onClick={props.onMy} disabled={!activeEntry}>My Bracket</button>
        </div>
        <hr className="sep" />
        <div className="kv">
          <div><small className="muted">Entries</small></div><div><strong>{entriesCount}</strong></div>
          <div><small className="muted">Status</small></div><div><strong>{tournament.status}</strong></div>
          <div><small className="muted">Lock</small></div><div><strong>{tournament.lockTime ? new Date(tournament.lockTime).toLocaleString() : 'Not set'}</strong></div>
        </div>
      </div>

      <div className="card">
        <h3 style={{margin:'4px 0 8px'}}>Dummy tournament for testing</h3>
        <p style={{margin:'0 0 10px'}}>
          This build uses placeholder teams and stores entries locally in your browser. Next we’ll add:
        </p>
        <ul style={{margin:'0 0 0 18px'}}>
          <li>Team import (CSV/paste) for Selection Sunday</li>
          <li>Hosted database so everyone shares the same leaderboard</li>
          <li>Public link + QR code + install-to-phone (PWA)</li>
        </ul>
      </div>
    </div>
  )
}
