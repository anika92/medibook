import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Activity, Lock, Phone } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import '../AuthPage.css'

export default function StaffLogin() {
  const [phone, setPhone]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const { login } = useAuth()
  const navigate  = useNavigate()

  const handleLogin = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Direct fetch — no axios, no interceptors, no proxy issues
      const res = await fetch('http://localhost:8000/api/v1/auth/staff/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        const msg = data?.detail || 'Login failed'
        if (res.status === 401) setError('Wrong phone or password')
        else if (res.status === 403) setError('Account not approved yet. Contact administrator.')
        else setError(typeof msg === 'string' ? msg : 'Login failed')
        return
      }

      // Decode JWT payload
      let payload = {}
      try {
        payload = JSON.parse(atob(data.access_token.split('.')[1]))
      } catch {}

      // Save to context — always type 'staff'
      login(data.access_token, {
        phone,
        type: 'staff',
        role: payload.role || 'RECEPTIONIST',
      })

      // Navigate to staff portal
      navigate('/staff', { replace: true })

    } catch (err) {
      setError('Cannot connect to server. Make sure backend is running on port 8000.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card card fade-up">
        <div className="auth-logo">
          <div className="nav-logo-icon"><Activity size={20}/></div>
          <span>MediBook</span>
        </div>

        <h1 className="auth-title">Staff login</h1>
        <p className="auth-sub">Sign in with your staff credentials</p>

        {/* ERROR BOX */}
        {error && (
          <div style={{
            background:'var(--red-light)', border:'1px solid #FECACA',
            borderRadius:'var(--r)', padding:'10px 14px',
            fontSize:13, color:'var(--red)', marginBottom:16,
            display:'flex', alignItems:'center', gap:8
          }}>
            ✗ {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label>Phone number</label>
            <div className="input-icon-wrap">
              <Phone size={15} className="input-icon"/>
              <input
                className="input input-with-icon"
                type="tel" placeholder="01XXXXXXXXX"
                value={phone}
                onChange={e => { setPhone(e.target.value); setError('') }}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label>Password</label>
            <div className="input-icon-wrap">
              <Lock size={15} className="input-icon"/>
              <input
                className="input input-with-icon"
                type="password" placeholder="••••••••"
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                required
              />
            </div>
          </div>

          <div style={{textAlign:'right', marginTop:-8, marginBottom:16}}>
            <Link to="/staff/forgot-password"
              style={{fontSize:12, color:'var(--primary)',
                textDecoration:'none', fontWeight:500}}>
              Forgot password?
            </Link>
          </div>

          <button
            className="btn btn-primary btn-full btn-lg"
            type="submit"
            disabled={loading}
            style={{justifyContent:'center'}}
          >
            {loading ? <span className="spinner"/> : 'Sign in'}
          </button>
        </form>

        <div style={{
          marginTop:20, padding:'12px 14px',
          background:'var(--bg)', borderRadius:'var(--r)',
          fontSize:12, color:'var(--ink3)',
          textAlign:'center', lineHeight:1.6
        }}>
          New staff member?{' '}
          <Link to="/staff/register"
            style={{color:'var(--primary)', fontWeight:500, textDecoration:'none'}}>
            Register here
          </Link>
          {' '}— requires approval
        </div>
      </div>
    </div>
  )
}