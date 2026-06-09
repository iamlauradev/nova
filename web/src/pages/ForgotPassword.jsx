import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authApi } from '../api/client'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    await authApi.forgotPassword(email).catch(() => {})
    setLoading(false)
    setSent(true)
  }

  if (sent) return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Correo enviado</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
        Si ese email está registrado, recibirás un enlace para restablecer tu contraseña.
      </p>
      <div className="auth-links"><Link to="/login">Volver al login</Link></div>
    </div>
  )

  return (
    <form onSubmit={handleSubmit}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Recuperar contraseña</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 20, fontSize: 13 }}>
        Introduce tu email y te enviaremos un enlace.
      </p>
      <div className="form-group">
        <label>Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
      </div>
      <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
        {loading ? 'Enviando…' : 'Enviar enlace'}
      </button>
      <div className="auth-links"><Link to="/login">Volver al login</Link></div>
    </form>
  )
}
