import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import './AppLayout.css'

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: '◉' },
  { to: '/accounts', label: 'Cuentas', icon: '🏦' },
  { to: '/transactions', label: 'Transacciones', icon: '↕' },
  { to: '/loans', label: 'Préstamos', icon: '🤝' },
  { to: '/debts', label: 'Deudas', icon: '🏚' },
  { to: '/savings', label: 'Ahorro', icon: '💸' },
  { to: '/goals', label: 'Metas', icon: '🎯' },
  { to: '/budgets', label: 'Presupuesto', icon: '📊' },
  { to: '/recurring', label: 'Recurrentes', icon: '🔄' },
]

export default function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="app-layout">
      <nav className="sidebar">
        <div className="sidebar-logo">Nova</div>
        <div className="sidebar-nav">
          {NAV.map(({ to, label, icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
              <span className="nav-icon">{icon}</span>
              <span>{label}</span>
            </NavLink>
          ))}
          {user?.is_admin === 1 && (
            <NavLink to="/admin" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
              <span className="nav-icon">⚙</span>
              <span>Admin</span>
            </NavLink>
          )}
        </div>
        <div className="sidebar-footer">
          <NavLink to="/profile" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <span className="nav-icon">👤</span>
            <span>{user?.name || user?.username}</span>
          </NavLink>
          <button className="nav-item logout-btn" onClick={handleLogout}>
            <span className="nav-icon">⏏</span>
            <span>Salir</span>
          </button>
        </div>
      </nav>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
