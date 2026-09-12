import { useEffect, useState } from 'react'
import { api } from '../api.js'

function shortHash(hash) {
  if (!hash) return ''
  return `${hash.slice(0, 8)}...${hash.slice(-8)}`
}

export default function Ledger({ refreshKey }) {
  const [entries, setEntries] = useState([])
  const [verification, setVerification] = useState(null)
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState(null)

  const loadEntries = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.getLedger()
      setEntries(res.entries)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEntries()
  }, [refreshKey])

  const handleVerify = async () => {
    setVerifying(true)
    setError(null)
    try {
      const res = await api.verifyLedger()
      setVerification(res)
      await loadEntries()
    } catch (err) {
      setError(err.message)
    } finally {
      setVerifying(false)
    }
  }

  const statusById = {}
  if (verification) {
    verification.details.forEach((d) => {
      statusById[d.entry_id] = d.valid
    })
  }

  return (
    <div className="page">
      <div className="page-header-row">
        <h2>Digital Ledger</h2>
        <button className="btn btn-primary" onClick={handleVerify} disabled={verifying}>
          {verifying ? 'Verifying...' : 'Verify Ledger Integrity'}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {verification && verification.valid && (
        <div className="badge badge-success">✓ Ledger Verified - all {verification.total_entries} entries intact</div>
      )}
      {verification && !verification.valid && (
        <div className="badge badge-danger">
          ⚠ Tampering Detected - first invalid entry is #{verification.broken_at}
        </div>
      )}

      <div className="panel">
        {loading && <p className="muted">Loading ledger...</p>}
        {!loading && entries.length === 0 && (
          <p className="muted">No ledger entries yet. Load demo data from the Dashboard tab, or add a transaction.</p>
        )}
        {!loading && entries.length > 0 && (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Entry ID</th>
                  <th>Member ID</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Timestamp</th>
                  <th>Previous Hash</th>
                  <th>Current Hash</th>
                  <th>Integrity</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => {
                  const isValid = verification ? statusById[e.entry_id] : e.integrity_status === 'valid'
                  return (
                    <tr key={e.entry_id} className={isValid ? '' : 'row-invalid'}>
                      <td>{e.entry_id}</td>
                      <td>{e.member_id}</td>
                      <td>
                        <span className={`badge-inline ${e.transaction_type === 'Payout' ? 'badge-inline-payout' : 'badge-inline-contribution'}`}>
                          {e.transaction_type}
                        </span>
                      </td>
                      <td>₹{e.amount.toLocaleString('en-IN')}</td>
                      <td>{new Date(e.timestamp).toLocaleString()}</td>
                      <td className="mono" title={e.previous_hash}>{shortHash(e.previous_hash)}</td>
                      <td className="mono" title={e.current_hash}>{shortHash(e.current_hash)}</td>
                      <td>
                        {isValid ? (
                          <span className="badge-inline badge-inline-ok">Valid</span>
                        ) : (
                          <span className="badge-inline badge-inline-bad">Invalid</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
