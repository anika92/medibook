import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Activity, Calendar, QrCode, X, LogOut, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { myAppointments, cancelAppointment } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { format } from 'date-fns'

const STATUS_BADGE = {
  pending:   'badge-amber',
  confirmed: 'badge-blue',
  cancelled: 'badge-gray',
  attended:  'badge-green',
}

export default function MyAppointments() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [appts, setAppts] = useState([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    myAppointments()
      .then(r => setAppts(r.data))
      .catch(() => toast.error('Failed to load appointments'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleCancel = async (id) => {
    if (!confirm('Cancel this appointment?')) return
    try {
      await cancelAppointment(id)
      toast.success('Appointment cancelled')
      load()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Cannot cancel')
    }
  }

  return (
    <div style={{minHeight:'100vh',background:'var(--bg)'}}>
      <nav className="booking-nav">
        <div className="nav-logo" style={{cursor:'pointer'}} onClick={()=>navigate('/')}>
          <div className="nav-logo-icon"><Activity size={18}/></div>
          <span>MediBook</span>
        </div>
        <div style={{display:'flex',gap:10}}>
          <Link to="/book" className="btn btn-primary btn-sm"><Plus size={13}/> New booking</Link>
          <button className="btn btn-sm" onClick={()=>{logout();navigate('/')}}><LogOut size={13}/> Logout</button>
        </div>
      </nav>

      <div style={{maxWidth:700,margin:'0 auto',padding:'40px 24px'}}>
        <h2 style={{fontFamily:'var(--font-display)',fontSize:28,fontWeight:400,marginBottom:6}}>My appointments</h2>
        <p style={{fontSize:14,color:'var(--ink3)',marginBottom:24}}>{user?.phone}</p>

        {loading && (
          <div style={{textAlign:'center',padding:40}}><span className="spinner spinner-dark"/></div>
        )}

        {!loading && appts.length === 0 && (
          <div style={{textAlign:'center',padding:'60px 20px',background:'var(--white)',borderRadius:'var(--rl)',border:'1px solid var(--border)'}}>
            <Calendar size={40} style={{color:'var(--ink4)',marginBottom:12}}/>
            <p style={{fontSize:15,fontWeight:600,color:'var(--ink)',marginBottom:6}}>No appointments yet</p>
            <p style={{fontSize:13,color:'var(--ink3)',marginBottom:20}}>Book your first appointment now</p>
            <Link to="/book" className="btn btn-primary">Book appointment</Link>
          </div>
        )}

        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {appts.map(a => (
            <div key={a.id} className="card fade-up" style={{padding:'18px 20px'}}>
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between'}}>
                <div>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                    <span className={`badge ${STATUS_BADGE[a.status]||'badge-gray'}`}>
                      {a.status}
                    </span>
                    <span style={{fontSize:14,fontWeight:700,color:'var(--primary)'}}>
                      #{String(a.serial_no).padStart(3,'0')}
                    </span>
                  </div>
                  <div style={{fontSize:14,color:'var(--ink3)',display:'flex',gap:12,flexWrap:'wrap'}}>
                    <span style={{display:'flex',alignItems:'center',gap:4}}>
                      <Calendar size={12}/> {format(new Date(a.appt_date),'EEE, d MMM yyyy')}
                    </span>
                  </div>
                  <div style={{fontSize:11,fontFamily:'monospace',color:'var(--ink4)',marginTop:6}}>
                    {a.id}
                  </div>
                </div>
                <div style={{display:'flex',gap:8}}>
                  {a.status === 'confirmed' && (
                    <button className="btn btn-sm btn-primary" onClick={()=>navigate(`/token/${a.id}`)}>
                      <QrCode size={13}/> View QR
                    </button>
                  )}
                  {(a.status === 'pending' || a.status === 'confirmed') && (
                    <button className="btn btn-sm" style={{color:'var(--red)',borderColor:'var(--red-light)'}} onClick={()=>handleCancel(a.id)}>
                      <X size={13}/> Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
