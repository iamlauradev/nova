import { useEffect, useState } from 'react'
import { savingsApi, accountsApi } from '../api/client'

function fmt(n) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n || 0)
}
function uid() { return 'sav_' + Date.now() + '_' + Math.random().toString(36).slice(2) }

const EMPTY = { name: '', fromAccountId: '', toAccountId: '', amount: '', dayOfMonth: '1' }

export default function Savings() {
  const [items, setItems] = useState([])
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [fError, setFError] = useState('')

  async function load() {
    try {
      const [ss, accs] = await Promise.all([savingsApi.list(), accountsApi.list()])
      setItems(ss); setAccounts(accs)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setForm({ ...EMPTY, fromAccountId: accounts[0]?.id || '', toAccountId: accounts[1]?.id || accounts[0]?.id || '' })
    setFError(''); setModal('create')
  }
  function openEdit(item) {
    setForm({ name: item.name, fromAccountId: item.fromAccountId, toAccountId: item.toAccountId, amount: item.amount, dayOfMonth: item.dayOfMonth })
    setFError(''); setModal(item)
  }

  async function handleSubmit(e) {
    e.preventDefault(); setFError(''); setSaving(true)
    try {
      const payload = { ...form, amount: parseFloat(form.amount), dayOfMonth: parseInt(form.dayOfMonth) }
      if (modal === 'create') await savingsApi.create({ id: uid(), ...payload })
      else await savingsApi.update(modal.id, { ...payload, active: modal.active })
      setModal(null); await load()
    } catch (e) { setFError(e.message) }
    finally { setSaving(false) }
  }

  async function handleToggle(item) {
    await savingsApi.update(item.id, { name: item.name, fromAccountId: item.fromAccountId, toAccountId: item.toAccountId, amount: parseFloat(item.amount), dayOfMonth: item.dayOfMonth, active: !item.active })
    load()
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar?')) return
    await savingsApi.delete(id); load()
  }

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))
  const accName = (id) => accounts.find(a => a.id === id)?.name || id

  if (loading) return <div className="loading">Cargando…</div>
  if (error) return <div className="error-msg" style={{ padding: 24 }}>{error}</div>

  return (
    <div>
      <div className="page-header">
        <h1>Planes de ahorro</h1>
        <button className="btn btn-primary" onClick={openCreate}>+ Nuevo</button>
      </div>

      {items.length === 0 ? <div className="empty">Sin planes de ahorro</div> : (
        <div className="card">
          <table>
            <thead>
              <tr><th>Nombre</th><th>Desde</th><th>Hacia</th><th>Importe</th><th>Día</th><th>Estado</th><th></th></tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{accName(item.fromAccountId)}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{accName(item.toAccountId)}</td>
                  <td style={{ fontWeight: 600 }}>{fmt(item.amount)}</td>
                  <td style={{ color: 'var(--text-muted)' }}>día {item.dayOfMonth}</td>
                  <td><span className={`badge badge-${item.active ? 'active' : 'inactive'}`}>{item.active ? 'activo' : 'pausado'}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleToggle(item)}>{item.active ? 'Pausar' : 'Activar'}</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(item)}>✎</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(item.id)}>✕</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modal === 'create' ? 'Nuevo plan' : 'Editar plan'}</h2>
              <button className="modal-close" onClick={() => setModal(null)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group"><label>Nombre</label><input value={form.name} onChange={set('name')} required /></div>
              <div className="grid-2">
                <div className="form-group"><label>Desde</label>
                  <select value={form.fromAccountId} onChange={set('fromAccountId')}>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Hacia</label>
                  <select value={form.toAccountId} onChange={set('toAccountId')}>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group"><label>Importe</label><input type="number" step="0.01" min="0.01" value={form.amount} onChange={set('amount')} required /></div>
                <div className="form-group"><label>Día del mes</label><input type="number" min="1" max="31" value={form.dayOfMonth} onChange={set('dayOfMonth')} /></div>
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
