import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

function parseUser(token) {
  if (!token) return null
  try {
    return JSON.parse(atob(token.split('.')[1]))
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('nova_token') || null)
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('nova_user')
    return stored ? JSON.parse(stored) : null
  })

  function login(accessToken, userData) {
    localStorage.setItem('nova_token', accessToken)
    localStorage.setItem('nova_user', JSON.stringify(userData))
    setToken(accessToken)
    setUser(userData)
  }

  function logout() {
    localStorage.removeItem('nova_token')
    localStorage.removeItem('nova_user')
    localStorage.removeItem('nova_refresh')
    setToken(null)
    setUser(null)
  }

  function updateUser(data) {
    const updated = { ...user, ...data }
    localStorage.setItem('nova_user', JSON.stringify(updated))
    setUser(updated)
  }

  return (
    <AuthContext.Provider value={{ token, user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
