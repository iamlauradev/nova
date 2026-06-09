import { useEffect, useState } from 'react'
import { transactionsApi, accountsApi } from '../api/client'

function fmt(n) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n || 0)
}

function uid() { return 'tx_' + Date.now() + '_' + Math.random().toString(36).slice(2) }

const TYPES = ['income', 'expense', 'transfer-in', 'transfer-out']

const EMPTY_FORM = { accountId: '', type: 'expense', amount: '', description: '', category: '', date: new Date().toISOString().slice(0, 10), notes: '', tags: '' }

export default function Transactions() {
  const [txs, setTxs] = useState([])
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [fError, setFError] = useState('')

  const [filters, setFilters] = useState({ accountId: '', type: '', category: '', from: '', to: '' })

  async function load() {
    try {
      const [ts, accs] = await Promise.all([transactionsApi.list(), accountsApi.list()])
      setTxs(ts)
      setAccounts(accs)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const filtered = txs.filter(t => {
    if (filters.accountId && t.accountId !== filters.accountId) return false
    if (filters.type && t.type !== filters.type) return false
    if (filters.category && !t.category?.toLowerCase().includes(filters.category.toLowerCase())) return false
    if (filters.from && t.date < filters.from) return false
    if (filters.to && t.date > filters.to) return false
    return true
  }).sort((a, b) => b.date?.localeCompare(a.date))

  function openCreate() {
    setForm({ ...EMPTY_FORM, accountId: accounts[0]?.id || '' })
    setFError('')
    setModal('create')
  }

  function openEdit(tx) {
    setForm({ accountId: tx.accountId, type: tx.type, amount: tx.amount, description: tx.description || '', category: tx.category || '', date: tx.date || '', notes: tx.notes || '', tags: tx.tags || '' })
    setFError('')
    setModal(tx)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFError('')
    setSaving(true)
    try {
      const payload = { ...form, amount: parseFloat(form.amount) }
      if (modal === 'create') {
        await transactionsApi.create({ id: uid(), ...payload })
      } else {
        await transactionsApi.update(modal.id, payload)
      }
      setModal(null)
      await load()
    } catch (e) {
      setFError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar transacción?')) return
    await transactionsApi.delete(id)
    load()
  }

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))
  const setF = (k) => (e) => setFilters(f => ({ ...f, [k]: e.target.value }))

  if (loading) return <div className="loading">Cargando…</div>
  if (error) return <div className="error-msg" style={{ padding: 24 }}>{error}</div>

  return (
    <div>
      <div className="page-header">
        <h1>Transacciones</h1>
        <button className="btn btn-primary" onClick={openCreate}>+ Nueva</button>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <select value={filters.accountId} onChange={setF('accountId')} style={{ width: 'auto', minWidth: 140 }}>
            <option value="">Todas las cuentas</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <select value={filters.type} onChange={setF('type')} style={{ width: 'auto', minWidth: 120 }}>
            <option value="">Todos los tipos</option>
            {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input placeholder="Categoría…" value={filters.category} onChange={setF('category')} style={{ width: 140 }} />
          <input type="date" value={filters.from} onChange={setF('from')} style={{ width: 140 }} />
          <input type="date" value={filters.to} onChange={setF('to')} style={{ width: 140 }} />
          <button className="btn btn-ghost btn-sm" onClick={() => setFilters({ accountId: '', type: '', category: '', from: '', to: '' })}>Limpiar</button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty">Sin transacciones</div>
      ) : (
        <div className="card">
          <table>
            <thead>
              <tr><th>Fecha</th><th>Cuenta</th><th>Tipo</th><th>Descripción</th><th>Categoría</th><th style={{ textAlign: 'right' }}>Importe</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map(t => {
                const acc = accounts.find(a => a.id === t.accountId)
                return (
                  <tr key={t.id}>
                    <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{t.date}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{acc?.name || t.accountId}</td>
                    <td><span className={`badge badge-${t.type === 'income' ? 'income' : 'expense'}`}>{t.type}</span></td>
                    <td>{t.description || '—'}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{t.category || '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: t.type === 'income' ? 'var(--accent)' : t.type === 'expense' ? 'var(--danger)' : 'var(--text-muted)' }}>
                      {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''}{fmt(t.amount)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(t)}>✎</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(t.id)}>✕</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modal === 'create' ? 'Nueva transacción' : 'Editar transacción'}</h2>
              <button className="modal-close" onClick={() => setModal(null)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Cuenta</label>
                <select value={form.accountId} onChange={set('accountId')} required>
                  <option value="">Selecciona…</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label>Tipo</label>
                  <select value={form.type} onChange={set('type')}>
                    {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Importe</label>
                  <input type="number" step="0.01" min="0" value={form.amount} onChange={set('amount')} required />
                </div>
              </div>
              <div className="form-group">
                <label>Descripción</label>
                <input value={form.description} onChange={set('description')} />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label>Categoría</label>
                  <input value={form.category} onChange={set('category')} />
                </div>
                <div className="form-group">
                  <label>Fecha</label>
                  <input type="date" value={form.date} onChange={set('date')} required />
                </div>
              </div>
              <div className="form-group">
                <label>Notas</label>
                <textarea value={form.notes} onChange={set('notes')} rows={2} />
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
