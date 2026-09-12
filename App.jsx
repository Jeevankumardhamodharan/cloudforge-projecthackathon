import { useState } from 'react'
import Dashboard from './components/Dashboard.jsx'
import Ledger from './components/Ledger.jsx'
import RiskScore from './components/RiskScore.jsx'
import TransactionForm from './components/TransactionForm.jsx'

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'ledger', label: 'Ledger' },
  { id: 'risk', label: 'Risk Score' },
  { id: 'add', label: 'Add Transaction' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [refreshKey, setRefreshKey] = useState(0)

  const triggerRefresh = () => setRefreshKey((k) => k + 1)

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark">S</span>
          <div>
            <h1>Sanchay</h1>
            <p className="brand-subtitle">Trust Engine for Chit Funds</p>
          </div>
        </div>
        <nav className="tab-nav">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="app-main">
        {activeTab === 'dashboard' && (
          <Dashboard refreshKey={refreshKey} onDataChanged={triggerRefresh} />
        )}
        {activeTab === 'ledger' && <Ledger refreshKey={refreshKey} />}
        {activeTab === 'risk' && <RiskScore refreshKey={refreshKey} />}
        {activeTab === 'add' && (
          <TransactionForm onSuccess={triggerRefresh} />
        )}
      </main>

      <footer className="app-footer">
        Prototype only - risk scores are illustrative and are not a real lending/credit decision.
      </footer>
    </div>
  )
}
