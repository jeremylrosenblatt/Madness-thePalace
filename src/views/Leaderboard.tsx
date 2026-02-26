import type { LeaderRow } from '../utils'

export default function Leaderboard(props: { leaderboard: LeaderRow[]; activeEntryId: string | null }){
  return (
    <div className="card">
      <h2 style={{margin:'4px 0 12px'}}>Leaderboard</h2>
      {props.leaderboard.length === 0 ? (
        <p>No entries yet. Create one to get started.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th style={{width:70}}>Rank</th>
              <th>Name</th>
              <th style={{width:90}}>Score</th>
            </tr>
          </thead>
          <tbody>
            {props.leaderboard.map(r => (
              <tr key={r.entryId} style={r.entryId === props.activeEntryId ? {fontWeight: 700} : undefined}>
                <td>{r.rank}</td>
                <td>{r.name}</td>
                <td>{r.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <small className="muted">This is local-only in the demo. Hosting will make this shared for everyone.</small>
    </div>
  )
}
