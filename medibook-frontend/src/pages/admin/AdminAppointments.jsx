import { useEffect, useState } from 'react'
import { adminAppointments } from '../../services/api'
import { Search, X, AlertTriangle, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import './AdminLayout.css'

const STATUS_BADGE = {
  PENDING:   'badge-amber',
  CONFIRMED: 'badge-blue',
  CANCELLED: 'badge-gray',
  ATTENDED:  'badge-green',
}

function ViewModal({ appt, onClose, onCancelled }) {
  const [cancelling, setCancelling]   = useState(false)
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
      <div className="card" style={{width:'100%',maxWidth:420,padding:24}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
          <div style={{fontSize:15,fontWeight:600,color:'var(--ink)'}}>Appointment details</div>
          <button className="btn btn-sm" onClick={onClose}><X size={14}/></button>
        </div>

        {/* PATIENT INFO */}
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
          {[
            ['Department', appt.dept_name, false],
            ['Date',       appt.appt_date, false],
            ['Serial',     `#${String(appt.serial_no).padStart(3,'0')}`, false],
            ['Appt ID',    appt.id?.slice(0,16)+'...', true],
          ].map(([k,v,mono],i,arr)=>(
            <div key={k} style={{
              display:'flex',justifyContent:'space-between',alignItems:'center',
              padding:'8px 0',
              borderBottom: i<arr.length-1?'1px solid var(--border)':'none'
            }}>
              <span style={{fontSize:12,color:'var(--ink3)',flexShrink:0,marginRight:12}}>{k}</span>
              <span style={{
                fontSize:mono?11:13,
                fontFamily:mono?'monospace':'inherit',
                color:k==='Serial'?'var(--primary)':'var(--ink)',
                fontWeight:k==='Serial'?700:500,
                wordBreak:'break-all',textAlign:'right'
              }}>{v}</span>
            </div>
          ))}
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingTop:8}}>
            <span style={{fontSize:12,color:'var(--ink3)'}}>Status</span>
            <span className={`badge ${STATUS_BADGE[appt.status]||'badge-gray'}`}>{appt.status}</span>
          </div>
        </div>

        {(appt.status==='PENDING'||appt.status==='CONFIRMED') && (
          !showConfirm ? (
            <button className="btn btn-full"
              style={{justifyContent:'center',marginBottom:10,color:'var(--red)',borderColor:'#FECACA',background:'var(--red-light)'}}
              onClick={()=>setShowConfirm(true)}>
              <AlertTriangle size={13}/> Emergency cancel
            </button>
          ) : (
            <div style={{background:'var(--red-light)',border:'1px solid #FECACA',borderRadius:'var(--r)',padding:14,marginBottom:10}}>
              <div style={{fontSize:13,fontWeight:600,color:'var(--red)',marginBottom:6,display:'flex',gap:6,alignItems:'center'}}>
                <AlertTriangle size={14}/> Are you sure?
              </div>
              <div style={{fontSize:12,color:'var(--red)',marginBottom:12,lineHeight:1.6}}>
                Only cancel in emergencies. Cannot be undone.
              </div>
              <div style={{display:'flex',gap:8}}>
                <button className="btn btn-sm btn-full" style={{justifyContent:'center'}} onClick={()=>setShowConfirm(false)}>Go back</button>
                <button className="btn btn-sm btn-full"
                  style={{justifyContent:'center',background:'var(--red)',color:'#fff',borderColor:'var(--red)'}}
                  onClick={handleCancel} disabled={cancelling}>
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

export default function AdminAppointments() {
  const [appts, setAppts]     = useState([])
  const [loading, setLoading] = useState(true)
  const [date, setDate]       = useState('')
  const [search, setSearch]   = useState('')
  const [viewing, setViewing] = useState(null)

  const load = () => {
    setLoading(true)
    adminAppointments({ appt_date: date || undefined, limit: 200 })
      .then(r => setAppts(r.data))
      .catch(() => toast.error('Failed to load appointments'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [date])

  const filtered = appts.filter(a =>
    !search ||
    a.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.patient_phone?.includes(search) ||
    a.dept_name?.toLowerCase().includes(search.toLowerCase()) ||
    String(a.serial_no).includes(search)
  )

  const counts = {
    total:     appts.length,
    confirmed: appts.filter(a=>a.status==='CONFIRMED').length,
    attended:  appts.filter(a=>a.status==='ATTENDED').length,
    pending:   appts.filter(a=>a.status==='PENDING').length,
    cancelled: appts.filter(a=>a.status==='CANCELLED').length,
  }

  // Export to CSV
  const exportCSV = () => {
    const rows = [
      ['Serial','Patient','Phone','Department','Date','Status'],
      ...filtered.map(a=>[
        `#${String(a.serial_no).padStart(3,'0')}`,
        a.patient_name,
        a.patient_phone,
        a.dept_name,
        a.appt_date,
        a.status,
      ])
    ]
    const csv = rows.map(r=>r.join(',')).join('\n')
    const blob = new Blob([csv], {type:'text/csv'})
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `appointments-${date||'all'}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV downloaded')
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header" style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10}}>
        <div>
          <div className="admin-page-title">Appointments</div>
          <div className="admin-page-sub">View only · emergency cancel available</div>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          <div style={{position:'relative'}}>
            <Search size={14} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--ink4)',pointerEvents:'none'}}/>
            <input className="input" style={{paddingLeft:32,width:200}}
              placeholder="Search name, phone, dept..."
              value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          <input type="date" className="input" style={{width:'auto'}}
            value={date} onChange={e=>setDate(e.target.value)}/>
          {date && <button className="btn btn-sm" onClick={()=>setDate('')}><X size={13}/> Clear</button>}
          <button className="btn btn-sm" onClick={exportCSV} style={{display:'flex',alignItems:'center',gap:5}}>
            <Download size={13}/> CSV
          </button>
        </div>
      </div>

      {/* STATUS SUMMARY */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10,marginBottom:16}}>
        {[
          {label:'Total',     val:counts.total,     bg:'#EEF3FF',tc:'#1B4FD8'},
          {label:'Confirmed', val:counts.confirmed, bg:'#EEF3FF',tc:'#1B4FD8'},
          {label:'Attended',  val:counts.attended,  bg:'#ECFDF5',tc:'#16A34A'},
          {label:'Pending',   val:counts.pending,   bg:'#FFFBEB',tc:'#D97706'},
          {label:'Cancelled', val:counts.cancelled, bg:'#FEF2F2',tc:'#DC2626'},
        ].map((s,i)=>(
          <div key={i} style={{background:'var(--white)',border:'1px solid var(--border)',borderRadius:'var(--r)',padding:'12px 14px'}}>
            <div style={{fontSize:20,fontWeight:700,color:s.tc}}>{s.val}</div>
            <div style={{fontSize:11,color:'var(--ink3)',marginTop:3}}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="admin-table-wrap">
        <div style={{padding:'10px 16px',background:'var(--bg)',borderBottom:'1px solid var(--border)',fontSize:12,color:'var(--ink3)'}}>
          Showing {filtered.length} of {appts.length} appointments
        </div>
        <div style={{overflowX:'auto'}}>
          <table className="admin-table" style={{minWidth:680}}>
            <thead><tr>
              <th>Serial</th>
              <th>Patient</th>
              <th>Phone</th>
              <th>Department</th>
              <th>Date</th>
              <th>Status</th>
              <th>View</th>
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{textAlign:'center',padding:40}}>
                  <span className="spinner spinner-dark"/>
                </td></tr>
              ) : filtered.length===0 ? (
                <tr><td colSpan={7} style={{textAlign:'center',padding:40,color:'var(--ink4)'}}>
                  No appointments found
                </td></tr>
              ) : filtered.map(a=>(
                <tr key={a.id}>
                  <td style={{fontWeight:700,color:'var(--primary)'}}>
                    #{String(a.serial_no).padStart(3,'0')}
                  </td>
                  <td>
                    <div style={{fontWeight:600,color:'var(--ink)',fontSize:13}}>{a.patient_name}</div>
                  </td>
                  <td style={{fontFamily:'monospace',fontSize:12,color:'var(--ink3)'}}>{a.patient_phone}</td>
                  <td>
                    <div style={{fontSize:13,color:'var(--ink)'}}>{a.dept_name}</div>
                  </td>
                  <td style={{fontSize:12,whiteSpace:'nowrap'}}>{a.appt_date}</td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[a.status]||'badge-gray'}`}>
                      {a.status}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-sm" onClick={()=>setViewing(a)}>View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {viewing && (
        <ViewModal appt={viewing} onClose={()=>setViewing(null)} onCancelled={load}/>
      )}
    </div>
  )
}