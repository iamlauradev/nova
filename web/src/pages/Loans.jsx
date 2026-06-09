import { useEffect, useState } from 'react'
import { loansApi, accountsApi } from '../api/client'

function fmt(n) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n || 0)
}
function uid() { return 'loan_' + Date.now() + '_' + Math.random().toString(36).slice(2) }
function pct(a, b) { return b > 0 ? Math.min(100, Math.round((a / b) * 100)) : 0 }

const EMPTY = { name: '', totalAmount: '', collectedAmount: '', notes: '', startDate: '', targetDate: '', color: '#10b981', icon: '🤝' }

export default function Loans() {
  const [items, setItems] = useState([])
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [fError, setFError] = useState('')
  const [collectModal, setCollectModal] = useState(null)
  const [collectForm, setCollectForm] = useState({ amount: '', accountId: '', date: new Date().toISOString().slice(0, 10) })

  async function load() {
    try {
      const [ls, accs] = await Promise.all([loansApi.list(), accountsApi.list()])
      setItems(ls)
      setAccounts(accs)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function openCreate() { setForm(EMPTY); setFError(''); setModal('create') }
  function openEdit(item) { setForm({ name: item.name, totalAmount: item.totalAmount, collectedAmount: item.collectedAmount, notes: item.notes || '', startDate: item.startDate || '', targetDate: item.targetDate || '', color: item.color || '#10b981', icon: item.icon || '🤝' }); setFError(''); setModal(item) }

  async function handleSubmit(e) {
    e.preventDefault(); setFError(''); setSaving(true)
    try {
      const payload = { ...form, totalAmount: parseFloat(form.totalAmount), collectedAmount: parseFloat(form.collectedAmount) || 0 }
      if (modal === 'create') await loansApi.create({ id: uid(), ...payload })
      else await loansApi.update(modal.id, { ...payload, active: modal.active })
      setModal(null); await load()
    } catch (e) { setFError(e.message) }
    finally { setSaving(false) }
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar préstamo?')) return
    await loansApi.delete(id); load()
  }

  async function handleCollect(e) {
    e.preventDefault(); setSaving(true)
    try {
      await loansApi.collect(collectModal.id, { amount: parseFloat(collectForm.amount), accountId: collectForm.accountId, date: collectForm.date })
      setCollectModal(null); await load()
    } catch (e) { setFError(e.message) }
    finally { setSaving(false) }
  }

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  if (loading) return <div className="loading">Cargando…</div>
  if (error) return <div className="error-msg" style={{ padding: 24 }}>{error}</div>

  return (
    <div>
      <div className="page-header">
        <h1>Préstamos</h1>
        <button className="btn btn-primary" onClick={openCreate}>+ Nuevo</button>
      </div>

      {items.length === 0 ? <div className="empty">Sin préstamos</div> : (
        <div className="grid-3">
          {items.map(item => {
            const p = pct(parseFloat(item.collectedAmount), parseFloat(item.totalAmount))
            return (
              <div key={item.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div>
                    <span style={{ marginRight: 8 }}>{item.icon}</span>
                    <strong>{item.name}</strong>
                  </div>
                  <span className={`badge badge-${item.active ? 'active' : 'inactive'}`}>{item.active ? 'activo' : 'completado'}</span>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span>{fmt(item.collectedAmount)} / {fmt(item.totalAmount)}</span>
                    <span>{p}%</span>
                  </div>
                  <div className="progress-bar"><div className="progress-fill" style={{ width: p + '%', background: item.color || 'var(--accent)' }} /></div>
                </div>
                {item.notes && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>{item.notes}</p>}
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-accent btn-sm" onClick={() => { setCollectModal(item); setCollectForm({ amount: '', accountId: accounts[0]?.id || '', date: new Date().toISOString().slice(0, 10) }) }}>Cobrar</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => openEdit(item)}>Editar</button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(item.id)}>✕</button>
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
              <h2>{modal === 'create' ? 'Nuevo préstamo' : 'Editar préstamo'}</h2>
              <button className="modal-close" onClick={() => setModal(null)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group"><label>Nombre</label><input value={form.name} onChange={set('name')} required /></div>
              <div className="grid-2">
                <div className="form-group"><label>Total</label><input type="number" step="0.01" min="0.01" value={form.totalAmount} onChange={set('totalAmount')} required /></div>
                <div className="form-group"><label>Cobrado</label><input type="number" step="0.01" min="0" value={form.collectedAmount} onChange={set('collectedAmount')} /></div>
              </div>
              <div className="grid-2">
                <div className="form-group"><label>Inicio</label><input type="date" value={form.startDate} onChange={set('startDate')} /></div>
                <div className="form-group"><label>Vencimiento</label><input type="date" value={form.targetDate} onChange={set('targetDate')} /></div>
              </div>
              <div className="form-group"><label>Notas</label><textarea value={form.notes} onChange={set('notes')} rows={2} /></div>
              {fError && <p className="error-msg" style={{ marginBottom: 12 }}>{fError}</p>}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {collectModal && (
        <div className="modal-overlay" onClick={() => setCollectModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Cobrar: {collectModal.name}</h2>
              <button className="modal-close" onClick={() => setCollectModal(null)}>×</button>
            </div>
            <form onSubmit={handleCollect}>
              <div className="form-group"><label>Importe</label><input type="number" step="0.01" min="0.01" value={collectForm.amount} onChange={e => setCollectForm(f => ({ ...f, amount: e.target.value }))} required /></div>
              <div className="form-group"><label>Cuenta</label>
                <select value={collectForm.accountId} onChange={e => setCollectForm(f => ({ ...f, accountId: e.target.value }))}>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div className="form-group"><label>Fecha</label><input type="date" value={collectForm.date} onChange={e => setCollectForm(f => ({ ...f, date: e.target.value }))} /></div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setCollectModal(null)}>Cancelar</button>
                <button type="submit" className="btn btn-accent" disabled={saving}>Cobrar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
