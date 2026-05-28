import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { CellMarksProvider } from '@/contexts/CellMarksContext'
import { FridayAttendanceProvider } from '@/contexts/FridayAttendanceContext'
import { ToastProvider } from '@/contexts/ToastContext'
import { ConfigBanner } from '@/components/ConfigBanner'
import { Dashboard } from '@/pages/Dashboard'
import { AttendancePage } from '@/pages/Attendance'
import { EmployeesPage } from '@/pages/Employees'
import { ReportsPage } from '@/pages/Reports'

/** React Router: basename بدون شرطة مائلة أخيرة (إن وُجدت) */
function routerBasename() {
  const b = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '')
  return b === '' ? '/' : b
}

export default function App() {
  return (
    <BrowserRouter basename={routerBasename()}>
      <FridayAttendanceProvider>
        <CellMarksProvider>
          <ToastProvider>
            <ConfigBanner />
            <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/attendance" element={<AttendancePage />} />
            <Route path="/employees" element={<EmployeesPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ToastProvider>
        </CellMarksProvider>
      </FridayAttendanceProvider>
    </BrowserRouter>
  )
}
