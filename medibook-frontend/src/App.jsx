import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

// Patient pages
import LandingPage    from './pages/LandingPage'
import LoginPage      from './pages/LoginPage'
import RegisterPage   from './pages/RegisterPage'
import BookingPage    from './pages/BookingPage'
import MyAppointments from './pages/MyAppointments'
import TokenPage      from './pages/TokenPage'

// Staff pages
import StaffLogin      from './pages/staff/StaffLogin'
import StaffRegister   from './pages/staff/StaffRegister'
import ForgotPassword  from './pages/staff/ForgotPassword'
import StaffLayout     from './pages/staff/StaffLayout'
import StaffDashboard  from './pages/staff/StaffDashboard'
import StaffDepartments from './pages/staff/StaffDepartments'
import StaffAppointments from './pages/staff/StaffAppointments'
import StaffPayments   from './pages/staff/StaffPayments'
import StaffScanner    from './pages/staff/StaffScanner'
import StaffMembers    from './pages/staff/StaffMembers'
import StaffReports    from './pages/staff/StaffReports'
import StaffPending    from './pages/staff/StaffPending'
import StaffPatients   from './pages/staff/StaffPatients'

function ProtectedPatient({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading-screen"><span className="spinner spinner-dark"/></div>
  if (!user || user.type !== 'patient') return <Navigate to="/login" replace/>
  return children
}

function ProtectedStaff({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading-screen"><span className="spinner spinner-dark"/></div>
  if (!user || user.type !== 'staff') return <Navigate to="/staff/login" replace/>
  return children
}

export default function App() {
  return (
    <Routes>
      {/* Public patient routes */}
      <Route path="/"         element={<LandingPage/>}/>
      <Route path="/login"    element={<LoginPage/>}/>
      <Route path="/register" element={<RegisterPage/>}/>

      {/* Protected patient routes */}
      <Route path="/book"         element={<ProtectedPatient><BookingPage/></ProtectedPatient>}/>
      <Route path="/appointments" element={<ProtectedPatient><MyAppointments/></ProtectedPatient>}/>
      <Route path="/token/:apptId" element={<ProtectedPatient><TokenPage/></ProtectedPatient>}/>

      {/* Public staff routes */}
      <Route path="/staff/login"           element={<StaffLogin/>}/>
      <Route path="/staff/register"        element={<StaffRegister/>}/>
      <Route path="/staff/forgot-password" element={<ForgotPassword/>}/>

      {/* Protected staff routes */}
      <Route path="/staff" element={<ProtectedStaff><StaffLayout/></ProtectedStaff>}>
        <Route index                  element={<StaffDashboard/>}/>
        <Route path="departments"     element={<StaffDepartments/>}/>
        <Route path="appointments"    element={<StaffAppointments/>}/>
        <Route path="payments"        element={<StaffPayments/>}/>
        <Route path="scanner"         element={<StaffScanner/>}/>
        <Route path="members"         element={<StaffMembers/>}/>
        <Route path="reports"         element={<StaffReports/>}/>
        <Route path="pending"         element={<StaffPending/>}/>
        <Route path="patients"        element={<StaffPatients/>}/>
      </Route>

      <Route path="*" element={<Navigate to="/" replace/>}/>
    </Routes>
  )
}