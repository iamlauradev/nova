import { useEffect, useState } from 'react'
import { recurringApi, accountsApi } from '../api/client'

function fmt(n) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n || 0)
}
function uid() { return 'rec_' + Date.now() + '_' + Math.random().toString(36).slice(2) }

const TYPES = ['income', 'expense']
const FREQS = ['monthly', 'weekly', 'biweekly', 'quarterly', 'yearly', 'custom']
const EMPTY = { name: '', type: 'expense', amount: '', category: '', accountId: '', frequency: 'monthly', dayOfMonth: '', notes: '' }

export default function Recurring() {
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
      const [rs, accs] = await Promise.all([recurringApi.list(), accountsApi.list()])
      setItems(rs); setAccounts(accs)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function openCreate() { setForm({ ...EMPTY, accountId: accounts[0]?.id || '' }); setFError(''); setModal('create') }
  function openEdit(item) { setForm({ name: item.name, type: item.type, amount: item.amount, category: item.category || '', accountId: item.accountId || '', frequency: item.frequency || 'monthly', dayOfMonth: item.dayOfMonth || '', notes: item.notes || '' }); setFError(''); setModal(item) }

  async function handleSubmit(e) {
    e.preventDefault(); setFError(''); setSaving(true)
    try {
      const payload = { ...form, amount: parseFloat(form.amount) }
      if (modal === 'create') await recurringApi.create({ id: uid(), ...payload })
      else await recurringApi.update(modal.id, { ...payload, active: modal.active })
      setModal(null); await load()
    } catch (e) { setFError(e.message) }
    finally { setSaving(false) }
  }

  async function handleToggle(item) {
    await recurringApi.update(item.id, { name: item.name, type: item.type, amount: parseFloat(item.amount), category: item.category || '', accountId: item.accountId || '', frequency: item.frequency, dayOfMonth: item.dayOfMonth || '', notes: item.notes || '', active: !item.active })
    load()
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar item recurrente?')) return
    await recurringApi.delete(id); load()
  }

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))
  const accName = (id) => accounts.find(a => a.id === id)?.name || id

  if (loading) return <div className="loading">Cargando…</div>
  if (error) return <div className="error-msg" style={{ padding: 24 }}>{error}</div>

  return (
    <div>
      <div className="page-header">
        <h1>Recurrentes</h1>
        <button className="btn btn-primary" onClick={openCreate}>+ Nuevo</button>
      </div>

      {items.length === 0 ? <div className="empty">Sin items recurrentes</div> : (
        <div className="card">
          <table>
            <thead>
              <tr><th>Nombre</th><th>Tipo</th><th>Importe</th><th>Frecuencia</th><th>Día</th><th>Cuenta</th><th>Estado</th><th></th></tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td><span className={`badge badge-${item.type === 'income' ? 'income' : 'expense'}`}>{item.type}</span></td>
                  <td style={{ fontWeight: 600 }}>{fmt(item.amount)}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{item.frequency}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{item.dayOfMonth || '—'}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{item.accountId ? accName(item.accountId) : '—'}</td>
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
              <h2>{modal === 'create' ? 'Nuevo recurrente' : 'Editar recurrente'}</h2>
              <button className="modal-close" onClick={() => setModal(null)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group"><label>Nombre</label><input value={form.name} onChange={set('name')} required /></div>
              <div className="grid-2">
                <div className="form-group"><label>Tipo</label>
                  <select value={form.type} onChange={set('type')}>
                    {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Importe</label><input type="number" step="0.01" min="0.01" value={form.amount} onChange={set('amount')} required /></div>
              </div>
              <div className="grid-2">
                <div className="form-group"><label>Categoría</label><input value={form.category} onChange={set('category')} /></div>
                <div className="form-group"><label>Cuenta</label>
                  <select value={form.accountId} onChange={set('accountId')}>
                    <option value="">—</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group"><label>Frecuencia</label>
                  <select value={form.frequency} onChange={set('frequency')}>
                    {FREQS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Día del mes</label><input value={form.dayOfMonth} onChange={set('dayOfMonth')} placeholder="1-31" /></div>
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
    </div>
  )
}
