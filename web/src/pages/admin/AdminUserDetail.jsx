import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { adminApi } from '../../api/client'

function fmt(n) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n || 0)
}

export default function AdminUserDetail() {
  const { id } = useParams()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    try { setUser(await adminApi.user(id)) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [id])

  async function handleSuspend() {
    await adminApi.suspend(id); load()
  }

  async function handleReset() {
    if (!user.email) return alert('El usuario no tiene email')
    await adminApi.resetPassword(id)
    alert('Email de reset enviado')
  }

  if (loading) return <div className="loading">Cargando…</div>
  if (error) return <div className="error-msg" style={{ padding: 24 }}>{error}</div>

  return (
    <div>
      <div className="page-header">
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}><Link to="/admin/users">← Usuarios</Link></div>
          <h1>{user.username}</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={handleReset}>Enviar reset password</button>
          <button className={`btn ${user.is_active ? 'btn-danger' : 'btn-accent'}`} onClick={handleSuspend}>
            {user.is_active ? 'Suspender' : 'Activar'}
          </button>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 16 }}>
        <div className="card">
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Info</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>ID</span><span>{user.id}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Email</span><span>{user.email || '—'}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Admin</span><span>{user.is_admin ? 'Sí' : 'No'}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Estado</span><span className={`badge badge-${user.is_active ? 'active' : 'inactive'}`}>{user.is_active ? 'activo' : 'suspendido'}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Registro</span><span>{new Date(user.createdAt).toLocaleDateString('es-ES')}</span></div>
          </div>
        </div>

        <div className="card">
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Últimas transacciones</h2>
          {!user.recent_transactions?.length ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Sin transacciones</p>
          ) : user.recent_transactions.map(t => (
            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: 13 }}>{t.description || t.category || '—'}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.date}</div>
              </div>
              <span style={{ fontWeight: 600, color: t.type === 'income' ? 'var(--accent)' : t.type === 'expense' ? 'var(--danger)' : 'var(--text-muted)' }}>
                {fmt(t.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
