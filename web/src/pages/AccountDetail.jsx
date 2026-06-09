import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { accountsApi, transactionsApi } from '../api/client'

function fmt(n) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n || 0)
}

export default function AccountDetail() {
  const { id } = useParams()
  const [account, setAccount] = useState(null)
  const [txs, setTxs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([accountsApi.list(), transactionsApi.list()])
      .then(([accs, ts]) => {
        const acc = accs.find(a => a.id === id)
        if (!acc) { setError('Cuenta no encontrada'); return }
        setAccount(acc)
        setTxs(ts.filter(t => t.accountId === id).sort((a, b) => b.date?.localeCompare(a.date)))
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="loading">Cargando…</div>
  if (error) return <div className="error-msg" style={{ padding: 24 }}>{error}</div>

  return (
    <div>
      <div className="page-header">
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
            <Link to="/accounts">← Cuentas</Link>
          </div>
          <h1>{account.name}</h1>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{fmt(account.balance)}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{account.type}</div>
        </div>
      </div>

      <div className="card">
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Transacciones</h2>
        {txs.length === 0 ? (
          <p className="empty" style={{ padding: 16 }}>Sin transacciones en esta cuenta</p>
        ) : (
          <table>
            <thead>
              <tr><th>Fecha</th><th>Descripción</th><th>Categoría</th><th>Tipo</th><th style={{ textAlign: 'right' }}>Importe</th></tr>
            </thead>
            <tbody>
              {txs.map(t => (
                <tr key={t.id}>
                  <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{t.date}</td>
                  <td>{t.description || '—'}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{t.category || '—'}</td>
                  <td><span className={`badge badge-${t.type === 'income' ? 'income' : 'expense'}`}>{t.type}</span></td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: t.type === 'income' ? 'var(--accent)' : t.type === 'expense' ? 'var(--danger)' : 'var(--text-muted)' }}>
                    {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''}{fmt(t.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
