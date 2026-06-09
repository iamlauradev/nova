import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authApi } from '../api/client'

export default function Register() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await authApi.register(form)
      localStorage.setItem('nova_refresh', data.refreshToken)
      login(data.token, data.user)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <form onSubmit={handleSubmit}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>Crear cuenta</h1>
      <div className="form-group">
        <label>Nombre</label>
        <input value={form.name} onChange={set('name')} required />
      </div>
      <div className="form-group">
        <label>Usuario</label>
        <input value={form.username} onChange={set('username')} required minLength={3} />
      </div>
      <div className="form-group">
        <label>Email (opcional)</label>
        <input type="email" value={form.email} onChange={set('email')} />
      </div>
      <div className="form-group">
        <label>Contraseña</label>
        <input type="password" value={form.password} onChange={set('password')} required minLength={8} />
      </div>
      {error && <p className="error-msg" style={{ marginBottom: 12 }}>{error}</p>}
      <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
        {loading ? 'Creando…' : 'Crear cuenta'}
      </button>
      <div className="auth-links">
        <Link to="/login">¿Ya tienes cuenta? Entra</Link>
      </div>
    </form>
  )
}
