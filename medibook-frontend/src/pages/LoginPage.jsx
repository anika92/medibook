import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Activity, ArrowLeft, Phone, KeyRound } from 'lucide-react'
import toast from 'react-hot-toast'
import { sendOTP, verifyOTP } from '../services/api'
import { useAuth } from '../context/AuthContext'
import './AuthPage.css'

export default function LoginPage() {
  const [step, setStep]     = useState('phone') // phone | otp
  const [phone, setPhone]   = useState('')
  const [otp, setOtp]       = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate  = useNavigate()

  const handleSendOTP = async (e) => {
    e.preventDefault()
    if (!/^01[3-9]\d{8}$/.test(phone)) {
      toast.error('Enter a valid Bangladeshi phone number')
      return
    }
    setLoading(true)
    try {
      const res = await sendOTP(phone)
      toast.success(`OTP sent to ${phone}`)
      if (res.data.dev_otp) {
        toast(`Dev OTP: ${res.data.dev_otp}`, { icon: '🔑', duration: 10000 })
      }
      setStep('otp')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await verifyOTP(phone, otp)
      login(res.data.access_token, { phone, type: 'patient' })
      toast.success('Logged in!')
      navigate('/book')
    } catch (err) {
      const detail = err.response?.data?.detail
      if (detail?.includes('not registered')) {
        toast.error('Phone not registered. Please register first.')
        navigate('/register', { state: { phone } })
      } else {
        toast.error(detail || 'Invalid OTP')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card card fade-up">
        <div className="auth-logo">
          <div className="nav-logo-icon"><Activity size={20} /></div>
          <span>MediBook</span>
        </div>

        <h1 className="auth-title">
          {step === 'phone' ? 'Patient login' : 'Enter OTP'}
        </h1>
        <p className="auth-sub">
          {step === 'phone'
            ? 'Enter your registered phone number'
            : `We sent a 6-digit code to ${phone}`}
        </p>

        {step === 'phone' ? (
          <form onSubmit={handleSendOTP}>
            <div className="input-group">
              <label>Phone number</label>
              <div className="input-icon-wrap">
                <Phone size={15} className="input-icon" />
                <input
                  className="input input-with-icon"
                  type="tel" placeholder="01XXXXXXXXX"
                  value={phone} onChange={e => setPhone(e.target.value)}
                  maxLength={11} required
                />
              </div>
            </div>
            <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading}>
              {loading ? <span className="spinner" /> : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP}>
            <div className="input-group">
              <label>6-digit OTP</label>
              <div className="input-icon-wrap">
                <KeyRound size={15} className="input-icon" />
                <input
                  className="input input-with-icon otp-input"
                  type="text" placeholder="123456"
                  value={otp} onChange={e => setOtp(e.target.value)}
                  maxLength={6} required autoFocus
                />
              </div>
            </div>
            <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading}>
              {loading ? <span className="spinner" /> : 'Verify & login'}
            </button>
            <button
              type="button" className="btn btn-full" style={{marginTop:10}}
              onClick={() => setStep('phone')}
            >
              <ArrowLeft size={14} /> Change number
            </button>
          </form>
        )}

        <div className="auth-footer">
          New patient?{' '}
          <Link to="/register" state={{ phone }}>Register here</Link>
        </div>
      </div>
    </div>
  )
}
