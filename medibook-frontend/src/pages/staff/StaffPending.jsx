// Re-export AdminPending with updated event dispatch
import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import '../admin/AdminLayout.css'

export default function StaffPending() {
  const [pending, setPending]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [processing, setProcessing] = useState(null)

  const load = () => {
    setLoading(true)
    api.get('/staff-register/pending')
      .then(r => {
        setPending(r.data)
        window.dispatchEvent(new Event('refresh-pending-count'))
      })
      .catch(() => toast.error('Failed to load pending registrations'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleAction = async (id, approve) => {
    setProcessing(id)
    try {
      const r = await api.put(`/staff-register/${id}/approve`, { is_active: approve })
      toast.success(r.data.message)
      load()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Action failed')
    } finally {
      setProcessing(null)
    }
  }

  const ROLE_COLORS = {
    SUPER_ADMIN:  { bg:'#EEF3FF', tc:'#1B4FD8' },
    RECEPTIONIST: { bg:'#F1F5F9', tc:'#475569' },
    DEPT_MANAGER: { bg:'#ECFDF5', tc:'#0EA472' },
    FINANCE:      { bg:'#FFFBEB', tc:'#D97706' },
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div className="admin-page-title">Pending approvals</div>
          {pending.length > 0 && (
            <span style={{background:'#FEF2F2',color:'#DC2626',fontSize:11,
              fontWeight:700,padding:'3px 8px',borderRadius:20}}>
              {pending.length} waiting
            </span>
          )}
        </div>
        <div className="admin-page-sub">Staff registrations awaiting your approval</div>
      </div>

      {loading && (
        <div style={{textAlign:'center',padding:40}}>
          <span className="spinner spinner-dark"/>
        </div>
      )}

      {!loading && pending.length === 0 && (
        <div style={{textAlign:'center',padding:'60px 20px',background:'var(--white)',
          borderRadius:'var(--rl)',border:'1px solid var(--border)'}}>
          <CheckCircle size={40} style={{color:'#0EA472',marginBottom:12}}/>
          <div style={{fontSize:15,fontWeight:600,color:'var(--ink)',marginBottom:6}}>All clear!</div>
          <div style={{fontSize:13,color:'var(--ink3)'}}>No pending registrations.</div>
        </div>
      )}

      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {pending.map(s => {
          const rc = ROLE_COLORS[s.role] || ROLE_COLORS.RECEPTIONIST
          return (
            <div key={s.id} className="admin-table-wrap" style={{padding:'16px 20px'}}>
              <div style={{display:'flex',alignItems:'center',gap:14,flexWrap:'wrap'}}>
                <div style={{width:42,height:42,borderRadius:'50%',
                  background:'#EEF3FF',color:'#1B4FD8',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:14,fontWeight:700,flexShrink:0}}>
                  {s.full_name?.slice(0,2).toUpperCase()}
                </div>
                <div style={{flex:1}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                    <span style={{fontSize:14,fontWeight:600,color:'var(--ink)'}}>{s.full_name}</span>
                    <span style={{fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:20,
                      background:rc.bg,color:rc.tc,textTransform:'capitalize'}}>
                      {s.role?.replace(/_/g,' ').toLowerCase()}
                    </span>
                  </div>
                  <div style={{display:'flex',gap:12,fontSize:12,color:'var(--ink3)'}}>
                    <span>{s.phone}</span>
                    <span style={{display:'flex',alignItems:'center',gap:3}}>
                      <Clock size={11}/> {new Date(s.created_at).toLocaleString('en-BD')}
                    </span>
                  </div>
                </div>
                <div style={{display:'flex',gap:8}}>
                  <button
                    className="btn btn-sm"
                    style={{background:'#FEF2F2',color:'#DC2626',borderColor:'#FECACA',
                      display:'flex',alignItems:'center',gap:5}}
                    disabled={processing===s.id}
                    onClick={()=>handleAction(s.id, false)}>
                    <XCircle size={13}/> Reject
                  </button>
                  <button
                    className="btn btn-sm"
                    style={{background:'#ECFDF5',color:'#16A34A',borderColor:'#86EFAC',
                      display:'flex',alignItems:'center',gap:5}}
                    disabled={processing===s.id}
                    onClick={()=>handleAction(s.id, true)}>
                    {processing===s.id
                      ? <span className="spinner" style={{width:12,height:12,borderColor:'rgba(0,0,0,.2)',borderTopColor:'#16A34A'}}/>
                      : <><CheckCircle size={13}/> Approve</>
                    }
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}