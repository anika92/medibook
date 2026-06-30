import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import QRCode from 'react-qr-code'
import { Activity, Calendar, Building2, Hash, Download, Home } from 'lucide-react'
import toast from 'react-hot-toast'
import { getQRToken } from '../services/api'
import { format } from 'date-fns'
import './TokenPage.css'

export default function TokenPage() {
  const { apptId } = useParams()
  const navigate   = useNavigate()
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getQRToken(apptId)
      .then(r => setToken(r.data))
      .catch(() => toast.error('Token not found — payment may be pending'))
      .finally(() => setLoading(false))
  }, [apptId])

  if (loading) return (
    <div className="token-loading">
      <span className="spinner spinner-dark" />
      <p>Loading your token…</p>
    </div>
  )

  if (!token) return (
    <div className="token-loading">
      <p style={{color:'var(--red)'}}>Token not available yet.</p>
      <p style={{fontSize:13,color:'var(--ink3)',marginTop:8}}>Payment may still be processing.</p>
      <button className="btn btn-primary" style={{marginTop:16}} onClick={()=>navigate('/appointments')}>
        My appointments
      </button>
    </div>
  )

  return (
    <div className="token-page">
      <div className="token-card card fade-up">
        {/* HEADER */}
        <div className="token-header">
          <div className="token-success-icon">
            <Activity size={22} />
          </div>
          <div>
            <div className="token-confirmed">Appointment confirmed</div>
            <div className="token-id-text">{token.token_id?.slice(0,8).toUpperCase()}</div>
          </div>
        </div>

        {/* SERIAL */}
        <div className="token-serial-wrap">
          <div className="token-serial-label">Queue number</div>
          <div className="token-serial">#{String(token.serial_no).padStart(3,'0')}</div>
        </div>

        {/* QR CODE */}
        <div className="token-qr-wrap">
          <QRCode
            value={token.token_hmac}
            size={180}
            fgColor="#0D1117"
            bgColor="#ffffff"
            level="H"
          />
        </div>
        <p className="token-qr-hint">Show this QR at the reception desk</p>

        {/* DETAILS */}
        <div className="token-details">
          <div className="token-detail-row">
            <Building2 size={14} />
            <span>{token.dept_name}</span>
          </div>
          <div className="token-detail-row">
            <Calendar size={14} />
            <span>{token.appt_date && format(new Date(token.appt_date), 'EEEE, d MMMM yyyy')}</span>
          </div>
          <div className="token-detail-row">
            <Hash size={14} />
            <span style={{fontFamily:'monospace',fontSize:11}}>{token.token_hmac.slice(0,32)}…</span>
          </div>
        </div>

        {/* EXPIRES */}
        <div className="token-expires">
          Expires: {token.expires_at && format(new Date(token.expires_at), 'd MMM yyyy, h:mm a')}
        </div>

        {/* ACTIONS */}
        <div style={{display:'flex',gap:10,marginTop:20}}>
          <button className="btn btn-full" onClick={()=>navigate('/appointments')}>
            <Home size={14}/> My appointments
          </button>
          <button className="btn btn-primary btn-full" onClick={()=>window.print()}>
            <Download size={14}/> Save / Print
          </button>
        </div>
      </div>
    </div>
  )
}
