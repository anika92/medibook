import { useEffect, useState } from 'react'
import { Search, User, Phone, Droplet, Calendar, Hash } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import './AdminLayout.css'

export default function AdminPatients() {
  const [patients, setPatients] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    api.get('/patients/admin/all', { params: { limit: 200 } })
      .then(r => setPatients(r.data))
      .catch(() => toast.error('Failed to load patients'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = patients.filter(p =>
    !search ||
    p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.phone?.includes(search) ||
    p.blood_group?.includes(search)
  )

  const BLOOD_COLOR = {
    'A+':'#EEF3FF','A-':'#EEF3FF',
    'B+':'#ECFDF5','B-':'#ECFDF5',
    'O+':'#FFFBEB','O-':'#FFFBEB',
    'AB+':'#F5F3FF','AB-':'#F5F3FF',
  }
  const BLOOD_TEXT = {
    'A+':'#1B4FD8','A-':'#1B4FD8',
    'B+':'#0EA472','B-':'#0EA472',
    'O+':'#D97706','O-':'#D97706',
    'AB+':'#7C3AED','AB-':'#7C3AED',
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header" style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <div className="admin-page-title">Patient records</div>
          <div className="admin-page-sub">
            {patients.length} registered patients · NID stored as hash only
          </div>
        </div>
        <div style={{position:'relative'}}>
          <Search size={14} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--ink4)',pointerEvents:'none'}}/>
          <input
            className="input"
            style={{paddingLeft:30,width:220}}
            placeholder="Search name, phone, blood..."
            value={search}
            onChange={e=>setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* STATS */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:16}}>
        {[
          {label:'Total patients', val:patients.length, bg:'#EEF3FF', tc:'#1B4FD8'},
          {label:'A+ / A-',  val:patients.filter(p=>p.blood_group?.startsWith('A')).length, bg:'#EEF3FF', tc:'#1B4FD8'},
          {label:'B+ / B-',  val:patients.filter(p=>p.blood_group?.startsWith('B')).length, bg:'#ECFDF5', tc:'#0EA472'},
          {label:'O+ / O-',  val:patients.filter(p=>p.blood_group?.startsWith('O')).length, bg:'#FFFBEB', tc:'#D97706'},
        ].map((s,i)=>(
          <div key={i} className="admin-stat">
            <div className="admin-stat-icon" style={{background:s.bg,color:s.tc,fontSize:18,fontWeight:700}}>
              {i===0 ? <User size={18}/> : s.label.split('/')[0].trim()}
            </div>
            <div className="admin-stat-val">{s.val}</div>
            <div className="admin-stat-lbl">{s.label}</div>
          </div>
        ))}
      </div>

      {/* TABLE */}
      <div className="admin-table-wrap">
       <table className="admin-table" style={{minWidth:780,tableLayout:'fixed',width:'100%'}}>
          <colgroup>
  <col style={{width:44}}/>
  <col/>
  <col style={{width:120}}/>
  <col style={{width:100}}/>
  <col style={{width:64}}/>
  <col style={{width:110}}/>
  <col style={{width:64}}/>
  <col style={{width:90}}/>
</colgroup>
          <thead><tr>
  <th></th>
  <th>Name</th>
  <th>Phone</th>
  <th>NID hash</th>
  <th>Blood</th>
  <th>Registered</th>
  <th style={{textAlign:'center'}}>Appts</th>
  <th>Details</th>
</tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{textAlign:'center',padding:40}}>
                <span className="spinner spinner-dark"/>
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} style={{textAlign:'center',padding:40,color:'var(--ink4)'}}>
                No patients found
              </td></tr>
            ) : filtered.map(p=>(
              <tr key={p.id}>
                <td>
                  <div style={{
                    width:30,height:30,borderRadius:'50%',
                    background:'#EEF3FF',color:'#1B4FD8',
                    display:'flex',alignItems:'center',justifyContent:'center',
                    fontSize:11,fontWeight:700
                  }}>
                    {p.full_name?.slice(0,2).toUpperCase()}
                  </div>
                </td>
                <td style={{fontWeight:600,color:'var(--ink)'}}>{p.full_name}</td>
                <td style={{fontFamily:'monospace',fontSize:12}}>{p.phone}</td>
                <td style={{fontFamily:'monospace',fontSize:11,color:'var(--ink4)'}}>
                  {p.nid_hash?.slice(0,8)}...
                </td>
                <td>
                  {p.blood_group ? (
                    <span style={{
                      fontSize:11,fontWeight:700,padding:'2px 7px',borderRadius:20,
                      background: BLOOD_COLOR[p.blood_group] || '#F1F5F9',
                      color: BLOOD_TEXT[p.blood_group] || '#475569'
                    }}>
                      {p.blood_group}
                    </span>
                  ) : (
                    <span style={{color:'var(--ink4)',fontSize:12}}>—</span>
                  )}
                </td>
                <td style={{fontSize:12,color:'var(--ink3)'}}>
                  {p.created_at ? new Date(p.created_at).toLocaleDateString('en-BD') : '—'}
                </td>
                <td style={{fontWeight:700,color:'var(--primary)',textAlign:'center'}}>
                  {p.appointment_count ?? '—'}
                </td>
            <td>
  <button
    onClick={()=>setSelected(p)}
    style={{
      display:'inline-flex',alignItems:'center',gap:4,
      padding:'5px 12px',borderRadius:'var(--r)',
      fontSize:11,fontWeight:600,cursor:'pointer',
      background:'var(--white)',color:'var(--ink2)',
      border:'1px solid var(--border)',fontFamily:'inherit',
      whiteSpace:'nowrap',transition:'background .12s',
      width:'100%',justifyContent:'center'
    }}
    onMouseOver={e=>e.currentTarget.style.background='var(--bg)'}
    onMouseOut={e=>e.currentTarget.style.background='var(--white)'}
  >
    View
  </button>
</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* DETAIL MODAL */}
      {selected && (
        <div style={{
          position:'fixed',inset:0,background:'rgba(0,0,0,.4)',
          display:'flex',alignItems:'center',justifyContent:'center',
          zIndex:1000,padding:20
        }}>
          <div className="card" style={{width:'100%',maxWidth:420,padding:24}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
              <div style={{fontSize:15,fontWeight:600,color:'var(--ink)'}}>Patient details</div>
              <button className="btn btn-sm" onClick={()=>setSelected(null)}>✕</button>
            </div>

            {/* AVATAR */}
            <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:18,paddingBottom:16,borderBottom:'1px solid var(--border)'}}>
              <div style={{
                width:52,height:52,borderRadius:'50%',
                background:'#EEF3FF',color:'#1B4FD8',
                display:'flex',alignItems:'center',justifyContent:'center',
                fontSize:18,fontWeight:700,flexShrink:0
              }}>
                {selected.full_name?.slice(0,2).toUpperCase()}
              </div>
              <div>
                <div style={{fontSize:16,fontWeight:600,color:'var(--ink)'}}>{selected.full_name}</div>
                <div style={{fontSize:12,color:'var(--ink3)',marginTop:2}}>Patient</div>
              </div>
            </div>

            {/* DETAILS */}
            <div style={{display:'flex',flexDirection:'column',gap:0}}>
              {[
                { icon:<Phone size={14}/>,    label:'Phone',        val: selected.phone },
                { icon:<Hash size={14}/>,     label:'NID hash',     val: selected.nid_hash?.slice(0,16)+'...', mono:true },
                { icon:<Droplet size={14}/>,  label:'Blood group',  val: selected.blood_group || '—' },
                { icon:<Calendar size={14}/>, label:'Date of birth',val: selected.date_of_birth || '—' },
                { icon:<User size={14}/>,     label:'Address',      val: selected.address || '—' },
                { icon:<Calendar size={14}/>, label:'Registered',   val: selected.created_at ? new Date(selected.created_at).toLocaleDateString('en-BD') : '—' },
              ].map((r,i)=>(
                <div key={i} style={{
                  display:'flex',alignItems:'center',gap:10,
                  padding:'10px 0',
                  borderBottom: i<5 ? '1px solid var(--border)' : 'none'
                }}>
                  <div style={{color:'var(--ink4)',flexShrink:0}}>{r.icon}</div>
                  <div style={{color:'var(--ink3)',fontSize:12,width:90,flexShrink:0}}>{r.label}</div>
                  <div style={{
                    fontSize: r.mono ? 11 : 13,
                    fontFamily: r.mono ? 'monospace' : 'inherit',
                    color:'var(--ink)',fontWeight:500,
                    wordBreak:'break-all'
                  }}>
                    {r.val}
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              marginTop:14,padding:'10px 14px',
              background:'var(--bg)',borderRadius:'var(--r)',
              fontSize:11,color:'var(--ink4)',textAlign:'center'
            }}>
              Raw NID is never stored — SHA-256 hash only
            </div>

            <button
              className="btn btn-full"
              style={{marginTop:12,justifyContent:'center'}}
              onClick={()=>setSelected(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}