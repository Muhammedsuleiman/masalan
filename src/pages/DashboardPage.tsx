import { useAuth } from '../contexts/AuthContext'
import OwnerDashboardPage from './OwnerDashboardPage'
import ManagerDashboardPage from './ManagerDashboardPage'
import DeveloperDashboardPage from './DeveloperDashboardPage'
import { Spinner } from '../components/ui/Spinner'

export default function DashboardPage() {
  const { profile, loading } = useAuth()

  if (loading || !profile) {
    return (
      <div className="flex items-center justify-center py-24 text-brand-600">
        <Spinner className="h-6 w-6" />
      </div>
    )
  }

  if (profile.role === 'manager') return <ManagerDashboardPage />
  if (profile.role === 'developer') return <DeveloperDashboardPage />
  return <OwnerDashboardPage />
}
