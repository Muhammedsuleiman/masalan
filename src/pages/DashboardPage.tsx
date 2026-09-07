import { lazy, Suspense } from 'react'
import { useAuth } from '../contexts/AuthContext'
import DeveloperDashboardPage from './DeveloperDashboardPage'
import { Spinner } from '../components/ui/Spinner'

const OwnerDashboardPage = lazy(() => import('./OwnerDashboardPage'))
const ManagerDashboardPage = lazy(() => import('./ManagerDashboardPage'))

function DashLoader() {
  return (
    <div className="flex items-center justify-center py-24 text-brand-600">
      <Spinner className="h-6 w-6" />
    </div>
  )
}

export default function DashboardPage() {
  const { profile, loading } = useAuth()

  if (loading || !profile) {
    return <DashLoader />
  }

  if (profile.role === 'manager') {
    return (
      <Suspense fallback={<DashLoader />}>
        <ManagerDashboardPage />
      </Suspense>
    )
  }
  if (profile.role === 'developer') return <DeveloperDashboardPage />
  return (
    <Suspense fallback={<DashLoader />}>
      <OwnerDashboardPage />
    </Suspense>
  )
}
