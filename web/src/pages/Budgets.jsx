import { useEffect, useState } from 'react'
import { budgetsApi, transactionsApi } from '../api/client'

function fmt(n) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n || 0)
}
function uid() { return 'bud_' + Date.now() + '_' + Math.random().toString(36).slice(2) }
function pct(a, b) { return b > 0 ? Math.min(100, Math.round((a / b) * 100)) : 0 }

const EMPTY = { categoryId: '', amount: '', period: 'monthly' }

export default function Budgets() {
  const [budgets, setBudgets] = useState([])
  const [txs, setTxs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [fError, setFError] = useState('')

  async function load() {
    try {
      const [bs, ts] = await Promise.all([budgetsApi.list(), transactionsApi.list()])
      setBudgets(bs); setTxs(ts)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const now = new Date()
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const spentByCategory = txs
    .filter(t => t.type === 'expense' && t.date?.startsWith(monthPrefix))
    .reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + parseFloat(t.amount); return acc }, {})

  function openCreate() { setForm(EMPTY); setFError(''); setModal('create') }
  function openEdit(b) { setForm({ categoryId: b.categoryId, amount: b.amount, period: b.period }); setFError(''); setModal(b) }

  async function handleSubmit(e) {
    e.preventDefault(); setFError(''); setSaving(true)
    try {
      await budgetsApi.create({ id: uid(), ...form, amount: parseFloat(form.amount) })
      setModal(null); await load()
    } catch (e) { setFError(e.message) }
    finally { setSaving(false) }
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar presupuesto?')) return
    await budgetsApi.delete(id); load()
  }

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  if (loading) return <div className="loading">Cargando…</div>
  if (error) return <div className="error-msg" style={{ padding: 24 }}>{error}</div>

  return (
    <div>
      <div className="page-header">
        <h1>Presupuestos</h1>
        <button className="btn btn-primary" onClick={openCreate}>+ Nuevo</button>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 16 }}>Gasto real vs presupuestado — mes actual</p>

      {budgets.length === 0 ? <div className="empty">Sin presupuestos</div> : (
        <div className="grid-2">
          {budgets.map(b => {
            const spent = spentByCategory[b.categoryId] || 0
            const p = pct(spent, parseFloat(b.amount))
            const over = spent > parseFloat(b.amount)
            return (
              <div key={b.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <strong>{b.categoryId}</strong>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{b.period}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: over ? 'var(--danger)' : 'var(--text)' }}>{fmt(spent)}</span>
                  <span style={{ color: 'var(--text-muted)' }}>/ {fmt(b.amount)}</span>
                </div>
                <div className="progress-bar" style={{ marginBottom: 12 }}>
                  <div className={`progress-fill ${over ? 'over' : ''}`} style={{ width: p + '%' }} />
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => openEdit(b)}>✎</button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(b.id)}>✕</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modal === 'create' ? 'Nuevo presupuesto' : 'Editar presupuesto'}</h2>
              <button className="modal-close" onClick={() => setModal(null)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group"><label>Categoría</label><input value={form.categoryId} onChange={set('categoryId')} required placeholder="ej: alimentación" /></div>
              <div className="grid-2">
                <div className="form-group"><label>Importe</label><input type="number" step="0.01" min="0.01" value={form.amount} onChange={set('amount')} required /></div>
                <div className="form-group"><label>Periodo</label>
                  <select value={form.period} onChange={set('period')}>
                    <option value="monthly">Mensual</option>
                    <option value="yearly">Anual</option>
                  </select>
                </div>
              </div>
              {fError && <p className="error-msg" style={{ marginBottom: 12 }}>{fError}</p>}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
