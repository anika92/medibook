import { useState } from 'react'
import { format, subDays } from 'date-fns'
import { dailyReport, deptReport } from '../../services/api'
import toast from 'react-hot-toast'
import './AdminLayout.css'

export default function AdminReports() {
  const today = format(new Date(),'yyyy-MM-dd')
  const [reportDate, setReportDate] = useState(today)
  const [fromDate, setFromDate]     = useState(format(subDays(new Date(),30),'yyyy-MM-dd'))
  const [toDate, setToDate]         = useState(today)
  const [daily, setDaily]           = useState(null)
  const [depts, setDepts]           = useState([])
  const [loading, setLoading]       = useState(false)

  const loadDaily = async () => {
    setLoading(true)
    try {
      const r = await dailyReport(reportDate)
      setDaily(r.data)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to load report')
    } finally {
      setLoading(false)
    }
  }

  const loadDepts = async () => {
    setLoading(true)
    try {
      const r = await deptReport(fromDate, toDate)
      setDepts(r.data)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to load report')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div className="admin-page-title">Reports</div>
        <div className="admin-page-sub">Analytics and statistics</div>
      </div>

      {/* DAILY REPORT */}
      <div className="admin-table-wrap" style={{padding:20,marginBottom:16}}>
        <div style={{fontSize:14,fontWeight:600,marginBottom:14}}>Daily report</div>
        <div style={{display:'flex',gap:10,alignItems:'flex-end',marginBottom:16}}>
          <div className="input-group" style={{marginBottom:0}}>
            <label>Date</label>
            <input className="input" type="date" value={reportDate} onChange={e=>setReportDate(e.target.value)}/>
          </div>
          <button className="btn btn-primary" onClick={loadDaily} disabled={loading}>
            {loading?<span className="spinner"/>:'Run report'}
          </button>
        </div>
        {daily && (
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
            {[
              {label:'Total bookings', val:daily.total_bookings, color:'#EEF3FF', tc:'#1B4FD8'},
              {label:'Revenue',        val:`৳${daily.revenue_bdt}`, color:'#ECFDF5', tc:'#0EA472'},
              {label:'Attended',       val:daily.attended, color:'#F0FDF4', tc:'#16A34A'},
              {label:'Cancelled',      val:daily.cancelled, color:'#FEF2F2', tc:'#DC2626'},
            ].map((s,i)=>(
              <div key={i} style={{background:s.color,borderRadius:10,padding:'14px 16px'}}>
                <div style={{fontSize:22,fontWeight:700,color:s.tc}}>{s.val}</div>
                <div style={{fontSize:11,color:'var(--ink3)',marginTop:4}}>{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* DEPT REPORT */}
      <div className="admin-table-wrap" style={{padding:20}}>
        <div style={{fontSize:14,fontWeight:600,marginBottom:14}}>Department report</div>
        <div style={{display:'flex',gap:10,alignItems:'flex-end',marginBottom:16,flexWrap:'wrap'}}>
          <div className="input-group" style={{marginBottom:0}}>
            <label>From</label>
            <input className="input" type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)}/>
          </div>
          <div className="input-group" style={{marginBottom:0}}>
            <label>To</label>
            <input className="input" type="date" value={toDate} onChange={e=>setToDate(e.target.value)}/>
          </div>
          <button className="btn btn-primary" onClick={loadDepts} disabled={loading}>
            {loading?<span className="spinner"/>:'Run report'}
          </button>
        </div>
        {depts.length > 0 && (
          <table className="admin-table">
            <thead><tr><th>Department</th><th>Bookings</th><th>Revenue</th></tr></thead>
            <tbody>
              {depts.map(d=>(
                <tr key={d.dept_id}>
                  <td style={{fontWeight:600}}>{d.dept_name}</td>
                  <td style={{fontWeight:700,color:'var(--primary)'}}>{d.total_bookings}</td>
                  <td style={{fontWeight:700,color:'#0EA472'}}>৳{d.revenue_bdt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
