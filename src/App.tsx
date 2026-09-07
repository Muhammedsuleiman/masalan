import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { AppLayout } from './components/layout/AppLayout'
import { Spinner } from './components/ui/Spinner'
import type { Role } from './types'
import LoginPage from './pages/LoginPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import DashboardPage from './pages/DashboardPage'
import SalesPage from './pages/SalesPage'
import NewSalePage from './pages/NewSalePage'
import PaymentsPage from './pages/PaymentsPage'
import CreditPage from './pages/CreditPage'
import ExpensesPage from './pages/ExpensesPage'
import CustomersPage from './pages/CustomersPage'
import ProductsPage from './pages/ProductsPage'
import StaffPage from './pages/StaffPage'
import ReportsPage from './pages/ReportsPage'
import ActivityPage from './pages/ActivityPage'
import UsersPage from './pages/UsersPage'
import SettingsPage from './pages/SettingsPage'
import NotFoundPage from './pages/NotFoundPage'

const ALL_ROLES: Role[] = ['owner', 'manager', 'developer']
const BUSINESS_ROLES: Role[] = ['owner', 'manager']

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream-100">
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold-500 font-display text-xl font-bold text-brand-950">
          M
        </div>
        <Spinner className="h-5 w-5 text-brand-600" />
      </div>
    </div>
  )
}

function RequireAuth() {
  const { session, loading } = useAuth()
  if (loading) return <FullScreenLoader />
  if (!session) return <Navigate to="/login" replace />
  return <Outlet />
}

function RoleGate({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { profile, loading } = useAuth()
  if (loading || !profile) return <FullScreenLoader />
  if (!roles.includes(profile.role)) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          <Route element={<RequireAuth />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<RoleGate roles={ALL_ROLES}><DashboardPage /></RoleGate>} />
              <Route path="/sales" element={<RoleGate roles={BUSINESS_ROLES}><SalesPage /></RoleGate>} />
              <Route path="/sales/new" element={<RoleGate roles={BUSINESS_ROLES}><NewSalePage /></RoleGate>} />
              <Route path="/payments" element={<RoleGate roles={BUSINESS_ROLES}><PaymentsPage /></RoleGate>} />
              <Route path="/credit" element={<RoleGate roles={BUSINESS_ROLES}><CreditPage /></RoleGate>} />
              <Route path="/expenses" element={<RoleGate roles={BUSINESS_ROLES}><ExpensesPage /></RoleGate>} />
              <Route path="/customers" element={<RoleGate roles={BUSINESS_ROLES}><CustomersPage /></RoleGate>} />
              <Route path="/products" element={<RoleGate roles={BUSINESS_ROLES}><ProductsPage /></RoleGate>} />
              <Route path="/staff" element={<RoleGate roles={BUSINESS_ROLES}><StaffPage /></RoleGate>} />
              <Route path="/reports" element={<RoleGate roles={BUSINESS_ROLES}><ReportsPage /></RoleGate>} />
              <Route path="/activity" element={<RoleGate roles={ALL_ROLES}><ActivityPage /></RoleGate>} />
              <Route path="/users" element={<RoleGate roles={['owner']}><UsersPage /></RoleGate>} />
              <Route path="/settings" element={<RoleGate roles={ALL_ROLES}><SettingsPage /></RoleGate>} />
            </Route>
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
