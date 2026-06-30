import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, User, Phone, Lock, Briefcase, CheckCircle, Mail } from 'lucide-react'
import toast from 'react-hot-toast'
import axios from 'axios'

const ROLES = [
  { value:'RECEPTIONIST', label:'Receptionist',  desc:'QR scanner and front desk' },
  { value:'DEPT_MANAGER', label:'Dept. manager', desc:'Manage a specific department' },
  { value:'FINANCE',      label:'Finance',        desc:'Payments and reports access' },
]

const s = {
  page:{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)',padding:24,backgroundImage:'radial-gradient(circle at 20% 20%, rgba(27,79,216,.06) 0%, transparent 50%)'},
  card:{width:'100%',maxWidth:500,padding:36,background:'var(--white)',border:'1px solid var(--border)',borderRadius:'var(--rl)',boxShadow:'var(--shadow)'},
  logo:{display:'flex',alignItems:'center',gap:8,fontSize:16,fontWeight:600,color:'var(--ink)',marginBottom:28},
  logoIcon:{width:32,height:32,background:'var(--primary)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff'},
  title:{fontFamily:'var(--font-display)',fontSize:26,fontWeight:400,color:'var(--ink)',marginBottom:6},
  sub:{fontSize:14,color:'var(--ink3)',marginBottom:24,lineHeight:1.6},
  group:{marginBottom:16},
  label:{display:'block',fontSize:12,fontWeight:600,color:'var(--ink2)',marginBottom:6,textTransform:'uppercase',letterSpacing:'.06em'},
  iw:{position:'relative'},
  ic:{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--ink4)',pointerEvents:'none'},
  input:{width:'100%',padding:'11px 14px 11px 36px',border:'1.5px solid var(--border2)',borderRadius:'var(--r)',fontSize:14,fontFamily:'inherit',color:'var(--ink)',background:'var(--white)',transition:'border-color .15s',outline:'none'},
  inputError:{borderColor:'var(--red)'},
  errMsg:{fontSize:11,color:'var(--red)',marginTop:4,display:'flex',alignItems:'center',gap:4},
  okMsg:{fontSize:11,color:'#0EA472',marginTop:4,display:'flex',alignItems:'center',gap:4},
  notice:{display:'flex',alignItems:'flex-start',gap:8,background:'#FFFBEB',border:'1px solid #FCD34D',borderRadius:'var(--r)',padding:'10px 12px',fontSize:12,color:'#92400E',lineHeight:1.6,marginBottom:16},
  footer:{textAlign:'center',fontSize:13,color:'var(--ink3)',marginTop:20},
}

