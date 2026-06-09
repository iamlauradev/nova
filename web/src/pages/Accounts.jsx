import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { accountsApi } from '../api/client'

function fmt(n) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n || 0)
}

function uid() { return 'acc_' + Date.now() + '_' + Math.random().toString(36).slice(2) }

const TYPES = ['checking', 'savings', 'cash', 'investment', 'other']

export default function Accounts() {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ name: '', type: 'checking', balance: '', color: '' })
  const [saving, setSaving] = useState(false)
  const [fError, setFError] = useState('')
  const navigate = useNavigate()

  async function load() {
    try { setAccounts(await accountsApi.list()) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setForm({ name: '', type: 'checking', balance: '', color: '' })
    setFError('')
    setModal('create')
  }

  function openEdit(acc) {
    setForm({ name: acc.name, type: acc.type, balance: acc.balance, color: acc.color || '' })
    setModal(acc)
    setFError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFError('')
    setSaving(true)
    try {
      if (modal === 'create') {
        await accountsApi.create({ id: uid(), ...form, balance: parseFloat(form.balance) || 0 })
      } else {
        await accountsApi.update(modal.id, form)
      }
      setModal(null)
      await load()
    } catch (e) {
      setFError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleArchive(id) {
    if (!confirm('¿Archivar esta cuenta?')) return
    await accountsApi.archive(id)
    load()
  }

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  if (loading) return <div className="loading">Cargando…</div>
  if (error) return <div className="error-msg" style={{ padding: 24 }}>{error}</div>

  return (
    <div>
      <div className="page-header">
        <h1>Cuentas</h1>
        <button className="btn btn-primary" onClick={openCreate}>+ Nueva cuenta</button>
      </div>

      {accounts.length === 0 ? (
        <div className="empty">Sin cuentas. Crea la primera.</div>
      ) : (
        <div className="grid-3">
          {accounts.map(a => (
            <div key={a.id} className="card" style={{ cursor: 'pointer' }} onClick={() => navigate(`/accounts/${a.id}`)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{a.name}</div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{a.type}</span>
                </div>
                {a.color && <span style={{ width: 12, height: 12, borderRadius: '50%', background: a.color, display: 'inline-block', marginTop: 4 }} />}
              </div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{fmt(a.balance)}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }} onClick={e => e.stopPropagation()}>
                <button className="btn btn-ghost btn-sm" onClick={() => openEdit(a)}>Editar</button>
                <button className="btn btn-danger btn-sm" onClick={() => handleArchive(a.id)}>Archivar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modal === 'create' ? 'Nueva cuenta' : 'Editar cuenta'}</h2>
              <button className="modal-close" onClick={() => setModal(null)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nombre</label>
                <input value={form.name} onChange={set('name')} required />
              </div>
              <div className="form-group">
                <label>Tipo</label>
                <select value={form.type} onChange={set('type')}>
                  {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              {modal === 'create' && (
                <div className="form-group">
                  <label>Saldo inicial</label>
                  <input type="number" step="0.01" value={form.balance} onChange={set('balance')} />
                </div>
              )}
              <div className="form-group">
                <label>Color (hex)</label>
                <input value={form.color} onChange={set('color')} placeholder="#6366F1" />
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
