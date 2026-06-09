import { useEffect, useState } from 'react'
import { goalsApi, accountsApi } from '../api/client'

function fmt(n) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n || 0)
}
function uid() { return 'goal_' + Date.now() + '_' + Math.random().toString(36).slice(2) }
function pct(a, b) { return b > 0 ? Math.min(100, Math.round((a / b) * 100)) : 0 }

const EMPTY = { name: '', targetAmount: '', currentAmount: '', targetDate: '', accountId: '', icon: '🎯' }

export default function Goals() {
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
      const [gs, accs] = await Promise.all([goalsApi.list(), accountsApi.list()])
      setItems(gs); setAccounts(accs)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function openCreate() { setForm(EMPTY); setFError(''); setModal('create') }
  function openEdit(item) { setForm({ name: item.name, targetAmount: item.targetAmount, currentAmount: item.currentAmount, targetDate: item.targetDate || '', accountId: item.accountId || '', icon: item.icon || '🎯' }); setFError(''); setModal(item) }

  async function handleSubmit(e) {
    e.preventDefault(); setFError(''); setSaving(true)
    try {
      const payload = { ...form, targetAmount: parseFloat(form.targetAmount), currentAmount: parseFloat(form.currentAmount) || 0 }
      if (modal === 'create') await goalsApi.create({ id: uid(), ...payload })
      else await goalsApi.update(modal.id, payload)
      setModal(null); await load()
    } catch (e) { setFError(e.message) }
    finally { setSaving(false) }
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar meta?')) return
    await goalsApi.delete(id); load()
  }

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  if (loading) return <div className="loading">Cargando…</div>
  if (error) return <div className="error-msg" style={{ padding: 24 }}>{error}</div>

  return (
    <div>
      <div className="page-header">
        <h1>Metas</h1>
        <button className="btn btn-primary" onClick={openCreate}>+ Nueva</button>
      </div>

      {items.length === 0 ? <div className="empty">Sin metas</div> : (
        <div className="grid-3">
          {items.map(item => {
            const p = pct(parseFloat(item.currentAmount), parseFloat(item.targetAmount))
            return (
              <div key={item.id} className="card">
                <div style={{ fontSize: 28, marginBottom: 8 }}>{item.icon}</div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{item.name}</div>
                {item.targetDate && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Objetivo: {item.targetDate}</div>}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span>{fmt(item.currentAmount)} / {fmt(item.targetAmount)}</span>
                    <span>{p}%</span>
                  </div>
                  <div className="progress-bar"><div className="progress-fill" style={{ width: p + '%' }} /></div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
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
              <h2>{modal === 'create' ? 'Nueva meta' : 'Editar meta'}</h2>
              <button className="modal-close" onClick={() => setModal(null)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="grid-2">
                <div className="form-group"><label>Icono</label><input value={form.icon} onChange={set('icon')} /></div>
                <div className="form-group"><label>Nombre</label><input value={form.name} onChange={set('name')} required /></div>
              </div>
              <div className="grid-2">
                <div className="form-group"><label>Objetivo</label><input type="number" step="0.01" min="0.01" value={form.targetAmount} onChange={set('targetAmount')} required /></div>
                <div className="form-group"><label>Actual</label><input type="number" step="0.01" min="0" value={form.currentAmount} onChange={set('currentAmount')} /></div>
              </div>
              <div className="grid-2">
                <div className="form-group"><label>Fecha objetivo</label><input type="date" value={form.targetDate} onChange={set('targetDate')} /></div>
                <div className="form-group"><label>Cuenta</label>
                  <select value={form.accountId} onChange={set('accountId')}>
                    <option value="">—</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
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
