import { useEffect, useState } from 'react'
import { adminApi } from '../../api/client'

export default function AdminStats() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    adminApi.stats()
      .then(setStats)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading">Cargando…</div>
  if (error) return <div className="error-msg" style={{ padding: 24 }}>{error}</div>

  return (
    <div>
      <div className="page-header"><h1>Estadísticas</h1></div>
      <div className="grid-4">
        <div className="stat-card"><div className="stat-label">Usuarios totales</div><div className="stat-value">{stats.total_users}</div></div>
        <div className="stat-card"><div className="stat-label">Activos 7 días</div><div className="stat-value">{stats.active_7d}</div></div>
        <div className="stat-card"><div className="stat-label">Activos 30 días</div><div className="stat-value">{stats.active_30d}</div></div>
        <div className="stat-card"><div className="stat-label">Transacciones</div><div className="stat-value">{stats.total_transactions}</div></div>
      </div>
    </div>
  )
}
