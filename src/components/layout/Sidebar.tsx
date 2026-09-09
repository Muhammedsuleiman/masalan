import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  Receipt,
  Wallet,
  HandCoins,
  TrendingDown,
  Users,
  Package,
  UserCog,
  BarChart3,
  ScrollText,
  UserPlus,
  Settings,
} from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { cn } from '../../lib/utils'
import type { Role } from '../../types'
import { useAuth } from '../../contexts/AuthContext'
import { RoleBadge } from '../ui/Badge'
import { ThemeToggle } from '../ui/ThemeToggle'
import { LogOut } from 'lucide-react'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  roles: Role[]
  end?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['owner', 'manager', 'developer'], end: true },
  { to: '/sales', label: 'Sales', icon: Receipt, roles: ['owner', 'manager'] },
  { to: '/payments', label: 'Payments', icon: Wallet, roles: ['owner', 'manager'] },
  { to: '/credit', label: 'Credit', icon: HandCoins, roles: ['owner', 'manager'] },
  { to: '/expenses', label: 'Expenses', icon: TrendingDown, roles: ['owner', 'manager'] },
  { to: '/customers', label: 'Customers', icon: Users, roles: ['owner', 'manager'] },
  { to: '/products', label: 'Products', icon: Package, roles: ['owner', 'manager'] },
  { to: '/staff', label: 'Staff', icon: UserCog, roles: ['owner', 'manager'] },
  { to: '/reports', label: 'Reports', icon: BarChart3, roles: ['owner', 'manager'] },
  { to: '/activity', label: 'Activity', icon: ScrollText, roles: ['owner', 'manager', 'developer'] },
  { to: '/users', label: 'Users', icon: UserPlus, roles: ['owner'] },
  { to: '/settings', label: 'Settings', icon: Settings, roles: ['owner', 'manager', 'developer'] },
]

function Brand() {
  return (
    <div className="flex items-center gap-3 px-5 py-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-500 font-display text-lg font-bold text-brand-950">
        M
      </div>
      <div className="min-w-0">
        <p className="truncate font-display text-[15px] font-bold leading-tight text-cream-50">Masalan</p>
        <p className="truncate text-[11px] font-semibold uppercase tracking-widest text-gold-400">
          Business Enterprise
        </p>
      </div>
    </div>
  )
}

function NavLinks({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const items = NAV_ITEMS.filter((item) => item.roles.includes(role))
  return (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2 scrollbar-thin">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
              isActive
                ? 'bg-gold-500 text-brand-950 shadow-sm'
                : 'text-cream-200/80 hover:bg-white/10 hover:text-cream-50',
            )
          }
        >
          <item.icon className="h-[18px] w-[18px] shrink-0" />
          <span className="truncate">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

function SidebarFooter() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="border-t border-white/10 p-4">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-500/90 text-sm font-bold text-brand-950">
          {(profile?.full_name ?? profile?.email ?? '?').slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-cream-50">
            {profile?.full_name || 'User'}
          </p>
          <RoleBadge role={profile?.role ?? 'manager'} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={async () => {
            await signOut()
            navigate('/login')
          }}
          className="flex items-center justify-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-cream-100 transition-colors hover:bg-white/10"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
        <ThemeToggle variant="dark" />
      </div>
    </div>
  )
}

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { profile } = useAuth()
  if (!profile) return null
  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-brand-900 via-brand-800 to-brand-950">
      <Brand />
      <NavLinks role={profile.role} onNavigate={onNavigate} />
      <SidebarFooter />
    </div>
  )
}
