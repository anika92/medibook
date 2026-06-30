import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

// Attach token from localStorage to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auto logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────────────────
export const sendOTP       = (phone)       => api.post('/auth/otp/send', { phone })
export const verifyOTP     = (phone, otp)  => api.post('/auth/otp/verify', { phone, otp })
export const registerPatient = (data)      => api.post('/auth/register', data)
export const staffLogin    = (phone, password) => api.post('/auth/staff/login', { phone, password })

// ── Departments ───────────────────────────────────────────────
export const getDepartments  = ()           => api.get('/departments/')
export const getDepartment   = (id)         => api.get(`/departments/${id}`)
export const getSlots        = (deptId, date) => api.get(`/departments/${deptId}/slots`, { params: { check_date: date } })
export const createDepartment = (data)      => api.post('/departments/', data)
export const updateDepartment = (id, data)  => api.put(`/departments/${id}`, data)

// ── Appointments ──────────────────────────────────────────────
export const bookAppointment  = (data)      => api.post('/appointments/', data)
export const myAppointments   = ()          => api.get('/appointments/my')
export const cancelAppointment = (id)       => api.delete(`/appointments/${id}`)
export const adminAppointments = (params)   => api.get('/appointments/admin/all', { params })

// ── Payments ──────────────────────────────────────────────────

export const paymentStatus    = (apptId)   => api.get(`/payments/status/${apptId}`)
export const adminPayments    = (params)   => api.get('/payments/admin/all', { params })

// ── QR Token ──────────────────────────────────────────────────
export const getQRToken   = (apptId)       => api.get(`/qr/token/${apptId}`)
export const scanQRToken  = (tokenHmac)    => api.post('/qr/scan', { token_hmac: tokenHmac })

// ── Reports ───────────────────────────────────────────────────
export const dailyReport  = (date)         => api.get('/reports/daily', { params: { report_date: date } })
export const deptReport   = (from, to)     => api.get('/reports/departments', { params: { from_date: from, to_date: to } })

// ── Staff ─────────────────────────────────────────────────────
export const getStaff     = ()             => api.get('/staff/')
export const createStaff  = (data)         => api.post('/staff/', data)

export default api
