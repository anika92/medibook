import { useEffect, useState } from 'react'
import { getDepartments, updateDepartment, createDepartment } from '../../services/api'
import { ChevronDown, ChevronUp, Plus, Check, RotateCcw, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import './AdminLayout.css'

const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

function DeptEditor({ dept, onSave }) {
  const { user } = useAuth()
  const canEdit = user?.role === 'SUPER_ADMIN' || user?.role === 'DEPT_MANAGER'

  const [open, setOpen]         = useState(false)
  const [sel, setSel]           = useState(dept.schedules?.map(s=>s.day_of_week) || [])
  const [ot, setOt]             = useState(dept.schedules?.[0]?.open_time?.slice(0,5) || '09:00')
  const [ct, setCt]             = useState(dept.schedules?.[0]?.close_time?.slice(0,5) || '14:00')
  const [slots, setSlots]       = useState(dept.daily_max_slots)
  const [active, setActive]     = useState(dept.is_active)
  const [saving, setSaving]     = useState(false)
  const [toggling, setToggling] = useState(false)

  const toggle = (i) => setSel(s => s.includes(i) ? s.filter(x=>x!==i) : [...s,i])

  const save = async () => {
    setSaving(true)
    try {
      const schedules = sel.map(d => ({
        day_of_week: d,
        open_time: ot + ':00',
        close_time: ct + ':00'
      }))
      await updateDepartment(dept.id, {
        daily_max_slots: +slots,
        is_active: active,
        schedules
      })
      toast.success(`${dept.name} saved`)
      onSave()
      setOpen(false)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const reset = () => {
    setSel(dept.schedules?.map(s=>s.day_of_week) || [])
    setOt(dept.schedules?.[0]?.open_time?.slice(0,5) || '09:00')
    setCt(dept.schedules?.[0]?.close_time?.slice(0,5) || '14:00')
    setSlots(dept.daily_max_slots)
    setActive(dept.is_active)
  }

  const quickToggle = async (e) => {
    e.stopPropagation()
    if (!canEdit) return
    setToggling(true)
    try {
      await updateDepartment(dept.id, { is_active: !active })
      setActive(v => !v)
      toast.success(`${dept.name} ${!active ? 'activated' : 'deactivated'}`)
      onSave()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update')
    } finally {
      setToggling(false)
    }
  }

  return (
    <div style={{
      background:'var(--white)',
      border:`1px solid ${open?'var(--primary)':'var(--border)'}`,
      borderRadius:'var(--rl)',
      marginBottom:10,
      overflow:'visible',
      transition:'border-color .15s'
    }}>
      {/* HEADER */}
      <div
        style={{display:'flex',alignItems:'center',gap:12,padding:'14px 18px',cursor:'pointer',userSelect:'none'}}
        onClick={()=>setOpen(o=>!o)}
      >
        <div style={{
          width:10,height:10,borderRadius:'50%',flexShrink:0,
          background:active?'#0EA472':'#9CA3AF',
          boxShadow:active?'0 0 0 3px rgba(14,164,114,.15)':'none',
          transition:'all .2s'
        }}/>
        <div style={{flex:1}}>
          <div style={{fontSize:14,fontWeight:600,color:'var(--ink)'}}>{dept.name}</div>
          <div style={{fontSize:11,color:'var(--ink4)',marginTop:2}}>
            {sel.length>0?sel.map(i=>DAYS[i]).join(' · '):'No days set'}
            &nbsp;·&nbsp;{ot} – {ct}
            &nbsp;·&nbsp;{slots} slots/day
          </div>
        </div>

        {/* Active/Inactive toggle — only for canEdit roles */}
        {canEdit && (
          <button
            onClick={quickToggle}
            disabled={toggling}
            style={{
              padding:'4px 12px',borderRadius:20,fontSize:11,fontWeight:600,
              cursor:'pointer',border:'1px solid',fontFamily:'inherit',transition:'all .15s',
              background:active?'#ECFDF5':'#F1F5F9',
              color:active?'#16A34A':'#64748B',
              borderColor:active?'#86EFAC':'#CBD5E1',
            }}
            onMouseOver={e=>e.currentTarget.style.background=active?'#DCFCE7':'#E2E8F0'}
            onMouseOut={e=>e.currentTarget.style.background=active?'#ECFDF5':'#F1F5F9'}
          >
            {toggling?'...':active?'Active':'Inactive'}
          </button>
        )}

        {/* View-only badge for non-edit roles */}
        {!canEdit && (
          <span style={{
            padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:600,
            background:active?'#ECFDF5':'#F1F5F9',
            color:active?'#16A34A':'#64748B',
          }}>
            {active?'Active':'Inactive'}
          </span>
        )}

        {open
          ? <ChevronUp size={16} style={{color:'var(--ink4)',flexShrink:0}}/>
          : <ChevronDown size={16} style={{color:'var(--ink4)',flexShrink:0}}/>
        }
      </div>

      {/* EDITOR BODY */}
      {open && (
        <div style={{borderTop:'1px solid var(--border)',padding:20,background:'#FAFBFD'}}>
          <div style={{fontSize:11,fontWeight:600,color:'var(--ink2)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:10}}>
            Working days {canEdit && '— click to toggle'}
          </div>
          <div style={{display:'flex',gap:6,marginBottom:20}}>
            {DAYS.map((d,i)=>(
              <button
                key={i}
                onClick={()=>canEdit && toggle(i)}
                style={{
                  width:46,height:50,borderRadius:9,
                  border:`1.5px solid ${sel.includes(i)?'var(--primary)':'var(--border)'}`,
                  background:sel.includes(i)?'var(--primary-light)':'var(--white)',
                  cursor:canEdit?'pointer':'default',
                  display:'flex',flexDirection:'column',
                  alignItems:'center',justifyContent:'center',gap:2,
                  transition:'all .15s',
                  opacity:canEdit?1:0.7,
                }}
              >
                <span style={{fontSize:9,fontWeight:700,color:sel.includes(i)?'var(--primary)':'var(--ink4)'}}>
                  {d.toUpperCase()}
                </span>
                <span style={{fontSize:14,fontWeight:700,color:sel.includes(i)?'var(--primary)':'var(--ink)'}}>
                  {i+1}
                </span>
              </button>
            ))}
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:16}}>
            <div>
              <div style={{fontSize:11,fontWeight:600,color:'var(--ink2)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:5}}>Opening time</div>
              <input className="input" type="time" value={ot}
                onChange={e=>canEdit&&setOt(e.target.value)} readOnly={!canEdit}/>
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:600,color:'var(--ink2)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:5}}>Closing time</div>
              <input className="input" type="time" value={ct}
                onChange={e=>canEdit&&setCt(e.target.value)} readOnly={!canEdit}/>
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:600,color:'var(--ink2)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:5}}>Max slots / day</div>
              <input className="input" type="number" value={slots}
                onChange={e=>canEdit&&setSlots(e.target.value)} readOnly={!canEdit}
                min={1} max={500}/>
            </div>
          </div>

          {/* Save/Reset — only for canEdit roles */}
          {canEdit && (
            <div style={{display:'flex',alignItems:'center',justifyContent:'flex-end',gap:8}}>
              <button
                onClick={reset}
                style={{
                  display:'inline-flex',alignItems:'center',gap:6,
                  padding:'7px 14px',borderRadius:'var(--r)',
                  fontSize:12,fontWeight:600,cursor:'pointer',
                  background:'var(--red-light)',color:'var(--red)',
                  border:'1px solid #FECACA',fontFamily:'inherit',transition:'background .15s'
                }}
                onMouseOver={e=>e.currentTarget.style.background='#FEE2E2'}
                onMouseOut={e=>e.currentTarget.style.background='var(--red-light)'}
              >
                <RotateCcw size={13}/> Reset
              </button>
              <button
                onClick={save}
                disabled={saving}
                style={{
                  display:'inline-flex',alignItems:'center',gap:6,
                  padding:'7px 16px',borderRadius:'var(--r)',
                  fontSize:12,fontWeight:600,cursor:saving?'not-allowed':'pointer',
                  background:'#0EA472',color:'#fff',
                  border:'1px solid #0EA472',fontFamily:'inherit',
                  opacity:saving?.7:1,transition:'background .15s, opacity .15s'
                }}
                onMouseOver={e=>{ if(!saving) e.currentTarget.style.background='#059669' }}
                onMouseOut={e=>{ e.currentTarget.style.background='#0EA472' }}
              >
                {saving
                  ? <><span style={{width:12,height:12,border:'2px solid rgba(255,255,255,.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin .7s linear infinite',display:'inline-block'}}/> Saving...</>
                  : <><Check size={13}/> Save schedule</>
                }
              </button>
            </div>
          )}

          {/* View-only notice for receptionist */}
          {!canEdit && (
            <div style={{
              padding:'8px 12px',background:'var(--bg)',borderRadius:'var(--r)',
              fontSize:11,color:'var(--ink4)',textAlign:'center'
            }}>
              View only — contact your administrator to make changes
            </div>
          )}
        </div>
      )}
    </div>
  )
}


function CreateDeptModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name:'', code:'', daily_max_slots:100 })
  const [sel, setSel]   = useState([])
  const [ot, setOt]     = useState('09:00')
  const [ct, setCt]     = useState('14:00')
  const [saving, setSaving] = useState(false)

  const toggle = (i) => setSel(s => s.includes(i) ? s.filter(x=>x!==i) : [...s,i])
  const set    = k => e => setForm(f=>({...f,[k]:e.target.value}))

  const handleCreate = async (e) => {
    e.preventDefault()
    if (sel.length === 0) { toast.error('Select at least one working day'); return }
    setSaving(true)
    try {
      await createDepartment({
        name: form.name,
        code: form.code.toUpperCase(),
        daily_max_slots: +form.daily_max_slots,
        schedules: sel.map(d=>({ day_of_week:d, open_time:ot+':00', close_time:ct+':00' })),
      })
      toast.success(`${form.name} created!`)
      onCreated()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:20}}>
      <div className="card" style={{width:'100%',maxWidth:520,padding:24,maxHeight:'90vh',overflowY:'auto'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
          <div style={{fontSize:16,fontWeight:600,color:'var(--ink)'}}>New department</div>
          <button className="btn btn-sm" onClick={onClose}><X size={14}/></button>
        </div>
        <form onSubmit={handleCreate}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div className="input-group">
              <label>Department name *</label>
              <input className="input" placeholder="e.g. Medicine Ward" value={form.name} onChange={set('name')} required/>
            </div>
            <div className="input-group">
              <label>Code *</label>
              <input className="input" placeholder="e.g. MED" value={form.code} onChange={set('code')} required maxLength={10}/>
            </div>
          </div>
          <div className="input-group">
            <label>Max slots per day *</label>
            <input className="input" type="number" value={form.daily_max_slots} onChange={set('daily_max_slots')} min={1} max={500} required/>
          </div>
          <div style={{fontSize:11,fontWeight:600,color:'var(--ink2)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:10}}>
            Working days *
          </div>
          <div style={{display:'flex',gap:6,marginBottom:20}}>
            {DAYS.map((d,i)=>(
              <button key={i} type="button" onClick={()=>toggle(i)} style={{
                width:46,height:50,borderRadius:9,
                border:`1.5px solid ${sel.includes(i)?'var(--primary)':'var(--border)'}`,
                background:sel.includes(i)?'var(--primary-light)':'var(--white)',
                cursor:'pointer',display:'flex',flexDirection:'column',
                alignItems:'center',justifyContent:'center',gap:2,transition:'all .15s'
              }}>
                <span style={{fontSize:9,fontWeight:700,color:sel.includes(i)?'var(--primary)':'var(--ink4)'}}>{d.toUpperCase()}</span>
                <span style={{fontSize:14,fontWeight:700,color:sel.includes(i)?'var(--primary)':'var(--ink)'}}>{i+1}</span>
              </button>
            ))}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:20}}>
            <div className="input-group" style={{marginBottom:0}}>
              <label>Opening time</label>
              <input className="input" type="time" value={ot} onChange={e=>setOt(e.target.value)}/>
            </div>
            <div className="input-group" style={{marginBottom:0}}>
              <label>Closing time</label>
              <input className="input" type="time" value={ct} onChange={e=>setCt(e.target.value)}/>
            </div>
          </div>
          <div style={{display:'flex',gap:10}}>
            <button type="button" className="btn btn-full" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={saving} style={{
              flex:1,display:'inline-flex',alignItems:'center',justifyContent:'center',gap:6,
              padding:'10px 16px',borderRadius:'var(--r)',
              fontSize:13,fontWeight:600,cursor:saving?'not-allowed':'pointer',
              background:'var(--primary)',color:'#fff',
              border:'1px solid var(--primary)',fontFamily:'inherit',opacity:saving?.7:1
            }}
              onMouseOver={e=>{ if(!saving) e.currentTarget.style.background='var(--primary-hover)' }}
              onMouseOut={e=>{ e.currentTarget.style.background='var(--primary)' }}
            >
              {saving
                ? <><span style={{width:14,height:14,border:'2px solid rgba(255,255,255,.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin .7s linear infinite',display:'inline-block'}}/> Creating...</>
                : <><Plus size={14}/> Create department</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


export default function AdminDepartments() {
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'

  const [depts, setDepts]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)

  const load = () => {
    setLoading(true)
    getDepartments()
      .then(r => setDepts(r.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  return (
    <div className="admin-page">
      <div className="admin-page-header" style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <div className="admin-page-title">Departments & schedule</div>
          <div className="admin-page-sub">
            {isSuperAdmin
              ? 'Click any department to edit — use the badge to activate/deactivate'
              : 'Your assigned department schedule'
            }
          </div>
        </div>

        {/* Add button — super admin only */}
        {isSuperAdmin && (
          <button
            style={{
              display:'inline-flex',alignItems:'center',gap:6,
              padding:'8px 16px',borderRadius:'var(--r)',
              fontSize:13,fontWeight:600,cursor:'pointer',
              background:'var(--primary)',color:'#fff',
              border:'1px solid var(--primary)',fontFamily:'inherit'
            }}
            onMouseOver={e=>e.currentTarget.style.background='var(--primary-hover)'}
            onMouseOut={e=>e.currentTarget.style.background='var(--primary)'}
            onClick={()=>setShowModal(true)}
          >
            <Plus size={14}/> Add department
          </button>
        )}
      </div>

      {loading ? (
        <div style={{textAlign:'center',padding:40}}>
          <span className="spinner spinner-dark"/>
        </div>
      ) : depts.length === 0 ? (
        <div style={{textAlign:'center',padding:'60px 20px',background:'var(--white)',borderRadius:'var(--rl)',border:'1px solid var(--border)'}}>
          <div style={{fontSize:40,marginBottom:12}}>🏥</div>
          <div style={{fontSize:15,fontWeight:600,color:'var(--ink)',marginBottom:6}}>No departments yet</div>
          <div style={{fontSize:13,color:'var(--ink3)',marginBottom:20}}>
            {isSuperAdmin ? 'Create your first department to start accepting bookings' : 'No department assigned to you yet. Contact administrator.'}
          </div>
          {isSuperAdmin && (
            <button
              style={{
                display:'inline-flex',alignItems:'center',gap:6,
                padding:'9px 18px',borderRadius:'var(--r)',
                fontSize:13,fontWeight:600,cursor:'pointer',
                background:'var(--primary)',color:'#fff',
                border:'1px solid var(--primary)',fontFamily:'inherit'
              }}
              onClick={()=>setShowModal(true)}
            >
              <Plus size={14}/> Add first department
            </button>
          )}
        </div>
      ) : (
        depts.map(d => <DeptEditor key={d.id} dept={d} onSave={load}/>)
      )}

      {showModal && isSuperAdmin && (
        <CreateDeptModal
          onClose={()=>setShowModal(false)}
          onCreated={load}
        />
      )}
    </div>
  )
}