import { useEffect, useState } from 'react'
import { api } from '../api.js'

function riskBadgeClass(level) {
  if (level === 'Low') return 'badge-inline-ok'
  if (level === 'Medium') return 'badge-inline-warn'
  return 'badge-inline-bad'
}

export default function RiskScore({ refreshKey }) {
  const [members, setMembers] = useState([])
  const [selectedMember, setSelectedMember] = useState('')
  const [manualId, setManualId] = useState('')
  const [risk, setRisk] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.getMembers().then((res) => {
      setMembers(res.members)
      if (res.members.length > 0 && !selectedMember) {
        setSelectedMember(res.members[0].member_id)
      }
    }).catch((err) => setError(err.message))
  }, [refreshKey])

  const fetchRisk = async (memberId) => {
    if (!memberId) return
    setLoading(true)
    setError(null)
    setRisk(null)
    try {
      const res = await api.getRisk(memberId)
      setRisk(res)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectChange = (e) => {
    setSelectedMember(e.target.value)
    fetchRisk(e.target.value)
  }

  const handleManualLookup = (e) => {
    e.preventDefault()
    fetchRisk(manualId.trim())
  }

  return (
    <div className="page">
      <h2>Member Risk Score</h2>
      <p className="muted">
        Risk is estimated from each member's contribution history using a Kaplan-Meier
        survival-analysis model: it tracks the probability a member keeps paying on time,
        cycle after cycle. This is a transparent, explainable estimate - not a black box.
      </p>

      <div className="panel">
        <div className="risk-controls">
          <div className="form-group">
            <label>Select a demo member</label>
            <select value={selectedMember} onChange={handleSelectChange}>
              <option value="">-- choose --</option>
              {members.map((m) => (
                <option key={m.member_id} value={m.member_id}>
                  {m.member_id} - {m.name}
                </option>
              ))}
            </select>
          </div>

          <form className="form-group" onSubmit={handleManualLookup}>
            <label>Or enter any Member ID</label>
            <div className="inline-form">
              <input
                type="text"
                placeholder="e.g. MBR-001"
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
              />
              <button className="btn btn-secondary" type="submit">Lookup</button>
            </div>
          </form>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {loading && <div className="panel">Calculating risk score...</div>}

      {risk && (
        <div className="panel risk-result">
          <div className="risk-result-header">
            <div>
              <h3>{risk.member_id}</h3>
              <span className={`badge-inline ${riskBadgeClass(risk.risk_level)}`}>
                {risk.risk_level} Risk
              </span>
            </div>
            <div className="risk-score-display">
              <div className="risk-score-number">{(risk.risk_score * 100).toFixed(1)}%</div>
              <div className="stat-label">Default-Risk Score</div>
            </div>
          </div>

          <div className="stat-grid stat-grid-compact">
            <StatCard label="Contributions" value={risk.n_contributions} />
            <StatCard label="On-Time" value={risk.n_on_time} />
            <StatCard label="Missed / Late" value={risk.n_missed} />
            <StatCard label="On-Time Rate" value={`${(risk.on_time_rate * 100).toFixed(1)}%`} />
          </div>

          <div className="explanation-box">
            <h4>Why this score?</h4>
            <p>{risk.explanation}</p>
          </div>
        </div>
      )}
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
