import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { authApi } from '../api/client'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (password !== confirm) return setError('Las contraseñas no coinciden')
    setError('')
    setLoading(true)
    try {
      await authApi.resetPassword({ token, password })
      navigate('/login', { state: { message: 'Contraseña actualizada. Ya puedes entrar.' } })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!token) return (
    <div>
      <p className="error-msg">Token inválido.</p>
      <div className="auth-links"><Link to="/login">Volver al login</Link></div>
    </div>
  )

  return (
    <form onSubmit={handleSubmit}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>Nueva contraseña</h1>
      <div className="form-group">
        <label>Nueva contraseña</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} autoFocus />
      </div>
      <div className="form-group">
        <label>Confirmar contraseña</label>
        <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
      </div>
      {error && <p className="error-msg" style={{ marginBottom: 12 }}>{error}</p>}
      <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
        {loading ? 'Guardando…' : 'Guardar contraseña'}
      </button>
    </form>
  )
}
