import { useState, useEffect, useRef } from 'react'
import { scanQRToken } from '../../services/api'
import { QrCode, CheckCircle, XCircle, Camera, Type } from 'lucide-react'
import toast from 'react-hot-toast'
import './AdminLayout.css'

export default function AdminScanner() {
  const [token, setToken]       = useState('')
  const [result, setResult]     = useState(null)
  const [loading, setLoading]   = useState(false)
  const [cameraOn, setCameraOn] = useState(false)
  const [mode, setMode]         = useState('manual') // start with manual — safer
  const [camError, setCamError] = useState('')
  const scannerRef              = useRef(null)
  const isScanning              = useRef(false)

  const startCamera = async () => {
    if (isScanning.current) return
    setCamError('')
    try {
      const { Html5Qrcode } = await import('html5-qrcode')

      // Clear any existing instance
      if (scannerRef.current) {
        try { await scannerRef.current.stop() } catch {}
        try { scannerRef.current.clear() } catch {}
        scannerRef.current = null
      }

      scannerRef.current = new Html5Qrcode('qr-reader-box')
      isScanning.current = true

      await scannerRef.current.start(
        { facingMode: 'user' },
        { fps: 10, qrbox: 250 },
        async (text) => {
          if (loading) return
          await stopCamera()
          await verifyToken(text)
        },
        () => {} // ignore decode errors
      )
      setCameraOn(true)
    } catch (err) {
      isScanning.current = false
      setCamError('Camera not available. Use manual input below.')
      setCameraOn(false)
    }
  }

  const stopCamera = async () => {
    isScanning.current = false
    setCameraOn(false)
    if (scannerRef.current) {
      try { await scannerRef.current.stop() } catch {}
      try { scannerRef.current.clear() } catch {}
      scannerRef.current = null
    }
  }

  const verifyToken = async (tokenStr) => {
    if (!tokenStr?.trim()) return
    setLoading(true)
    setResult(null)
    try {
      const r = await scanQRToken(tokenStr.trim())
      setResult(r.data)
      if (r.data.valid) toast.success('Patient admitted!')
      else toast.error(r.data.message)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Scan failed')
    } finally {
      setLoading(false)
    }
  }

  const handleManualSubmit = async (e) => {
    e.preventDefault()
    await verifyToken(token)
  }

  const handleScanNext = async () => {
    setResult(null)
    setToken('')
    if (mode === 'camera') {
      setTimeout(startCamera, 300)
    }
  }

  const switchMode = async (newMode) => {
    await stopCamera()
    setMode(newMode)
    setResult(null)
    if (newMode === 'camera') {
      setTimeout(startCamera, 500)
    }
  }

  useEffect(() => {
    return () => { stopCamera() }
  }, [])

  return (
    <div className="admin-page">
      <div className="admin-page-header" style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <div className="admin-page-title">QR scanner</div>
          <div className="admin-page-sub">Scan patient token to verify and admit</div>
        </div>
        <div style={{display:'flex',gap:0,border:'1px solid var(--border)',borderRadius:'var(--r)',overflow:'hidden'}}>
          {[
            {id:'camera', icon:<Camera size={13}/>, label:'Camera'},
            {id:'manual', icon:<Type size={13}/>, label:'Manual'},
          ].map(m=>(
            <button key={m.id} onClick={()=>switchMode(m.id)} style={{
              padding:'7px 14px',fontSize:12,fontWeight:600,cursor:'pointer',
              border:'none',fontFamily:'inherit',display:'flex',alignItems:'center',gap:5,
              background:mode===m.id?'var(--primary)':'var(--white)',
              color:mode===m.id?'#fff':'var(--ink3)',transition:'all .15s'
            }}>
              {m.icon} {m.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,maxWidth:860}}>

        {/* LEFT PANEL */}
        <div className="admin-table-wrap" style={{padding:24}}>

          {/* CAMERA MODE */}
          {mode === 'camera' && (
            <>
              <div style={{fontSize:12,color:'var(--ink3)',marginBottom:12,textAlign:'center'}}>
                Point your webcam at the patient's QR code
              </div>

              {camError && (
                <div style={{
                  background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:'var(--r)',
                  padding:'10px 14px',fontSize:12,color:'#DC2626',marginBottom:12,textAlign:'center'
                }}>
                  {camError}
                </div>
              )}

              {/* Camera box — only ONE div */}
              <div style={{
                background:'#000',borderRadius:'var(--r)',overflow:'hidden',
                marginBottom:12,minHeight:260,display:'flex',
                alignItems:'center',justifyContent:'center',position:'relative'
              }}>
                <div id="qr-reader-box" style={{width:'100%'}}/>
                {!cameraOn && !camError && (
                  <div style={{
                    position:'absolute',inset:0,display:'flex',flexDirection:'column',
                    alignItems:'center',justifyContent:'center',color:'#fff'
                  }}>
                    <Camera size={32} style={{color:'#666',marginBottom:10}}/>
                    <div style={{fontSize:12,color:'#999',marginBottom:12}}>Starting camera...</div>
                    <button onClick={startCamera} style={{
                      padding:'8px 16px',borderRadius:'var(--r)',
                      background:'var(--primary)',color:'#fff',border:'none',
                      cursor:'pointer',fontSize:12,fontFamily:'inherit'
                    }}>
                      Start camera
                    </button>
                  </div>
                )}
              </div>

              {cameraOn && (
                <div style={{
                  padding:'8px',background:'#ECFDF5',border:'1px solid #86EFAC',
                  borderRadius:'var(--r)',fontSize:12,color:'#16A34A',
                  textAlign:'center',display:'flex',alignItems:'center',justifyContent:'center',gap:6
                }}>
                  <div style={{
                    width:8,height:8,borderRadius:'50%',background:'#16A34A',
                    animation:'pulse 1s ease-in-out infinite'
                  }}/>
                  Camera active — waiting for QR code
                </div>
              )}

              <div style={{
                marginTop:12,padding:'10px',background:'var(--bg)',
                borderRadius:'var(--r)',fontSize:11,color:'var(--ink4)',textAlign:'center'
              }}>
                💡 Tip: Hold the phone steady, 15-30cm from camera, in good light
              </div>
            </>
          )}

          {/* MANUAL MODE */}
          {mode === 'manual' && (
            <>
              <div style={{textAlign:'center',padding:'16px 0 14px'}}>
                <QrCode size={36} style={{color:'var(--ink4)',marginBottom:10}}/>
                <div style={{fontSize:13,fontWeight:600,color:'var(--ink2)',marginBottom:4}}>
                  Paste token manually
                </div>
                <div style={{fontSize:12,color:'var(--ink4)'}}>
                  Copy the full token string from patient's QR page
                </div>
              </div>
              <form onSubmit={handleManualSubmit}>
                <div className="input-group">
                  <label>Token string</label>
                  <textarea
                    className="input"
                    placeholder="Paste token here..."
                    value={token}
                    onChange={e=>setToken(e.target.value)}
                    rows={5}
                    style={{resize:'vertical',fontFamily:'monospace',fontSize:11,lineHeight:1.5}}
                    autoFocus
                  />
                </div>
                <button
                  className="btn btn-primary btn-full"
                  type="submit"
                  disabled={loading || !token.trim()}
                  style={{justifyContent:'center'}}
                >
                  {loading ? <span className="spinner"/> : 'Verify token'}
                </button>
              </form>
            </>
          )}
        </div>

        {/* RIGHT — RESULT */}
        <div className="admin-table-wrap" style={{padding:24}}>
          <div style={{fontSize:14,fontWeight:600,marginBottom:16}}>Result</div>

          {loading && (
            <div style={{textAlign:'center',padding:'40px 0'}}>
              <span className="spinner spinner-dark"/>
              <div style={{fontSize:13,color:'var(--ink4)',marginTop:12}}>Verifying...</div>
            </div>
          )}

          {!result && !loading && (
            <div style={{textAlign:'center',padding:'40px 0',color:'var(--ink4)'}}>
              <QrCode size={36} style={{marginBottom:10,opacity:.3}}/>
              <div style={{fontSize:13}}>No token scanned yet</div>
            </div>
          )}

          {result && !loading && (
            <div>
              <div style={{
                background:result.valid?'#DCFCE7':'#FEF2F2',
                border:`1px solid ${result.valid?'#86EFAC':'#FECACA'}`,
                borderRadius:8,padding:'12px 16px',
                display:'flex',alignItems:'center',gap:10,marginBottom:16
              }}>
                {result.valid
                  ? <CheckCircle size={20} style={{color:'#16A34A',flexShrink:0}}/>
                  : <XCircle size={20} style={{color:'#DC2626',flexShrink:0}}/>
                }
                <span style={{fontSize:14,fontWeight:700,color:result.valid?'#15803D':'#B91C1C'}}>
                  {result.valid ? '✓ Valid — admit patient' : result.message}
                </span>
              </div>

              {result.valid && (
                <>
                  <div style={{
                    display:'flex',alignItems:'center',gap:12,
                    padding:'12px 14px',background:'var(--bg)',
                    borderRadius:'var(--r)',marginBottom:12
                  }}>
                    <div style={{
                      width:44,height:44,borderRadius:'50%',
                      background:'#EEF3FF',color:'#1B4FD8',
                      display:'flex',alignItems:'center',justifyContent:'center',
                      fontSize:16,fontWeight:700,flexShrink:0
                    }}>
                      {result.patient_name?.slice(0,2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{fontSize:15,fontWeight:700,color:'var(--ink)'}}>{result.patient_name}</div>
                      <div style={{fontSize:11,color:'var(--ink3)'}}>Patient</div>
                    </div>
                  </div>

                  <table style={{width:'100%',fontSize:13,borderCollapse:'collapse'}}>
                    {[
                      ['Department', result.dept_name],
                      ['Serial no.', `#${String(result.serial_no).padStart(3,'0')}`],
                      ['Date', result.appt_date],
                    ].map(([k,v])=>(
                      <tr key={k}>
                        <td style={{padding:'9px 0',color:'var(--ink4)',width:110,borderBottom:'1px solid var(--border)',fontSize:12}}>{k}</td>
                        <td style={{padding:'9px 0',fontWeight:k==='Serial no.'?700:600,color:k==='Serial no.'?'var(--primary)':'var(--ink)',borderBottom:'1px solid var(--border)',fontSize:k==='Serial no.'?16:13}}>{v}</td>
                      </tr>
                    ))}
                  </table>

                  <div style={{
                    marginTop:14,padding:'10px',background:'#ECFDF5',
                    border:'1px solid #86EFAC',borderRadius:'var(--r)',
                    fontSize:12,color:'#16A34A',textAlign:'center',fontWeight:600
                  }}>
                    ✓ Marked as ATTENDED
                  </div>
                </>
              )}

              <button className="btn btn-full" style={{marginTop:16,justifyContent:'center'}} onClick={handleScanNext}>
                Scan next patient
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%,100%{opacity:1} 50%{opacity:.3}
        }
        #qr-reader-box video {
          width:100% !important;
        }
        #qr-reader-box img { display:none !important; }
        #qr-reader-box__scan_region img { display:none !important; }
      `}</style>
    </div>
  )
}