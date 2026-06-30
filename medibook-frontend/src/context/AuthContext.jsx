import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [token, setToken]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const savedToken = localStorage.getItem('token')
    const savedUser  = localStorage.getItem('user')
    if (savedToken && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser)
        const payload    = JSON.parse(atob(savedToken.split('.')[1]))
        parsedUser.type  = payload.type  || parsedUser.type
        parsedUser.role  = payload.role  || parsedUser.role
        setToken(savedToken)
        setUser(parsedUser)
      } catch {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
    }
    setLoading(false)
  }, [])

  const login = (tokenValue, userObj) => {
    try {
      const payload = JSON.parse(atob(tokenValue.split('.')[1]))
      userObj.type  = payload.type  // 'patient' or 'staff'
      userObj.role  = payload.role  // 'SUPER_ADMIN', 'RECEPTIONIST' etc.
    } catch {}
    setToken(tokenValue)
    setUser(userObj)
    localStorage.setItem('token', tokenValue)
    localStorage.setItem('user', JSON.stringify(userObj))
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }


  return (
    <AuthContext.Provider value={{
      user, token, login, logout, loading,
      isStaff:   user?.type === 'staff',
      isPatient: user?.type === 'patient',
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)