export default function StaffRegister() {
  const [done, setDone]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors]   = useState({})
  const [touched, setTouched] = useState({})
  const [form, setForm]       = useState({
    full_name:'', phone:'', email:'', password:'', confirm:'', role:'RECEPTIONIST'
  })

  const set = k => e => {
    setForm(f=>({...f,[k]:e.target.value}))
    setTouched(t=>({...t,[k]:true}))
    validateField(k, e.target.value)
  }

  const validateField = (k, v) => {
    let err = ''
    switch(k) {
      case 'full_name': if (!v.trim()) err='Full name is required'; else if(v.trim().length<2) err='Too short'; break
      case 'phone': if(!v) err='Phone is required'; else if(!/^01[3-9]\d{8}$/.test(v)) err='Enter valid BD number (01XXXXXXXXX)'; break
      case 'email': if(v&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) err='Enter a valid email (name@domain.com)'; break
      case 'password': if(!v) err='Password is required'; else if(v.length<8) err='Minimum 8 characters'; break
      case 'confirm': if(!v) err='Please confirm your password'; else if(v!==form.password) err='Passwords do not match'; break
    }
    setErrors(e=>({...e,[k]:err}))
    return err
  }

  const validateAll = () => {
    const fields = ['full_name','phone','password','confirm']
    let valid = true, allTouched = {}
    fields.forEach(f => {
      allTouched[f] = true
      if (validateField(f, form[f])) valid = false
    })
    if (form.email) { allTouched.email=true; if(validateField('email',form.email)) valid=false }
    setTouched(t=>({...t,...allTouched}))
    return valid
  }

  const inp = k => ({...s.input,...(touched[k]&&errors[k]?s.inputError:{})})

  const handleSubmit = async e => {
    e.preventDefault()
    if (!validateAll()) { toast.error('Please fix the errors'); return }
    setLoading(true)
    try {
      await axios.post('http://localhost:8000/api/v1/staff-register/', {
        full_name: form.full_name.trim(),
        phone: form.phone,
        email: form.email || undefined,
        password: form.password,
        role: form.role,
      })
      setDone(true)
    } catch (err) {
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) toast.error(detail[0]?.msg||'Validation error')
      else toast.error(typeof detail==='string'?detail:'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  if (done) return (
    <div style={s.page}>
      <div style={{...s.card,textAlign:'center'}}>
        <div style={{width:60,height:60,background:'#ECFDF5',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px'}}>
          <CheckCircle size={28} style={{color:'#16A34A'}}/>
        </div>
        <div style={{...s.title,textAlign:'center',fontSize:22}}>Registration submitted!</div>
        <p style={{...s.sub,textAlign:'center'}}>Your account is pending admin approval.<br/>You will be notified once approved.</p>
        <div style={{background:'var(--bg)',borderRadius:'var(--r)',padding:'12px 16px',marginBottom:20,fontSize:13,color:'var(--ink3)',textAlign:'left'}}>
          {[['Name',form.full_name],['Phone',form.phone],['Email',form.email||'—'],['Role',form.role.replace(/_/g,' ')]].map(([k,v])=>(
            <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid var(--border)'}}>
              <span style={{color:'var(--ink3)'}}>{k}</span>
              <strong style={{color:'var(--ink)',textTransform:'capitalize'}}>{v}</strong>
            </div>
          ))}
        </div>
        {/* Fixed — link to /staff/login not /admin/login */}
        <Link to="/staff/login" className="btn btn-primary btn-full" style={{justifyContent:'center',display:'flex'}}>
          Go to login
        </Link>
      </div>
    </div>
  )

  return (
    <div style={s.page}>
      <div style={s.card} className="fade-up">
        <div style={s.logo}><div style={s.logoIcon}><Activity size={18}/></div><span>MediBook Staff</span></div>
        <div style={s.title}>Staff registration</div>
        <p style={s.sub}>Create your account — admin approval required before login</p>
        <form onSubmit={handleSubmit} noValidate>
          <div style={s.group}>
            <label style={s.label}>Full name *</label>
            <div style={s.iw}><User size={15} style={s.ic}/>
              <input style={inp('full_name')} placeholder="Dr. Rahim" value={form.full_name} onChange={set('full_name')}
                onBlur={()=>{setTouched(t=>({...t,full_name:true}));validateField('full_name',form.full_name)}}
                onFocus={e=>e.target.style.borderColor='var(--primary)'}/>
            </div>
            {touched.full_name&&errors.full_name?<div style={s.errMsg}><span>✗</span>{errors.full_name}</div>:touched.full_name&&form.full_name&&<div style={s.okMsg}><span>✓</span>Looks good</div>}
          </div>
          <div style={s.group}>
            <label style={s.label}>Phone number *</label>
            <div style={s.iw}><Phone size={15} style={s.ic}/>
              <input style={inp('phone')} type="tel" placeholder="01XXXXXXXXX" value={form.phone} onChange={set('phone')} maxLength={11}
                onBlur={()=>{setTouched(t=>({...t,phone:true}));validateField('phone',form.phone)}}
                onFocus={e=>e.target.style.borderColor='var(--primary)'}/>
            </div>
            {touched.phone&&errors.phone?<div style={s.errMsg}><span>✗</span>{errors.phone}</div>:touched.phone&&!errors.phone&&form.phone&&<div style={s.okMsg}><span>✓</span>Valid</div>}
          </div>
          <div style={s.group}>
            <label style={s.label}>Email <span style={{color:'var(--ink4)',fontWeight:400,textTransform:'none',fontSize:11}}>(optional)</span></label>
            <div style={s.iw}><Mail size={15} style={s.ic}/>
              <input style={{...inp('email'),...(touched.email&&errors.email?s.inputError:{})}} type="email" placeholder="your@email.com"
                value={form.email} onChange={set('email')}
                onBlur={()=>{setTouched(t=>({...t,email:true}));validateField('email',form.email)}}
                onFocus={e=>e.target.style.borderColor='var(--primary)'}/>
            </div>
            {touched.email&&errors.email?<div style={s.errMsg}><span>✗</span>{errors.email}</div>:form.email&&!errors.email?<div style={s.okMsg}><span>✓</span>You will be notified here</div>:<div style={{fontSize:11,color:'var(--ink4)',marginTop:4}}>Receive email when approved</div>}
          </div>
          <div style={s.group}>
            <label style={s.label}>Role *</label>
            <div style={s.iw}><Briefcase size={15} style={s.ic}/>
              <select style={s.input} value={form.role} onChange={set('role')}
                onFocus={e=>e.target.style.borderColor='var(--primary)'}
                onBlur={e=>e.target.style.borderColor='var(--border2)'}>
                {ROLES.map(r=><option key={r.value} value={r.value}>{r.label} — {r.desc}</option>)}
              </select>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div style={s.group}>
              <label style={s.label}>Password *</label>
              <div style={s.iw}><Lock size={15} style={s.ic}/>
                <input style={inp('password')} type="password" placeholder="Min 8 chars" value={form.password} onChange={set('password')} minLength={8}
                  onBlur={()=>{setTouched(t=>({...t,password:true}));validateField('password',form.password)}}
                  onFocus={e=>e.target.style.borderColor='var(--primary)'}/>
              </div>
              {touched.password&&errors.password?<div style={s.errMsg}><span>✗</span>{errors.password}</div>:touched.password&&form.password.length>=8&&<div style={s.okMsg}><span>✓</span>Good</div>}
            </div>
            <div style={s.group}>
              <label style={s.label}>Confirm *</label>
              <div style={s.iw}><Lock size={15} style={s.ic}/>
                <input style={inp('confirm')} type="password" placeholder="Repeat" value={form.confirm} onChange={set('confirm')}
                  onBlur={()=>{setTouched(t=>({...t,confirm:true}));validateField('confirm',form.confirm)}}
                  onFocus={e=>e.target.style.borderColor='var(--primary)'}/>
              </div>
              {touched.confirm&&errors.confirm?<div style={s.errMsg}><span>✗</span>{errors.confirm}</div>:touched.confirm&&form.confirm&&form.confirm===form.password&&<div style={s.okMsg}><span>✓</span>Match</div>}
            </div>
          </div>
          {form.password&&(
            <div style={{marginBottom:16}}>
              <div style={{height:4,background:'var(--border)',borderRadius:2,overflow:'hidden',marginBottom:4}}>
                <div style={{height:'100%',borderRadius:2,transition:'width .3s',width:form.password.length>=12?'100%':form.password.length>=8?'60%':'30%',background:form.password.length>=12?'#0EA472':form.password.length>=8?'#F59E0B':'#DC2626'}}/>
              </div>
              <div style={{fontSize:11,color:'var(--ink4)'}}>{form.password.length>=12?'Strong ✓':form.password.length>=8?'Good':'Too short'}</div>
            </div>
          )}
          <div style={s.notice}><CheckCircle size={14} style={{color:'#D97706',flexShrink:0,marginTop:2}}/><span>Your account will be reviewed by an admin. You cannot login until approved.</span></div>
          <button type="submit" disabled={loading} style={{width:'100%',padding:'12px',borderRadius:'var(--r)',fontSize:14,fontWeight:600,cursor:loading?'not-allowed':'pointer',background:loading?'#93c5fd':'var(--primary)',color:'#fff',border:'none',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
            {loading?<span className="spinner"/>:'Submit registration'}
          </button>
        </form>
        {/* Fixed — link to /staff/login */}
        <div style={s.footer}>Already approved?{' '}<Link to="/staff/login" style={{color:'var(--primary)',fontWeight:500,textDecoration:'none'}}>Login here</Link></div>
      </div>
    </div>
  )
}