import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { authApi } from '../api/client'

export default function Profile() {
  const { user, updateUser } = useAuth()
  const { preference, setTheme } = useTheme()

  const [nameForm, setNameForm] = useState({ name: user?.name || '' })
  const [emailForm, setEmailForm] = useState({ email: user?.email || '' })
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' })

  const [nameMsg, setNameMsg] = useState('')
  const [emailMsg, setEmailMsg] = useState('')
  const [pwMsg, setPwMsg] = useState('')
  const [nameErr, setNameErr] = useState('')
  const [emailErr, setEmailErr] = useState('')
  const [pwErr, setPwErr] = useState('')

  async function handleName(e) {
    e.preventDefault()
    setNameErr(''); setNameMsg('')
    try {
      const u = await authApi.updateMe({ name: nameForm.name })
      updateUser(u)
      setNameMsg('Nombre actualizado')
    } catch (err) { setNameErr(err.message) }
  }

  async function handleEmail(e) {
    e.preventDefault()
    setEmailErr(''); setEmailMsg('')
    try {
      await authApi.updateEmail(emailForm.email)
      updateUser({ email: emailForm.email })
      setEmailMsg('Email actualizado')
    } catch (err) { setEmailErr(err.message) }
  }

  async function handlePassword(e) {
    e.preventDefault()
    setPwErr(''); setPwMsg('')
    if (pwForm.newPassword !== pwForm.confirm) return setPwErr('Las contraseñas no coinciden')
    try {
      await authApi.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword })
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' })
      setPwMsg('Contraseña actualizada')
    } catch (err) { setPwErr(err.message) }
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <div className="page-header"><h1>Mi perfil</h1></div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Nombre</h2>
        <form onSubmit={handleName}>
          <div className="form-group">
            <label>Nombre</label>
            <input value={nameForm.name} onChange={e => setNameForm({ name: e.target.value })} required />
          </div>
          {nameErr && <p className="error-msg" style={{ marginBottom: 8 }}>{nameErr}</p>}
          {nameMsg && <p className="success-msg" style={{ marginBottom: 8 }}>{nameMsg}</p>}
          <button className="btn btn-primary btn-sm">Guardar</button>
        </form>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Email</h2>
        <form onSubmit={handleEmail}>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={emailForm.email} onChange={e => setEmailForm({ email: e.target.value })} />
          </div>
          {emailErr && <p className="error-msg" style={{ marginBottom: 8 }}>{emailErr}</p>}
          {emailMsg && <p className="success-msg" style={{ marginBottom: 8 }}>{emailMsg}</p>}
          <button className="btn btn-primary btn-sm">Guardar</button>
        </form>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Cambiar contraseña</h2>
        <form onSubmit={handlePassword}>
          <div className="form-group">
            <label>Contraseña actual</label>
            <input type="password" value={pwForm.currentPassword} onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label>Nueva contraseña</label>
            <input type="password" value={pwForm.newPassword} onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} required minLength={8} />
          </div>
          <div className="form-group">
            <label>Confirmar nueva</label>
            <input type="password" value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} required />
          </div>
          {pwErr && <p className="error-msg" style={{ marginBottom: 8 }}>{pwErr}</p>}
          {pwMsg && <p className="success-msg" style={{ marginBottom: 8 }}>{pwMsg}</p>}
          <button className="btn btn-primary btn-sm">Cambiar contraseña</button>
        </form>
      </div>

      <div className="card">
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Tema</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {[['system', 'Sistema'], ['light', 'Claro'], ['dark', 'Oscuro']].map(([val, label]) => (
            <button
              key={val}
              className={`btn ${preference === val ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setTheme(val)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
