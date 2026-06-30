import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Activity, LayoutDashboard, Calendar, QrCode, Building2, Users, CreditCard, ShieldCheck, BarChart2, LogOut, Clock } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import './AdminLayout.css'

const NAV_ALL = [
  { to:'/admin',              label:'Dashboard',     icon:<LayoutDashboard size={17}/>, end:true, roles:['SUPER_ADMIN','FINANCE','DEPT_MANAGER','RECEPTIONIST'] },
  { to:'/admin/appointments', label:'Appointments',  icon:<Calendar size={17}/>,               roles:['SUPER_ADMIN','DEPT_MANAGER','RECEPTIONIST'] },
  { to:'/admin/scanner',      label:'QR scanner',    icon:<QrCode size={17}/>,                 roles:['RECEPTIONIST'] },
  { to:'/admin/departments',  label:'Departments',   icon:<Building2 size={17}/>,              roles:['SUPER_ADMIN','DEPT_MANAGER'] },
  { to:'/admin/patients',     label:'Patients',      icon:<Users size={17}/>,                  roles:['SUPER_ADMIN'] },
  { to:'/admin/payments',     label:'Payments',      icon:<CreditCard size={17}/>,             roles:['SUPER_ADMIN','FINANCE'] },
  { to:'/admin/staff',        label:'Staff & roles', icon:<ShieldCheck size={17}/>,            roles:['SUPER_ADMIN'] },
  { to:'/admin/pending',      label:'Pending',       icon:<Clock size={17}/>,                  roles:['SUPER_ADMIN'], badge:true },
  { to:'/admin/reports',      label:'Reports',       icon:<BarChart2 size={17}/>,              roles:['SUPER_ADMIN','FINANCE'] },
]
export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [pendingCount, setPendingCount] = useState(0)

  const getRole = () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return 'receptionist'
      const payload = JSON.parse(atob(token.split('.')[1]))
      return payload.role || 'receptionist'
    } catch { return 'receptionist' }
  }

  const role = getRole()
  const NAV  = NAV_ALL.filter(n => n.roles.includes(role))

  const mainNav   = NAV.filter(n => ['/admin','/admin/appointments','/admin/scanner'].includes(n.to))
  const manageNav = NAV.filter(n => ['/admin/departments','/admin/patients','/admin/payments'].includes(n.to))
  const systemNav = NAV.filter(n => ['/admin/staff','/admin/pending','/admin/reports'].includes(n.to))

  // Load pending count for super admin badge
const loadPendingCount = () => {
  if (role === 'SUPER_ADMIN') {
    api.get('/staff-register/pending')
      .then(r => setPendingCount(r.data.length))
      .catch(()=>{})
  }
}

useEffect(()=>{
  loadPendingCount()

  // Listen for refresh event fired by AdminPending after approve/reject
  window.addEventListener('refresh-pending-count', loadPendingCount)
  return () => window.removeEventListener('refresh-pending-count', loadPendingCount)
},[role])

  const handleLogout = () => { logout(); navigate('/') }

  const NavItem = ({n}) => (


    <NavLink
      key={n.to} to={n.to} end={n.end}
      className={({isActive})=>`admin-nav-item ${isActive?'active':''}`}
    >
      {n.icon} {n.label}
      {n.badge && pendingCount > 0 && (
        <span style={{
          marginLeft:'auto',background:'#DC2626',color:'#fff',
          fontSize:10,fontWeight:700,padding:'1px 6px',borderRadius:20,
          minWidth:18,textAlign:'center'
        }}>
          {pendingCount}
        </span>
      )}
    </NavLink>
  )

  return (
    <div className="admin-shell">
      <aside className="admin-sb">
        <div className="admin-sb-top">
          <div className="nav-logo" style={{color:'#fff'}}>
            <div className="nav-logo-icon"><Activity size={18}/></div>
            <div>
              <div style={{fontSize:14,fontWeight:600}}>MediBook</div>
              <div style={{fontSize:11,color:'rgba(255,255,255,.4)',marginTop:1}}>Admin portal</div>
            </div>
          </div>
        </div>

        <nav className="admin-nav">
          {mainNav.length > 0 && (
            <><div className="admin-nav-section">Main</div>
            {mainNav.map(n=><NavItem key={n.to} n={n}/>)}</>
          )}
          {manageNav.length > 0 && (
            <><div className="admin-nav-section">Manage</div>
            {manageNav.map(n=><NavItem key={n.to} n={n}/>)}</>
          )}
          {systemNav.length > 0 && (
            <><div className="admin-nav-section">System</div>
            {systemNav.map(n=><NavItem key={n.to} n={n}/>)}</>
          )}
        </nav>

        <div className="admin-sb-foot">
          <div className="admin-user-row">
            <div className="admin-avatar">{user?.phone?.slice(-2)}</div>
            <div>
              <div style={{fontSize:12,fontWeight:600,color:'#fff'}}>{user?.phone}</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,.4)',textTransform:'capitalize'}}>
  {role.replace(/_/g,' ').toLowerCase()}
</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              width:'100%',marginTop:10,padding:'8px',
              background:'rgba(255,255,255,.06)',
              border:'1px solid rgba(255,255,255,.1)',
              borderRadius:8,color:'rgba(255,255,255,.6)',
              fontSize:12,cursor:'pointer',
              display:'flex',alignItems:'center',justifyContent:'center',gap:6,
              fontFamily:'inherit',transition:'all .15s'
            }}
            onMouseOver={e=>e.currentTarget.style.background='rgba(220,38,38,.25)'}
            onMouseOut={e=>e.currentTarget.style.background='rgba(255,255,255,.06)'}
          >
            <LogOut size={13}/> Sign out
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <Outlet/>
      </div>
    </div>
  )
}