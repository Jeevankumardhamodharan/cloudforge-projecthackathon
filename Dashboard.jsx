import { useEffect, useState } from 'react'
import { api } from '../api.js'

export default function Dashboard({ refreshKey, onDataChanged }) {
  const [entries, setEntries] = useState([])
  const [members, setMembers] = useState([])
  const [verification, setVerification] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [seeding, setSeeding] = useState(false)

  const loadAll = async () => {
    setLoading(true)
    setError(null)
    try {
      const [ledgerRes, membersRes, verifyRes] = await Promise.all([
        api.getLedger(),
        api.getMembers(),
        api.verifyLedger(),
      ])
      setEntries(ledgerRes.entries)
      setMembers(membersRes.members)
      setVerification(verifyRes)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [refreshKey])

  const handleSeed = async () => {
    setSeeding(true)
    setError(null)
    try {
      await api.seedDemoData()
      onDataChanged()
    } catch (err) {
      setError(err.message)
    } finally {
      setSeeding(false)
    }
  }

  const totalContributions = entries
    .filter((e) => e.transaction_type === 'Contribution')
    .reduce((sum, e) => sum + e.amount, 0)

  const totalPayouts = entries
    .filter((e) => e.transaction_type === 'Payout')
    .reduce((sum, e) => sum + e.amount, 0)

  const recent = [...entries].slice(-5).reverse()

  if (loading) return <div className="panel">Loading dashboard...</div>

  return (
    <div className="page">
      <div className="page-header-row">
        <h2>Overview</h2>
        <button className="btn btn-primary" onClick={handleSeed} disabled={seeding}>
          {seeding ? 'Loading demo data...' : 'Load Sample Demo Data'}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="stat-grid">
        <StatCard label="Total Contributions" value={`₹${totalContributions.toLocaleString('en-IN')}`} />
        <StatCard label="Total Payouts" value={`₹${totalPayouts.toLocaleString('en-IN')}`} />
        <StatCard label="Members" value={members.length} />
        <StatCard label="Ledger Entries" value={entries.length} />
      </div>

      <div className="panel">
        <h3>Ledger Integrity</h3>
        {verification && verification.total_entries === 0 && (
          <div className="badge badge-neutral">No ledger entries yet</div>
        )}
        {verification && verification.total_entries > 0 && verification.valid && (
          <div className="badge badge-success">✓ Ledger Verified - all {verification.total_entries} entries intact</div>
        )}
        {verification && verification.total_entries > 0 && !verification.valid && (
          <div className="badge badge-danger">
            ⚠ Tampering Detected - chain broken at entry #{verification.broken_at}
          </div>
        )}
      </div>

      <div className="panel">
        <h3>Member Risk Overview</h3>
        <div className="chip-row">
          {members.length === 0 && <p className="muted">No members yet. Load demo data to see members.</p>}
          {members.map((m) => (
            <span key={m.member_id} className="chip">
              {m.member_id} - {m.name}
            </span>
          ))}
        </div>
        <p className="muted">Open the Risk Score tab to view each member's default-risk score.</p>
      </div>

      <div className="panel">
        <h3>Recent Transactions</h3>
        {recent.length === 0 && <p className="muted">No transactions yet.</p>}
        {recent.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>Entry ID</th>
                <th>Member</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((e) => (
                <tr key={e.entry_id}>
                  <td>{e.entry_id}</td>
                  <td>{e.member_id}</td>
                  <td>
                    <span className={`badge-inline ${e.transaction_type === 'Payout' ? 'badge-inline-payout' : 'badge-inline-contribution'}`}>
                      {e.transaction_type}
                    </span>
                  </td>
                  <td>₹{e.amount.toLocaleString('en-IN')}</td>
                  <td>{new Date(e.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value }) {
  return (
    <div className="stat-card">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}
