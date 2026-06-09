import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { accountsApi, transactionsApi } from '../api/client'

function fmt(n) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n || 0)
}

export default function Dashboard() {
  const [accounts, setAccounts] = useState([])
  const [txs, setTxs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([accountsApi.list(), transactionsApi.list()])
      .then(([accs, ts]) => { setAccounts(accs); setTxs(ts) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading">Cargando…</div>
  if (error) return <div className="error-msg" style={{ padding: 24 }}>{error}</div>

  const totalBalance = accounts.reduce((s, a) => s + (parseFloat(a.balance) || 0), 0)

  const now = new Date()
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const monthTxs = txs.filter(t => t.date?.startsWith(monthPrefix))
  const income = monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + parseFloat(t.amount), 0)
  const expense = monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount), 0)
  const recent = [...txs].sort((a, b) => b.date?.localeCompare(a.date)).slice(0, 5)

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
      </div>

      <div className="grid-3" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Balance total</div>
          <div className="stat-value">{fmt(totalBalance)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Ingresos del mes</div>
          <div className="stat-value income">{fmt(income)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Gastos del mes</div>
          <div className="stat-value expense">{fmt(expense)}</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700 }}>Cuentas</h2>
            <Link to="/accounts" style={{ fontSize: 12 }}>Ver todas</Link>
          </div>
          {accounts.length === 0 ? (
            <p className="empty" style={{ padding: '16px 0' }}>Sin cuentas</p>
          ) : accounts.map(a => (
            <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span>{a.name}</span>
              <span style={{ fontWeight: 600 }}>{fmt(a.balance)}</span>
            </div>
          ))}
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700 }}>Últimas transacciones</h2>
            <Link to="/transactions" style={{ fontSize: 12 }}>Ver todas</Link>
          </div>
          {recent.length === 0 ? (
            <p className="empty" style={{ padding: '16px 0' }}>Sin transacciones</p>
          ) : recent.map(t => (
            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: 13 }}>{t.description || t.category || '—'}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.date}</div>
              </div>
              <span style={{ fontWeight: 600, color: t.type === 'income' ? 'var(--accent)' : t.type === 'expense' ? 'var(--danger)' : 'var(--text-muted)' }}>
                {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''}{fmt(t.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
