import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authApi } from '../api/client'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await authApi.login(form)
      localStorage.setItem('nova_refresh', data.refreshToken)
      login(data.token, data.user)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>Iniciar sesión</h1>
      <div className="form-group">
        <label>Usuario</label>
        <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required autoFocus />
      </div>
      <div className="form-group">
        <label>Contraseña</label>
        <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
      </div>
      {error && <p className="error-msg" style={{ marginBottom: 12 }}>{error}</p>}
      <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
        {loading ? 'Entrando…' : 'Entrar'}
      </button>
      <div className="auth-links">
        <Link to="/register">¿No tienes cuenta? Regístrate</Link>
        <Link to="/forgot-password">¿Olvidaste la contraseña?</Link>
      </div>
    </form>
  )
}
