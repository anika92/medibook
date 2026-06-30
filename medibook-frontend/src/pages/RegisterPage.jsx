import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Activity, Mail } from 'lucide-react'
import toast from 'react-hot-toast'
import { registerPatient, sendOTP, verifyOTP } from '../services/api'
import { useAuth } from '../context/AuthContext'
import './AuthPage.css'

export default function RegisterPage() {
  const location  = useLocation()
  const navigate  = useNavigate()
  const { login } = useAuth()

  const [step, setStep]         = useState('form')
  const [loading, setLoading]   = useState(false)
  const [otp, setOtp]           = useState('')
  const [emailError, setEmailError] = useState('')

  const [form, setForm] = useState({
    phone:         location.state?.phone || '',
    nid:           '',
    full_name:     '',
    email:         '',
    blood_group:   '',
    date_of_birth: '',
    address:       '',
  })

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const validateEmail = (val) => {
    if (!val) { setEmailError(''); return }
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)
    setEmailError(valid ? '' : 'Please enter a valid email address')
  }

  // ── Step 1: Register ─────────────────────────────────────────
  const handleRegister = async e => {
    e.preventDefault()
    if (!/^01[3-9]\d{8}$/.test(form.phone)) {
      toast.error('Invalid phone number')
      return
    }
    if (form.nid.length < 10) {
      toast.error('NID must be at least 10 digits')
      return
    }
    if (form.email && emailError) {
      toast.error('Please enter a valid email address')
      return
    }
    setLoading(true)
    try {
      await registerPatient({
        phone:         form.phone,
        nid:           form.nid,
        full_name:     form.full_name,
        email:         form.email || undefined,
        blood_group:   form.blood_group || undefined,
        date_of_birth: form.date_of_birth || undefined,
        address:       form.address || undefined,
      })
      const otpRes = await sendOTP(form.phone)
      if (otpRes.data.dev_otp) {
        toast(`Dev OTP: ${otpRes.data.dev_otp}`, { icon:'🔑', duration:10000 })
      }
      toast.success('Registered! Verify your phone.')
      setStep('otp')
    } catch (err) {
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) {
        toast.error(detail[0]?.msg || 'Validation error')
      } else if (typeof detail === 'string') {
        if (detail.includes('Phone') || detail.includes('phone')) {
          toast.error('This phone number is already registered')
        } else if (detail.includes('NID') || detail.includes('nid')) {
          toast.error('This NID is already registered')
        } else {
          toast.error(detail)
        }
      } else {
        toast.error('Registration failed — please check your details')
      }
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2: Verify OTP ───────────────────────────────────────
  const handleVerifyOTP = async e => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await verifyOTP(form.phone, otp)
      login(res.data.access_token, { phone: form.phone, type: 'patient' })
      toast.success('Welcome to MediBook!')
      navigate('/book')
    } catch {
      toast.error('Invalid OTP')
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

        {step === 'form' ? (
          <>
            <h1 className="auth-title">Create account</h1>
            <p className="auth-sub">Fill in your details to register as a patient</p>
            <form onSubmit={handleRegister}>

              <div className="input-group">
                <label>Full name *</label>
                <input className="input" placeholder="Md. Rahim Uddin"
                  value={form.full_name} onChange={set('full_name')} required/>
              </div>

              <div className="input-group">
                <label>Phone number *</label>
                <input className="input" type="tel" placeholder="01XXXXXXXXX"
                  value={form.phone} onChange={set('phone')} maxLength={11} required/>
              </div>

              <div className="input-group">
                <label>National ID (NID) *</label>
                <input className="input" placeholder="10 or 17 digit NID"
                  value={form.nid} onChange={set('nid')} maxLength={17} required/>
              </div>

              {/* EMAIL */}
              <div className="input-group">
                <label>
                  Email address{' '}
                  <span style={{color:'var(--ink4)',fontWeight:400,textTransform:'none',fontSize:11}}>
                    (optional — for booking confirmation)
                  </span>
                </label>
                <div className="input-icon-wrap">
                  <Mail size={15} className="input-icon"/>
                  <input
                    className={`input input-with-icon ${emailError ? 'input-error' : ''}`}
                    type="email"
                    placeholder="your@email.com"
                    value={form.email}
                    onChange={e => {
                      set('email')(e)
                      validateEmail(e.target.value)
                    }}
                  />
                </div>
                {emailError && (
                  <div style={{fontSize:11,color:'var(--red)',marginTop:4,display:'flex',alignItems:'center',gap:4}}>
                    ✗ {emailError}
                  </div>
                )}
                {form.email && !emailError && (
                  <div style={{fontSize:11,color:'#0EA472',marginTop:4,display:'flex',alignItems:'center',gap:4}}>
                    ✓ Valid email — confirmation will be sent here
                  </div>
                )}
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div className="input-group">
                  <label>Blood group</label>
                  <select className="input" value={form.blood_group} onChange={set('blood_group')}>
                    <option value="">Select</option>
                    {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(b=>(
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div className="input-group">
                  <label>Date of birth</label>
                  <input className="input" type="date"
                    value={form.date_of_birth} onChange={set('date_of_birth')}/>
                </div>
              </div>

              <div className="input-group">
                <label>Address</label>
                <input className="input" placeholder="Dhaka, Bangladesh"
                  value={form.address} onChange={set('address')}/>
              </div>

              <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading}
                style={{justifyContent:'center'}}>
                {loading ? <span className="spinner"/> : 'Register & verify phone'}
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="auth-title">Verify phone</h1>
            <p className="auth-sub">Enter the OTP sent to <strong>{form.phone}</strong></p>
            <form onSubmit={handleVerifyOTP}>
              <div className="input-group">
                <label>6-digit OTP</label>
                <input
                  className="input otp-input" type="text"
                  placeholder="123456" value={otp}
                  onChange={e=>setOtp(e.target.value.replace(/\D/g,''))}
                  maxLength={6} required autoFocus
                />
              </div>
              <button className="btn btn-primary btn-full btn-lg" type="submit"
                disabled={loading} style={{justifyContent:'center'}}>
                {loading ? <span className="spinner"/> : 'Verify & login'}
              </button>
              <button type="button" className="btn btn-full"
                style={{marginTop:10,justifyContent:'center'}}
                onClick={()=>setStep('form')}>
                ← Go back
              </button>
            </form>
          </>
        )}

        <div className="auth-footer">
          Already registered? <Link to="/login">Login here</Link>
        </div>
      </div>
    </div>
  )
}