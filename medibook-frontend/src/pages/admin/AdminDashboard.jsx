import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { dailyReport, adminAppointments } from '../../services/api'
import { RefreshCw, X, AlertTriangle, QrCode, CreditCard, BarChart2, Building2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { Link } from 'react-router-dom'
import './AdminLayout.css'

const STATUS_BADGE = {
  PENDING:   'badge-amber',
  CONFIRMED: 'badge-blue',
  CANCELLED: 'badge-gray',
  ATTENDED:  'badge-green',
}

function ViewModal({ appt, onClose, onCancelled }) {
  const [cancelling, setCancelling] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleCancel = async () => {
    setCancelling(true)
    try {
      await api.patch(`/appointments/${appt.id}/cancel`)
      toast.success('Appointment cancelled')
      onCancelled()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Cannot cancel')
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:20}}>
      <div className="card" style={{width:'100%',maxWidth:400,padding:24}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
          <div style={{fontSize:15,fontWeight:600,color:'var(--ink)'}}>Appointment details</div>
          <button className="btn btn-sm" onClick={onClose}><X size={14}/></button>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',background:'var(--bg)',borderRadius:'var(--r)',marginBottom:12}}>
          <div style={{width:36,height:36,borderRadius:'50%',background:'#EEF3FF',color:'#1B4FD8',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,flexShrink:0}}>
            {appt.patient_name?.slice(0,2).toUpperCase()}
          </div>
          <div>
            <div style={{fontSize:13,fontWeight:600,color:'var(--ink)'}}>{appt.patient_name}</div>
            <div style={{fontSize:11,color:'var(--ink3)'}}>{appt.patient_phone}</div>
          </div>
        </div>
        <div style={{background:'var(--bg)',borderRadius:'var(--r)',padding:14,marginBottom:16}}>
          {[['Department',appt.dept_name],['Date',appt.appt_date],['Serial',`#${String(appt.serial_no).padStart(3,'0')}`]].map(([k,v],i,arr)=>(
            <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:i<arr.length-1?'1px solid var(--border)':'none'}}>
              <span style={{fontSize:12,color:'var(--ink3)'}}>{k}</span>
              <span style={{fontSize:13,color:k==='Serial'?'var(--primary)':'var(--ink)',fontWeight:k==='Serial'?700:500}}>{v}</span>
            </div>
          ))}
          <div style={{display:'flex',justifyContent:'space-between',paddingTop:8}}>
            <span style={{fontSize:12,color:'var(--ink3)'}}>Status</span>
            <span className={`badge ${STATUS_BADGE[appt.status]||'badge-gray'}`}>{appt.status}</span>
          </div>
        </div>
        {(appt.status==='PENDING'||appt.status==='CONFIRMED') && (
          !showConfirm ? (
            <button className="btn btn-full" style={{justifyContent:'center',marginBottom:10,color:'var(--red)',borderColor:'#FECACA',background:'var(--red-light)'}} onClick={()=>setShowConfirm(true)}>
              <AlertTriangle size={13}/> Emergency cancel
            </button>
          ) : (
            <div style={{background:'var(--red-light)',border:'1px solid #FECACA',borderRadius:'var(--r)',padding:14,marginBottom:10}}>
              <div style={{fontSize:13,fontWeight:600,color:'var(--red)',marginBottom:6}}>Are you sure?</div>
              <div style={{fontSize:12,color:'var(--red)',marginBottom:12}}>Only cancel in emergencies. Cannot be undone.</div>
              <div style={{display:'flex',gap:8}}>
                <button className="btn btn-sm btn-full" style={{justifyContent:'center'}} onClick={()=>setShowConfirm(false)}>Go back</button>
                <button className="btn btn-sm btn-full" style={{justifyContent:'center',background:'var(--red)',color:'#fff',borderColor:'var(--red)'}} onClick={handleCancel} disabled={cancelling}>
                  {cancelling?<span className="spinner"/>:'Yes, cancel'}
                </button>
              </div>
            </div>
          )
        )}
        <button className="btn btn-full" style={{justifyContent:'center'}} onClick={onClose}>Close</button>
      </div>
    </div>
  )
}

