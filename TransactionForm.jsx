import { useState } from 'react'
import { api } from '../api.js'

const initialState = {
  group_id: 'GRP-101',
  member_id: '',
  transaction_type: 'Contribution',
  amount: '',
  note: '',
}

export default function TransactionForm({ onSuccess }) {
  const [form, setForm] = useState(initialState)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!form.member_id.trim() || !form.amount) {
      setError('Member ID and amount are required.')
      return
    }
    const amountNum = parseFloat(form.amount)
    if (Number.isNaN(amountNum) || amountNum <= 0) {
      setError('Amount must be a positive number.')
      return
    }

    setSubmitting(true)
    try {
      const entry = await api.addLedgerEntry({
        group_id: form.group_id.trim(),
        member_id: form.member_id.trim(),
        transaction_type: form.transaction_type,
        amount: amountNum,
        note: form.note.trim(),
      })
      setSuccess(`Entry #${entry.entry_id} added and chained into the ledger.`)
      setForm({ ...initialState, group_id: form.group_id })
      onSuccess && onSuccess()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page">
      <h2>Add Transaction</h2>
      <p className="muted">
        New entries are appended to the hash chain: each one links to the previous entry's hash,
        so any later edit to this record will be detectable via "Verify Ledger Integrity".
      </p>

      <form className="panel form-grid" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Group ID</label>
          <input type="text" value={form.group_id} onChange={update('group_id')} />
        </div>

        <div className="form-group">
          <label>Member ID</label>
          <input
            type="text"
            placeholder="e.g. MBR-001"
            value={form.member_id}
            onChange={update('member_id')}
          />
        </div>

        <div className="form-group">
          <label>Transaction Type</label>
          <select value={form.transaction_type} onChange={update('transaction_type')}>
            <option value="Contribution">Contribution</option>
            <option value="Payout">Payout</option>
          </select>
        </div>

        <div className="form-group">
          <label>Amount (₹)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="5000"
            value={form.amount}
            onChange={update('amount')}
          />
        </div>

        <div className="form-group form-group-wide">
          <label>Note</label>
          <input
            type="text"
            placeholder="Optional note"
            value={form.note}
            onChange={update('note')}
          />
        </div>

        {error && <div className="alert alert-error form-group-wide">{error}</div>}
        {success && <div className="alert alert-success form-group-wide">{success}</div>}

        <div className="form-group-wide">
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Adding...' : 'Add Ledger Entry'}
          </button>
        </div>
      </form>
    </div>
  )
}
