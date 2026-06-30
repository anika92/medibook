import { useEffect, useState } from 'react'
import { adminPayments } from '../../services/api'
import { X, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import './AdminLayout.css'

// Fixed — uppercase keys to match DB enum
const STATUS = {
  PENDING:  'badge-amber',
  VERIFIED: 'badge-green',
  FAILED:   'badge-red',
  REFUNDED: 'badge-gray',
  // lowercase fallback
  pending:  'badge-amber',
  verified: 'badge-green',
  failed:   'badge-red',
  refunded: 'badge-gray',
}

function EditPaymentModal({ payment, onClose, onSaved }) {
  const [trxId, setTrxId]   = useState(payment.bkash_trx_id || '')
  const [saving, setSaving] = useState(false)

  const handleVerify = async () => {
    if (!trxId.trim()) { toast.error('Enter a transaction ID'); return }
    setSaving(true)
    try {
      await api.post(`/payments/admin/verify-manual/${payment.appt_id}`, null, {
        params: { bkash_trx_id: trxId }
      })
      toast.success('Payment verified successfully')
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Verification failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:20}}>
      <div className="card" style={{width:'100%',maxWidth:420,padding:24}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
          <div style={{fontSize:15,fontWeight:600,color:'var(--ink)'}}>Verify payment</div>
          <button className="btn btn-sm" onClick={onClose}><X size={14}/></button>
        </div>
        <div style={{background:'var(--bg)',borderRadius:'var(--r)',padding:'12px 14px',marginBottom:16}}>
          <div style={{display:'flex',flexDirection:'column',gap:6,fontSize:13}}>
            <div style={{display:'flex',justifyContent:'space-between'}}>
              <span style={{color:'var(--ink3)'}}>Appointment</span>
              <span style={{fontFamily:'monospace',fontSize:11}}>{payment.appt_id?.slice(0,16)}...</span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between'}}>
              <span style={{color:'var(--ink3)'}}>Amount</span>
              <span style={{fontWeight:700}}>৳{payment.amount_bdt}</span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between'}}>
              <span style={{color:'var(--ink3)'}}>Current status</span>
              <span className={`badge ${STATUS[payment.status]||'badge-gray'}`}>{payment.status}</span>
            </div>
          </div>
        </div>
        <div className="input-group">
          <label>bKash transaction ID</label>
          <input className="input" placeholder="e.g. AB5XY1234Z"
            value={trxId} onChange={e=>setTrxId(e.target.value)}/>
          <div style={{fontSize:11,color:'var(--ink4)',marginTop:4}}>
            Enter the bKash Trx ID to manually verify this payment
          </div>
        </div>
        <div style={{display:'flex',gap:10,marginTop:8}}>
          <button className="btn btn-full" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-full" onClick={handleVerify} disabled={saving}>
            {saving?<span className="spinner"/>:<><RefreshCw size={13}/> Verify payment</>}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminPayments() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading]   = useState(true)
  const [editing, setEditing]   = useState(null)
  const [filter, setFilter]     = useState('')

  const load = () => {
    adminPayments({ limit:100 })
      .then(r=>setPayments(r.data))
      .finally(()=>setLoading(false))
  }
  useEffect(()=>{ load() },[])

  const filtered = filter ? payments.filter(p=>p.status===filter) : payments

  // Fixed — use uppercase for totals
  const total   = payments.filter(p=>p.status==='VERIFIED'||p.status==='verified').reduce((s,p)=>s+p.amount_bdt,0)
  const pending = payments.filter(p=>p.status==='PENDING'||p.status==='pending').length

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div className="admin-page-title">Payments</div>
        <div className="admin-page-sub">bKash transaction log</div>
      </div>

      <div className="admin-stats" style={{gridTemplateColumns:'repeat(3,1fr)',marginBottom:16}}>
        <div className="admin-stat">
          <div className="admin-stat-icon" style={{background:'#ECFDF5',color:'#0EA472',fontSize:18}}>৳</div>
          <div className="admin-stat-val">৳{total}</div>
          <div className="admin-stat-lbl">Total verified</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat-icon" style={{background:'#FFFBEB',color:'#D97706',fontSize:18}}>!</div>
          <div className="admin-stat-val">{pending}</div>
          <div className="admin-stat-lbl">Pending</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat-icon" style={{background:'#EEF3FF',color:'#1B4FD8',fontSize:18}}>#</div>
          <div className="admin-stat-val">{payments.length}</div>
          <div className="admin-stat-lbl">Total transactions</div>
        </div>
      </div>

      <div className="admin-table-wrap">
        <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',display:'flex',gap:8,flexWrap:'wrap'}}>
          {[
            {val:'', label:'All'},
            {val:'PENDING', label:'Pending'},
            {val:'VERIFIED', label:'Verified'},
            {val:'FAILED', label:'Failed'},
            {val:'REFUNDED', label:'Refunded'},
          ].map(s=>(
            <button key={s.val}
              className={`btn btn-sm ${filter===s.val?'btn-primary':''}`}
              onClick={()=>setFilter(s.val)}>
              {s.label}
            </button>
          ))}
        </div>
        <div style={{overflowX:'auto'}}>
          <table className="admin-table" style={{minWidth:560}}>
            <thead><tr>
              <th>Trx ID</th><th>Appointment</th><th>Amount</th>
              <th>Paid at</th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {loading
                ? <tr><td colSpan={6} style={{textAlign:'center',padding:30}}><span className="spinner spinner-dark"/></td></tr>
                : filtered.length===0
                  ? <tr><td colSpan={6} style={{textAlign:'center',padding:30,color:'var(--ink4)'}}>No transactions found</td></tr>
                  : filtered.map(p=>(
                    <tr key={p.id}>
                      <td style={{fontFamily:'monospace',fontSize:11}}>{p.bkash_trx_id||'—'}</td>
                      <td style={{fontFamily:'monospace',fontSize:11,color:'var(--ink4)'}}>{p.appt_id?.slice(0,8)}</td>
                      <td style={{fontWeight:700}}>৳{p.amount_bdt}</td>
                      <td style={{fontSize:11,color:'var(--ink3)'}}>
                        {p.paid_at?new Date(p.paid_at).toLocaleString('en-BD'):'—'}
                      </td>
                      <td><span className={`badge ${STATUS[p.status]||'badge-gray'}`}>{p.status}</span></td>
                      <td>
                        <button className="btn btn-sm" onClick={()=>setEditing(p)}>Edit</button>
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <EditPaymentModal payment={editing} onClose={()=>setEditing(null)} onSaved={load}/>
      )}
    </div>
  )
}