// ── RECEPTIONIST DASHBOARD ─────────────────────────────────────────────────
function ReceptionistDashboard() {
  const today = format(new Date(),'yyyy-MM-dd')
  const [appts, setAppts]     = useState([])
  const [loading, setLoading] = useState(true)
  const [viewing, setViewing] = useState(null)

  const load = () => {
    adminAppointments({appt_date:today,limit:100})
      .then(r=>setAppts(r.data)).finally(()=>setLoading(false))
  }
  useEffect(()=>{ load() },[])

  const confirmed = appts.filter(a=>a.status==='CONFIRMED').length
  const attended  = appts.filter(a=>a.status==='ATTENDED').length
  const pending   = appts.filter(a=>a.status==='PENDING').length

  return (
    <div className="admin-page">
      <div className="admin-page-header" style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <div className="admin-page-title">Reception desk</div>
          <div className="admin-page-sub">{format(new Date(),'EEEE, d MMMM yyyy')}</div>
        </div>
        <div style={{display:'flex',gap:10}}>
          <Link to="/staff/scanner" className="btn btn-primary" style={{display:'flex',alignItems:'center',gap:6}}>
            <QrCode size={15}/> Open QR scanner
          </Link>
          <button className="btn btn-sm" onClick={load}><RefreshCw size={13}/></button>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:16}}>
        {[
          {label:"Today's bookings", val:appts.length, bg:'#EEF3FF', tc:'#1B4FD8'},
          {label:'Confirmed',        val:confirmed,    bg:'#EEF3FF', tc:'#1B4FD8'},
          {label:'Attended so far',  val:attended,     bg:'#ECFDF5', tc:'#16A34A'},
        ].map((s,i)=>(
          <div key={i} className="admin-stat">
            <div className="admin-stat-val" style={{color:s.tc}}>{s.val}</div>
            <div className="admin-stat-lbl">{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{background:'#EEF3FF',border:'1px solid #C7D7FA',borderRadius:'var(--rl)',padding:'14px 18px',marginBottom:16,display:'flex',alignItems:'center',gap:10}}>
        <QrCode size={18} style={{color:'#1B4FD8',flexShrink:0}}/>
        <div>
          <div style={{fontSize:13,fontWeight:600,color:'#1B4FD8'}}>Ready to scan</div>
          <div style={{fontSize:12,color:'#3B5BDB'}}>Ask patients to show their QR token and scan it to admit them</div>
        </div>
      </div>

      <div className="admin-table-wrap">
        <div style={{padding:'10px 16px',background:'var(--bg)',borderBottom:'1px solid var(--border)',fontSize:12,color:'var(--ink3)'}}>
          Today's appointments — {appts.length} total
        </div>
        <div style={{overflowX:'auto'}}>
          <table className="admin-table" style={{minWidth:500}}>
            <thead><tr>
              <th>Serial</th><th>Patient</th><th>Department</th><th>Status</th><th>View</th>
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{textAlign:'center',padding:30}}><span className="spinner spinner-dark"/></td></tr>
              ) : appts.length===0 ? (
                <tr><td colSpan={5} style={{textAlign:'center',padding:30,color:'var(--ink4)'}}>No appointments today</td></tr>
              ) : appts.map(a=>(
                <tr key={a.id}>
                  <td style={{fontWeight:700,color:'var(--primary)'}}>#{String(a.serial_no).padStart(3,'0')}</td>
                  <td><div style={{fontWeight:600,fontSize:13}}>{a.patient_name}</div><div style={{fontSize:11,color:'var(--ink4)'}}>{a.patient_phone}</div></td>
                  <td style={{fontSize:13}}>{a.dept_name}</td>
                  <td><span className={`badge ${STATUS_BADGE[a.status]||'badge-gray'}`}>{a.status}</span></td>
                  <td><button className="btn btn-sm" onClick={()=>setViewing(a)}>View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {viewing && <ViewModal appt={viewing} onClose={()=>setViewing(null)} onCancelled={load}/>}
    </div>
  )
}

// ── FINANCE DASHBOARD ──────────────────────────────────────────────────────
function FinanceDashboard() {
  const today = format(new Date(),'yyyy-MM-dd')
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    dailyReport(today).then(r=>setReport(r.data)).finally(()=>setLoading(false))
  },[])

  return (
    <div className="admin-page">
      <div className="admin-page-header" style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <div className="admin-page-title">Finance overview</div>
          <div className="admin-page-sub">{format(new Date(),'EEEE, d MMMM yyyy')}</div>
        </div>
        <div style={{display:'flex',gap:10}}>
          <Link to="/staff/payments" className="btn btn-primary" style={{display:'flex',alignItems:'center',gap:6}}>
            <CreditCard size={15}/> View payments
          </Link>
          <Link to="/staff/reports" className="btn" style={{display:'flex',alignItems:'center',gap:6}}>
            <BarChart2 size={15}/> Reports
          </Link>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:16}}>
        {[
          {label:"Today's revenue",  val:report?`৳${report.revenue_bdt}`:'—', bg:'#ECFDF5', tc:'#0EA472'},
          {label:'Total bookings',   val:report?.total_bookings??'—',          bg:'#EEF3FF', tc:'#1B4FD8'},
          {label:'Attended',         val:report?.attended??'—',                bg:'#F0FDF4', tc:'#16A34A'},
          {label:'Cancelled',        val:report?.cancelled??'—',               bg:'#FEF2F2', tc:'#DC2626'},
        ].map((s,i)=>(
          <div key={i} className="admin-stat">
            <div className="admin-stat-icon" style={{background:s.bg,color:s.tc,fontSize:18}}>৳</div>
            <div className="admin-stat-val">{s.val}</div>
            <div className="admin-stat-lbl">{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <Link to="/staff/payments" style={{textDecoration:'none'}}>
          <div style={{background:'var(--white)',border:'1px solid var(--border)',borderRadius:'var(--rl)',padding:20,cursor:'pointer',transition:'box-shadow .15s'}}
            onMouseOver={e=>e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,.08)'}
            onMouseOut={e=>e.currentTarget.style.boxShadow='none'}>
            <CreditCard size={22} style={{color:'#0EA472',marginBottom:10}}/>
            <div style={{fontSize:14,fontWeight:600,color:'var(--ink)',marginBottom:4}}>Payment transactions</div>
            <div style={{fontSize:12,color:'var(--ink3)'}}>View all bKash transactions, verify manual payments</div>
          </div>
        </Link>
        <Link to="/staff/reports" style={{textDecoration:'none'}}>
          <div style={{background:'var(--white)',border:'1px solid var(--border)',borderRadius:'var(--rl)',padding:20,cursor:'pointer',transition:'box-shadow .15s'}}
            onMouseOver={e=>e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,.08)'}
            onMouseOut={e=>e.currentTarget.style.boxShadow='none'}>
            <BarChart2 size={22} style={{color:'#1B4FD8',marginBottom:10}}/>
            <div style={{fontSize:14,fontWeight:600,color:'var(--ink)',marginBottom:4}}>Analytics reports</div>
            <div style={{fontSize:12,color:'var(--ink3)'}}>Daily and department revenue reports</div>
          </div>
        </Link>
      </div>
    </div>
  )
}

// ── DEPT MANAGER DASHBOARD ─────────────────────────────────────────────────
function DeptManagerDashboard() {
  const today = format(new Date(),'yyyy-MM-dd')
  const [appts, setAppts]     = useState([])
  const [loading, setLoading] = useState(true)
  const [viewing, setViewing] = useState(null)

  const load = () => {
    adminAppointments({appt_date:today,limit:100})
      .then(r=>setAppts(r.data)).finally(()=>setLoading(false))
  }
  useEffect(()=>{ load() },[])

  return (
    <div className="admin-page">
      <div className="admin-page-header" style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <div className="admin-page-title">Department overview</div>
          <div className="admin-page-sub">{format(new Date(),'EEEE, d MMMM yyyy')}</div>
        </div>
        <div style={{display:'flex',gap:10}}>
          <Link to="/staff/departments" className="btn btn-primary" style={{display:'flex',alignItems:'center',gap:6}}>
            <Building2 size={15}/> Manage department
          </Link>
          <button className="btn btn-sm" onClick={load}><RefreshCw size={13}/></button>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:16}}>
        {[
          {label:"Today's bookings", val:appts.length,                                     bg:'#EEF3FF',tc:'#1B4FD8'},
          {label:'Confirmed',        val:appts.filter(a=>a.status==='CONFIRMED').length,   bg:'#EEF3FF',tc:'#1B4FD8'},
          {label:'Attended',         val:appts.filter(a=>a.status==='ATTENDED').length,    bg:'#ECFDF5',tc:'#16A34A'},
        ].map((s,i)=>(
          <div key={i} className="admin-stat">
            <div className="admin-stat-val" style={{color:s.tc}}>{s.val}</div>
            <div className="admin-stat-lbl">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="admin-table-wrap">
        <div style={{padding:'10px 16px',background:'var(--bg)',borderBottom:'1px solid var(--border)',fontSize:12,color:'var(--ink3)'}}>
          Today's appointments for your department
        </div>
        <div style={{overflowX:'auto'}}>
          <table className="admin-table" style={{minWidth:480}}>
            <thead><tr>
              <th>Serial</th><th>Patient</th><th>Status</th><th>View</th>
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{textAlign:'center',padding:30}}><span className="spinner spinner-dark"/></td></tr>
              ) : appts.length===0 ? (
                <tr><td colSpan={4} style={{textAlign:'center',padding:30,color:'var(--ink4)'}}>No appointments today</td></tr>
              ) : appts.map(a=>(
                <tr key={a.id}>
                  <td style={{fontWeight:700,color:'var(--primary)'}}>#{String(a.serial_no).padStart(3,'0')}</td>
                  <td><div style={{fontWeight:600,fontSize:13}}>{a.patient_name}</div><div style={{fontSize:11,color:'var(--ink4)'}}>{a.patient_phone}</div></td>
                  <td><span className={`badge ${STATUS_BADGE[a.status]||'badge-gray'}`}>{a.status}</span></td>
                  <td><button className="btn btn-sm" onClick={()=>setViewing(a)}>View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {viewing && <ViewModal appt={viewing} onClose={()=>setViewing(null)} onCancelled={load}/>}
    </div>
  )
}

// ── SUPER ADMIN DASHBOARD ──────────────────────────────────────────────────
function SuperAdminDashboard() {
  const today = format(new Date(),'yyyy-MM-dd')
  const [report, setReport] = useState(null)
  const [appts, setAppts]   = useState([])
  const [viewing, setViewing] = useState(null)

  const load = () => {
    dailyReport(today).then(r=>setReport(r.data)).catch(()=>{})
    adminAppointments({appt_date:today,limit:50}).then(r=>setAppts(r.data)).catch(()=>{})
  }
  useEffect(()=>{ load() },[])

  return (
    <div className="admin-page">
      <div className="admin-page-header" style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <div className="admin-page-title">Dashboard</div>
          <div className="admin-page-sub">{format(new Date(),'EEEE, d MMMM yyyy')} · live</div>
        </div>
        <button className="btn btn-sm" onClick={load}><RefreshCw size={13}/> Refresh</button>
      </div>

      <div className="admin-stats">
        {[
          {label:'Bookings today', val:report?.total_bookings??'—', bg:'#EEF3FF', tc:'#1B4FD8'},
          {label:'Revenue today',  val:report?`৳${report.revenue_bdt}`:'—', bg:'#ECFDF5', tc:'#0EA472'},
          {label:'Attended',       val:report?.attended??'—', bg:'#F0FDF4', tc:'#16A34A'},
          {label:'Cancelled',      val:report?.cancelled??'—', bg:'#FEF2F2', tc:'#DC2626'},
        ].map((s,i)=>(
          <div className="admin-stat" key={i}>
            <div className="admin-stat-icon" style={{background:s.bg,color:s.tc,fontSize:20,fontWeight:700}}>{String(s.val)[0]}</div>
            <div className="admin-stat-val">{s.val}</div>
            <div className="admin-stat-lbl">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="admin-table-wrap">
        <div className="admin-table-head">
          <div>
            <div className="admin-table-title">Today's appointments</div>
            <div style={{fontSize:12,color:'var(--ink3)',marginTop:2}}>{appts.length} total</div>
          </div>
        </div>
        <div style={{overflowX:'auto'}}>
          <table className="admin-table" style={{minWidth:600}}>
            <thead><tr>
              <th>Serial</th><th>Patient</th><th>Department</th><th>Date</th><th>Status</th><th>View</th>
            </tr></thead>
            <tbody>
              {appts.length===0 ? (
                <tr><td colSpan={6} style={{textAlign:'center',padding:30,color:'var(--ink4)'}}>No appointments today</td></tr>
              ) : appts.map(a=>(
                <tr key={a.id}>
                  <td style={{fontWeight:700,color:'var(--primary)'}}>#{String(a.serial_no).padStart(3,'0')}</td>
                  <td><div style={{fontWeight:600,fontSize:13}}>{a.patient_name}</div><div style={{fontSize:11,color:'var(--ink4)'}}>{a.patient_phone}</div></td>
                  <td style={{fontSize:13}}>{a.dept_name}</td>
                  <td style={{fontSize:12}}>{a.appt_date}</td>
                  <td><span className={`badge ${STATUS_BADGE[a.status]||'badge-gray'}`}>{a.status}</span></td>
                  <td><button className="btn btn-sm" onClick={()=>setViewing(a)}>View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {viewing && <ViewModal appt={viewing} onClose={()=>setViewing(null)} onCancelled={load}/>}
    </div>
  )
}

// ── MAIN EXPORT — picks dashboard based on role ────────────────────────────
export default function AdminDashboard() {
  const { user } = useAuth()
  const role = user?.role || 'RECEPTIONIST'

  if (role === 'RECEPTIONIST')  return <ReceptionistDashboard/>
  if (role === 'FINANCE')       return <FinanceDashboard/>
  if (role === 'DEPT_MANAGER')  return <DeptManagerDashboard/>
  return <SuperAdminDashboard/>
}