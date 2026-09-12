const API_BASE = 'http://127.0.0.1:8000'

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      detail = body.detail || detail
    } catch (_) {
      // ignore parse errors, fall back to statusText
    }
    throw new Error(detail)
  }
  return res.json()
}

export const api = {
  getLedger: () => request('/ledger'),
  addLedgerEntry: (entry) =>
    request('/ledger', { method: 'POST', body: JSON.stringify(entry) }),
  verifyLedger: () => request('/verify'),
  getRisk: (memberId) => request(`/risk/${encodeURIComponent(memberId)}`),
  getMembers: () => request('/members'),
  seedDemoData: () => request('/seed-demo-data', { method: 'POST' }),
}
