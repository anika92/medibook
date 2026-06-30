import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, LogOut, User, ChevronLeft, ChevronRight, Check, CreditCard } from 'lucide-react'
import toast from 'react-hot-toast'
import { getDepartments, getSlots, bookAppointment } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { format, addDays, isBefore, startOfToday } from 'date-fns'
import api from '../services/api'
import './BookingPage.css'

const STEPS = ['Department', 'Date', 'Confirm', 'Payment']
const DAYS  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

export default function BookingPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [step, setStep]               = useState(0)
  const [depts, setDepts]             = useState([])
  const [selDept, setSelDept]         = useState(null)
  const [selDate, setSelDate]         = useState(null)
  const [slotInfo, setSlotInfo]       = useState(null)
  const [appt, setAppt]               = useState(null)
  const [loading, setLoading]         = useState(false)
  const [loadingSlot, setLoadingSlot] = useState(false)

  const today = startOfToday()
  const dates = Array.from({length:14}, (_,i) => addDays(today, i))

  useEffect(() => {
    getDepartments()
      .then(r => setDepts(r.data))
      .catch(() => toast.error('Failed to load departments'))
  }, [])

  const selectDate = async (date) => {
    setSelDate(date)
    setLoadingSlot(true)
    try {
      const r = await getSlots(selDept.id, format(date,'yyyy-MM-dd'))
      setSlotInfo(r.data)
    } catch {
      setSlotInfo(null)
    } finally {
      setLoadingSlot(false)
    }
  }

  const isDeptOpenOn = (dept, date) => {
    const wd = (date.getDay() + 6) % 7
    return dept.schedules?.some(s => s.day_of_week === wd)
  }

  const handleBook = async () => {
    setLoading(true)
    try {
      const r = await bookAppointment({
        dept_id:   selDept.id,
        appt_date: format(selDate,'yyyy-MM-dd'),
      })
      setAppt(r.data)
      setStep(3)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Booking failed')
    } finally {
      setLoading(false)
    }
  }

  // ── SSL COMMERZ PAYMENT ─────────────────────────────────────────────────
  const handlePay = async () => {
    setLoading(true)
    try {
      const res = await api.post(`/payments/initiate/${appt.id}`)
      // Redirect to SSL Commerz gateway
      window.location.href = res.data.payment_url
    } catch (err) {
      const detail = err.response?.data?.detail || 'Payment initiation failed'
      toast.error(detail)
      setLoading(false)
    }
  }

  return (
    <div className="booking-page">
      {/* NAVBAR */}
      <nav className="booking-nav">
        <div className="nav-logo" style={{cursor:'pointer'}} onClick={()=>navigate('/')}>
          <div className="nav-logo-icon"><Activity size={18}/></div>
          <span>MediBook</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div className="nav-user"><User size={13}/> {user?.phone}</div>
          <button className="btn btn-sm" onClick={()=>{logout();navigate('/')}}>
            <LogOut size={13}/> Logout
          </button>
        </div>
      </nav>

      <div className="booking-container">
        {/* STEP BAR */}
        <div className="step-bar" style={{marginBottom:32}}>
          {STEPS.map((s,i) => (
            <div className="step-item" key={i}>
              <div className={`step-circle ${i<step?'done':i===step?'active':''}`}>
                {i < step ? <Check size={12}/> : i+1}
              </div>
              <span className={`step-label ${i===step?'active':''}`}>{s}</span>
              {i < STEPS.length-1 && <div className={`step-line ${i<step?'done':''}`}/>}
            </div>
          ))}
        </div>

        {/* STEP 0 — DEPARTMENT */}
        {step === 0 && (
          <div className="fade-up">
            <h2 className="booking-title">Choose a department</h2>
            <p className="booking-sub">Select the ward you need to visit</p>
            <div className="dept-grid">
              {depts.map(d => (
                <div
                  key={d.id}
                  className={`dept-card ${selDept?.id===d.id?'selected':''} ${!d.is_active?'inactive':''}`}
                  onClick={() => d.is_active && setSelDept(d)}
                >
                  <div className="dept-card-name">{d.name}</div>
                  <div className="dept-card-days">
                    {DAYS.map((day,i) => (
                      <span key={i} className={`day-dot ${d.schedules?.some(s=>s.day_of_week===i)?'active':''}`}>
                        {day.slice(0,1)}
                      </span>
                    ))}
                  </div>
                  <div className="dept-card-slots">Max {d.daily_max_slots} slots/day</div>
                  {!d.is_active && <span className="badge badge-gray" style={{marginTop:8}}>Inactive</span>}
                </div>
              ))}
            </div>
            <div className="booking-actions">
              <button className="btn btn-primary btn-lg" onClick={()=>setStep(1)} disabled={!selDept}>
                Continue <ChevronRight size={16}/>
              </button>
            </div>
          </div>
        )}

        {/* STEP 1 — DATE */}
        {step === 1 && (
          <div className="fade-up">
            <h2 className="booking-title">Choose a date</h2>
            <p className="booking-sub">
              {selDept?.name} · Available: {DAYS.filter((_,i)=>selDept?.schedules?.some(s=>s.day_of_week===i)).join(', ')}
            </p>
            <div className="date-grid">
              {dates.map(d => {
                const open = isDeptOpenOn(selDept, d)
                const past = isBefore(d, today)
                const sel  = selDate && format(d,'yyyy-MM-dd') === format(selDate,'yyyy-MM-dd')
                return (
                  <button
                    key={d.toISOString()}
                    className={`date-cell ${sel?'selected':''} ${(!open||past)?'disabled':''}`}
                    onClick={() => open && !past && selectDate(d)}
                    disabled={!open || past}
                  >
                    <span className="date-cell-day">{format(d,'EEE')}</span>
                    <span className="date-cell-num">{format(d,'d')}</span>
                    <span className="date-cell-mon">{format(d,'MMM')}</span>
                  </button>
                )
              })}
            </div>

            {selDate && slotInfo && (
              <div className={`slot-info fade-in ${slotInfo.is_full?'slot-full':''}`}>
                {slotInfo.is_full ? (
                  <span className="badge badge-red">Fully booked — choose another date</span>
                ) : !slotInfo.is_open ? (
                  <span className="badge badge-gray">Department closed on this day</span>
                ) : (
                  <>
                    <span className="badge badge-green">{slotInfo.remaining} slots remaining</span>
                    <span style={{fontSize:12,color:'var(--ink3)',marginLeft:8}}>
                      {slotInfo.booked} already booked
                    </span>
                  </>
                )}
              </div>
            )}
            {loadingSlot && <div style={{marginTop:12}}><span className="spinner spinner-dark"/></div>}

            <div className="booking-actions">
              <button className="btn btn-lg" onClick={()=>setStep(0)}>
                <ChevronLeft size={16}/> Back
              </button>
              <button
                className="btn btn-primary btn-lg"
                onClick={()=>setStep(2)}
                disabled={!selDate || !slotInfo || !slotInfo.is_open || slotInfo.is_full}
              >
                Continue <ChevronRight size={16}/>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2 — CONFIRM */}
        {step === 2 && (
          <div className="fade-up">
            <h2 className="booking-title">Confirm booking</h2>
            <p className="booking-sub">Review your appointment details</p>
            <div className="confirm-card card">
              <div className="confirm-row"><span>Department</span><strong>{selDept?.name}</strong></div>
              <div className="confirm-row"><span>Date</span><strong>{selDate && format(selDate,'EEEE, d MMMM yyyy')}</strong></div>
              <div className="confirm-row"><span>Phone</span><strong>{user?.phone}</strong></div>
              <div className="confirm-row total-row">
                <span>Booking fee</span>
                <strong style={{color:'var(--primary)',fontSize:20}}>৳10</strong>
              </div>
            </div>

            {/* PAYMENT METHODS */}
            <div style={{
              background:'var(--bg)',border:'1px solid var(--border)',
              borderRadius:'var(--r)',padding:'12px 14px',marginTop:12,
              display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'
            }}>
              <CreditCard size={16} style={{color:'var(--ink3)',flexShrink:0}}/>
              <span style={{fontSize:12,color:'var(--ink3)'}}>Pay via:</span>
              {['bKash','Nagad','Rocket','Visa','Mastercard'].map(m=>(
                <span key={m} style={{
                  padding:'2px 8px',borderRadius:20,fontSize:11,fontWeight:600,
                  background:'var(--white)',border:'1px solid var(--border)',color:'var(--ink2)'
                }}>{m}</span>
              ))}
            </div>

            <div className="booking-actions">
              <button className="btn btn-lg" onClick={()=>setStep(1)}>
                <ChevronLeft size={16}/> Back
              </button>
              <button className="btn btn-primary btn-lg" onClick={handleBook} disabled={loading}>
                {loading ? <span className="spinner"/> : <>Confirm booking <ChevronRight size={16}/></>}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 — PAYMENT */}
        {step === 3 && appt && (
          <div className="fade-up">
            <h2 className="booking-title">Complete payment</h2>
            <p className="booking-sub">Your slot is reserved for 15 minutes — pay now to confirm</p>

            <div className="confirm-card card">
              <div className="confirm-row">
                <span>Department</span>
                <strong>{selDept?.name}</strong>
              </div>
              <div className="confirm-row">
                <span>Date</span>
                <strong>{selDate && format(selDate,'d MMMM yyyy')}</strong>
              </div>
              <div className="confirm-row total-row">
                <span>Amount to pay</span>
                <strong style={{color:'var(--primary)',fontSize:24}}>৳10</strong>
              </div>
            </div>

            {/* TIMER WARNING */}
            <div style={{
              background:'#FFFBEB',border:'1px solid #FCD34D',
              borderRadius:'var(--r)',padding:'10px 14px',
              fontSize:12,color:'#92400E',marginTop:12,marginBottom:16,
              display:'flex',alignItems:'center',gap:8
            }}>
              ⏱ Your slot will be released in 15 minutes if payment is not completed
            </div>

            {/* PAY BUTTON */}
            <button
              className="btn btn-primary btn-full btn-lg"
              style={{justifyContent:'center'}}
              onClick={handlePay}
              disabled={loading}
            >
              {loading
                ? <span className="spinner"/>
                : <><CreditCard size={16}/> Pay ৳10 now</>
              }
            </button>

            {/* PAYMENT METHODS */}
            <div style={{
              marginTop:12,padding:'10px 14px',
              background:'var(--bg)',borderRadius:'var(--r)',
              fontSize:11,color:'var(--ink4)',textAlign:'center'
            }}>
              Supports bKash · Nagad · Rocket · Visa · Mastercard · Internet Banking
            </div>

            <button
              className="btn btn-full"
              style={{marginTop:10,justifyContent:'center'}}
              onClick={()=>navigate('/appointments')}
            >
              Pay later
            </button>
          </div>
        )}
      </div>
    </div>
  )
}