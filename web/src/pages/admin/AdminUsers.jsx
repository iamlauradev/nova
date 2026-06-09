import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminApi } from '../../api/client'

export default function AdminUsers() {
  const [data, setData] = useState({ users: [], total: 0, page: 1 })
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load(p = page, s = search) {
    setLoading(true)
    try {
      const res = await adminApi.users({ page: p, limit: 20, ...(s ? { search: s } : {}) })
      setData(res)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load(1, '') }, [])

  function handleSearch(e) {
    e.preventDefault()
    setPage(1)
    load(1, search)
  }

  async function handleSuspend(user) {
    await adminApi.suspend(user.id)
    load(page, search)
  }

  async function handleReset(user) {
    if (!user.email) return alert('El usuario no tiene email')
    await adminApi.resetPassword(user.id)
    alert('Email de reset enviado')
  }

  function goPage(p) { setPage(p); load(p, search) }

  const totalPages = Math.ceil(data.total / 20)

  return (
    <div>
      <div className="page-header"><h1>Usuarios</h1></div>

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por usuario o email…" style={{ maxWidth: 320 }} />
        <button type="submit" className="btn btn-primary btn-sm">Buscar</button>
        {search && <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setPage(1); load(1, '') }}>Limpiar</button>}
      </form>

      {loading ? <div className="loading">Cargando…</div> : error ? <div className="error-msg">{error}</div> : (
        <>
          <div className="card">
            <table>
              <thead>
                <tr><th>ID</th><th>Usuario</th><th>Email</th><th>Admin</th><th>Estado</th><th>Transacciones</th><th>Registro</th><th></th></tr>
              </thead>
              <tbody>
                {data.users.map(u => (
                  <tr key={u.id}>
                    <td style={{ color: 'var(--text-muted)' }}>{u.id}</td>
                    <td><Link to={`/admin/users/${u.id}`}>{u.username}</Link></td>
                    <td style={{ color: 'var(--text-muted)' }}>{u.email || '—'}</td>
                    <td>{u.is_admin ? <span className="badge badge-income">admin</span> : '—'}</td>
                    <td><span className={`badge badge-${u.is_active ? 'active' : 'inactive'}`}>{u.is_active ? 'activo' : 'suspendido'}</span></td>
                    <td style={{ color: 'var(--text-muted)' }}>{u.transaction_count}</td>
                    <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{new Date(u.createdAt).toLocaleDateString('es-ES')}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleReset(u)} title="Enviar email reset">↻</button>
                        <button className={`btn btn-sm ${u.is_active ? 'btn-danger' : 'btn-accent'}`} onClick={() => handleSuspend(u)}>
                          {u.is_active ? 'Suspender' : 'Activar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => goPage(page - 1)}>←</button>
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{page} / {totalPages}</span>
              <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => goPage(page + 1)}>→</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
