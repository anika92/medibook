import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Calendar, Shield, Smartphone, Clock, ChevronRight, Activity, Check } from 'lucide-react'
import './LandingPage.css'

export default function LandingPage() {
  const { user } = useAuth()

  const steps = [
    { n:'01', icon:<Smartphone size={18}/>, title:'Login with phone OTP', sub:'No password needed — just your phone number', color:'#EEF3FF', tc:'#1B4FD8' },
    { n:'02', icon:<Calendar size={18}/>, title:'Choose department & date', sub:'See available slots live before booking', color:'#ECFDF5', tc:'#0EA472' },
    { n:'03', icon:<Activity size={18}/>, title:'Pay ৳10 via bKash', sub:'Secure server-verified payment gateway', color:'#FFF4F8', tc:'#D0006F' },
    { n:'04', icon:<Check size={18}/>, title:'Get your QR token', sub:'Show at reception — no printing needed', color:'#FFFBEB', tc:'#D97706' },
  ]

  return (
    <div className="landing">
      {/* NAV */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <div className="nav-logo">
            <div className="nav-logo-icon"><Activity size={18} /></div>
            <span>MediBook</span>
          </div>
          <div className="nav-links">
            {user ? (
              <>
                <Link to="/appointments" className="btn">My appointments</Link>
                <Link to="/book" className="btn btn-primary">Book now</Link>
              </>
            ) : (
              <>
                <Link to="/staff/login" className="btn" style={{fontSize:13,color:'var(--ink3)'}}>Staff login</Link>
                <Link to="/login" className="btn btn-primary">Patient login</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-bg">
          <div className="hero-circle c1" />
          <div className="hero-circle c2" />
          <div className="hero-circle c3" />
        </div>

        {/* LEFT */}
        <div className="hero-content fade-up">
          <div className="hero-badge">
            <span className="badge badge-blue">Online booking now live</span>
          </div>
          <h1 className="hero-title">
            Book your hospital<br />
            appointment <em>online</em>
          </h1>
          <p className="hero-sub">
            Skip the queue. Pay ৳10 via bKash, get a QR token,<br />
            and walk in at your scheduled time.
          </p>
          <div className="hero-actions">
            <Link to={user ? "/book" : "/login"} className="btn btn-primary btn-lg">
              Book appointment <ChevronRight size={16} />
            </Link>
            <Link to={user ? "/appointments" : "/login"} className="btn btn-lg">
              View my bookings
            </Link>
          </div>

          {/* TRUST BADGES */}
          <div className="trust-row">
            {['NID protected','bKash verified','Instant QR token'].map((t,i)=>(
              <div className="trust-item" key={i}>
                <Check size={12} style={{color:'var(--accent)',flexShrink:0}}/>
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — STEPS */}
        <div className="hero-steps fade-up" style={{animationDelay:'.15s'}}>
          <div className="hero-steps-header">
            <span style={{fontSize:12,fontWeight:600,color:'var(--ink3)',textTransform:'uppercase',letterSpacing:'.06em'}}>How it works</span>
          </div>
          {steps.map((s,i)=>(
            <div className="hero-step-item" key={i}>
              <div className="hero-step-icon" style={{background:s.color,color:s.tc}}>
                {s.icon}
              </div>
              <div className="hero-step-body">
                <div className="hero-step-num">{s.n}</div>
                <div className="hero-step-title">{s.title}</div>
                <div className="hero-step-sub">{s.sub}</div>
              </div>
              {i < steps.length-1 && <div className="hero-step-line"/>}
            </div>
          ))}
          <Link to={user ? "/book" : "/login"} className="btn btn-primary btn-full" style={{marginTop:16,justifyContent:'center'}}>
            Get started <ChevronRight size={14}/>
          </Link>
        </div>
      </section>

      {/* STATS */}
      <section className="stats-strip">
        <div className="stats-inner">
          {[
            {val:'100', lbl:'Slots per dept / day'},
            {val:'৳10', lbl:'Booking fee only'},
            {val:'<2 min', lbl:'To complete booking'},
            {val:'24/7', lbl:'Online availability'},
          ].map((s,i)=>(
            <div className="stat-strip-item" key={i}>
              <div className="stat-strip-val">{s.val}</div>
              <div className="stat-strip-lbl">{s.lbl}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="features">
        <div className="features-inner">
          <h2 className="section-title">Everything you need</h2>
          <div className="features-grid">
            {[
              { icon:<Smartphone size={22}/>, title:'OTP login', desc:'Login with your phone number. No password to remember.' },
              { icon:<Shield size={22}/>, title:'NID protected', desc:'One appointment per NID per day. No double booking.' },
              { icon:<Calendar size={22}/>, title:'Smart scheduling', desc:'Each department has its own days and max slot limits.' },
              { icon:<Clock size={22}/>, title:'Queue token', desc:'Get a QR serial number. Know exactly where you stand.' },
            ].map((f,i)=>(
              <div className="feature-card fade-up" key={i} style={{animationDelay:`${i*.1}s`}}>
                <div className="feature-icon">{f.icon}</div>
                <div className="feature-title">{f.title}</div>
                <div className="feature-desc">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DEPARTMENTS STRIP */}
      <section style={{background:'var(--bg)',padding:'60px 24px'}}>
        <div style={{maxWidth:1100,margin:'0 auto'}}>
          <h2 className="section-title">Available departments</h2>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginTop:8}}>
            {[
              {name:'Medicine ward', days:'Mon · Wed · Fri · Sat · Sun', slots:62, max:100},
              {name:'Cardiology', days:'Mon · Wed · Fri', slots:80, max:100},
              {name:'Gastroenterology', days:'Tue · Thu · Sat', slots:31, max:100},
              {name:'Neurology', days:'Mon · Thu', slots:12, max:60},
            ].map((d,i)=>(
              <div key={i} style={{background:'var(--white)',border:'1px solid var(--border)',borderRadius:'var(--rl)',padding:16}}>
                <div style={{fontSize:14,fontWeight:600,color:'var(--ink)',marginBottom:6}}>{d.name}</div>
                <div style={{fontSize:11,color:'var(--ink4)',marginBottom:10}}>{d.days}</div>
                <div style={{height:4,background:'var(--border)',borderRadius:2,overflow:'hidden',marginBottom:6}}>
                  <div style={{height:'100%',borderRadius:2,background: d.slots/d.max>0.8?'#DC2626':d.slots/d.max>0.5?'#F59E0B':'#0EA472',width:`${Math.round(d.slots/d.max*100)}%`}}/>
                </div>
                <div style={{fontSize:11,color:'var(--ink4)'}}>{d.slots} / {d.max} slots today</div>
              </div>
            ))}
          </div>
          <div style={{textAlign:'center',marginTop:20}}>
            <Link to={user?'/book':'/login'} className="btn btn-primary">
              Book an appointment <ChevronRight size={14}/>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <h2>Ready to book?</h2>
        <p>Takes less than 2 minutes.</p>
        <Link to={user ? "/book" : "/login"} className="btn btn-primary btn-lg">
          Get started <ChevronRight size={16} />
        </Link>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <div className="nav-logo" style={{justifyContent:'center'}}>
          <div className="nav-logo-icon"><Activity size={16} /></div>
          <span>MediBook</span>
        </div>
        <p style={{fontSize:12,color:'var(--ink4)',marginTop:6}}>
          © 2026 MediBook. Hospital appointment system.
        </p>
      </footer>
    </div>
  )
}
