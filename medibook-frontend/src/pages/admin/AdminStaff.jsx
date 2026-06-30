import { useEffect, useState } from 'react'
import { getStaff, createStaff, getDepartments } from '../../services/api'
import { Plus, X, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import './AdminLayout.css'

const ROLE_BADGE = {
  SUPER_ADMIN:  'badge-blue',
  RECEPTIONIST: 'badge-gray',
  DEPT_MANAGER: 'badge-green',
  FINANCE:      'badge-amber',
}

function StaffModal({ staff, onClose, onSaved }) {
  const isEdit = !!staff
  const [form, setForm] = useState({
    full_name: staff?.full_name || '',
    phone:     staff?.phone || '',
    password:  '',
    role:      staff?.role || 'RECEPTIONIST',
    dept_id:   staff?.dept_id || '',
    is_active: staff?.is_active ?? true,
  })
  const [depts, setDepts]   = useState([])
  const [saving, setSaving] = useState(false)
  const set = k => e => setForm(f=>({...f,[k]:e.target.value}))

  useEffect(()=>{
    getDepartments().then(r=>setDepts(r.data)).catch(()=>{})
  },[])

  const handleSave = async e => {
    e.preventDefault()
    // Require dept for dept manager
    if (form.role === 'DEPT_MANAGER' && !form.dept_id) {
      toast.error('Please assign a department for this manager')
      return
    }
    setSaving(true)
    try {
      if (isEdit) {
        await api.put(`/staff/${staff.id}`, {
          full_name: form.full_name,
          role:      form.role,
          dept_id:   form.role === 'DEPT_MANAGER' ? form.dept_id : null,
          is_active: form.is_active,
        })
        toast.success('Staff updated')
      } else {
        await createStaff({
          full_name: form.full_name,
          phone:     form.phone,
          password:  form.password,
          role:      form.role,
          dept_id:   form.role === 'DEPT_MANAGER' ? form.dept_id : null,
        })
        toast.success('Staff created')
      }
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:20}}>
      <div className="card" style={{width:'100%',maxWidth:440,padding:24}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
          <div style={{fontSize:15,fontWeight:600,color:'var(--ink)'}}>{isEdit?'Edit staff':'New staff member'}</div>
          <button className="btn btn-sm" onClick={onClose}><X size={14}/></button>
        </div>
        <form onSubmit={handleSave}>
          <div className="input-group">
            <label>Full name</label>
            <input className="input" required value={form.full_name} onChange={set('full_name')} placeholder="Dr. Salam"/>
          </div>
          {!isEdit && <>
            <div className="input-group">
              <label>Phone</label>
              <input className="input" type="tel" required value={form.phone} onChange={set('phone')} placeholder="01XXXXXXXXX"/>
            </div>
            <div className="input-group">
              <label>Password</label>
              <input className="input" type="password" required minLength={8} value={form.password} onChange={set('password')} placeholder="Min 8 characters"/>
            </div>
          </>}

          <div className="input-group">
            <label>Role</label>
            <select className="input" value={form.role} onChange={set('role')}>
              <option value="RECEPTIONIST">Receptionist — QR scanner only</option>
              <option value="DEPT_MANAGER">Dept. manager — own dept only</option>
              <option value="FINANCE">Finance — payments and reports</option>
              <option value="SUPER_ADMIN">Super admin — full access</option>
            </select>
          </div>

          {/* Show department selector only for DEPT_MANAGER */}
          {form.role === 'DEPT_MANAGER' && (
            <div className="input-group">
              <label>Assigned department *</label>
              <select className="input" value={form.dept_id} onChange={set('dept_id')} required>
                <option value="">Select department...</option>
                {depts.map(d=>(
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <div style={{fontSize:11,color:'var(--ink4)',marginTop:4}}>
                This manager will only see and edit this department
              </div>
            </div>
          )}

          {isEdit && (
            <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',marginBottom:16,fontSize:13,fontWeight:500,color:'var(--ink2)'}}>
              <input type="checkbox" checked={form.is_active}
                onChange={e=>setForm(f=>({...f,is_active:e.target.checked}))}
                style={{width:16,height:16,accentColor:'var(--primary)'}}/>
              Account active
            </label>
          )}

          <div style={{display:'flex',gap:10,marginTop:8}}>
            <button type="button" className="btn btn-full" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-full" disabled={saving}>
              {saving?<span className="spinner"/>:isEdit?'Save changes':'Create staff'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminStaff() {
  const [staff, setStaff]     = useState([])
  const [depts, setDepts]     = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(null)

  const load = () => {
    getStaff().then(r=>setStaff(r.data)).finally(()=>setLoading(false))
    getDepartments().then(r=>setDepts(r.data)).catch(()=>{})
  }
  useEffect(()=>{ load() },[])

  // Helper to get dept name from dept_id
  const getDeptName = (deptId) => {
    if (!deptId) return '—'
    const dept = depts.find(d => d.id === deptId)
    return dept?.name || '—'
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header" style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <div className="admin-page-title">Staff members</div>
          <div className="admin-page-sub">Manage staff accounts and permissions</div>
        </div>
        <button className="btn btn-primary" onClick={()=>setModal('create')}>
          <Plus size={14}/> Add staff
        </button>
      </div>

      <div className="admin-table-wrap">
        <div style={{overflowX:'auto'}}>
          <table className="admin-table" style={{minWidth:600}}>
            <thead><tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Department</th>
              <th>Status</th>
              <th>Actions</th>
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{textAlign:'center',padding:30}}>
                  <span className="spinner spinner-dark"/>
                </td></tr>
              ) : staff.map(s=>(
                <tr key={s.id}>
                  <td style={{fontWeight:600}}>{s.full_name}</td>
                  <td style={{fontFamily:'monospace',fontSize:12}}>{s.phone}</td>
                  <td>
                    <span className={`badge ${ROLE_BADGE[s.role]||'badge-gray'}`}>
                      {s.role?.replace(/_/g,' ').toLowerCase()}
                    </span>
                  </td>
                  <td style={{fontSize:12,color: s.role==='DEPT_MANAGER'?'var(--ink)':'var(--ink4)'}}>
                    {s.role === 'DEPT_MANAGER' ? getDeptName(s.dept_id) : '—'}
                  </td>
                  <td>
                    <span className={`badge ${s.is_active?'badge-green':'badge-gray'}`}>
                      {s.is_active?'Active':'Inactive'}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-sm" onClick={()=>setModal(s)}>
                      <Pencil size={12}/> Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <StaffModal
          staff={modal==='create'?null:modal}
          onClose={()=>setModal(null)}
          onSaved={load}
        />
      )}
    </div>
  )
}