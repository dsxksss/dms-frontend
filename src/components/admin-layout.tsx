import { Suspense, type ComponentType } from 'react'
import { NavLink, Outlet, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Building2,
  Gauge,
  Loader2,
  LogOut,
  ScrollText,
  Users,
  ArrowLeft,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ThemeToggle } from '@/components/theme-toggle'
import { LangToggle } from '@/components/lang-toggle'
import { useAuth } from '@/auth/auth-context'
import { cn } from '@/lib/utils'

interface NavItem {
  to: string
  labelKey: string
  icon: ComponentType<{ className?: string }>
  end?: boolean
}

const NAV: NavItem[] = [
  { to: '/system', labelKey: 'nav.overview', icon: Gauge, end: true },
  { to: '/system/orgs', labelKey: 'nav.orgs', icon: Building2 },
  { to: '/system/users', labelKey: 'nav.users', icon: Users },
  { to: '/system/audit', labelKey: 'nav.audit', icon: ScrollText },
]

function SidebarNav() {
  const { t } = useTranslation('admin')
  return (
    <nav className="flex flex-col gap-1 p-3">
      <div className="flex items-center gap-2 px-2 py-3">
        <div className="bg-foreground text-background flex size-7 items-center justify-center rounded-md text-sm font-semibold">
          A
        </div>
        <span className="font-semibold tracking-tight">{t('title')}</span>
      </div>
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors',
              isActive
                ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground',
            )
          }
        >
          <item.icon className="size-4" />
          {t(item.labelKey)}
        </NavLink>
      ))}
    </nav>
  )
}

function UserMenu() {
  const { t } = useTranslation('auth')
  const { me, logout } = useAuth()
  const initial = (me?.user_id ?? '?').slice(0, 1).toUpperCase()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="bg-muted size-8 rounded-full text-xs font-medium"
        >
          {initial}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="flex flex-col">
          <span>{t('account')}</span>
          <span className="text-muted-foreground truncate font-mono text-xs">
            {me?.tenant_id}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void logout()}>
          <LogOut className="size-4" />
          {t('logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function AdminLayout() {
  const { t } = useTranslation('admin')
  return (
    <div className="flex min-h-[100dvh]">
      <aside className="bg-sidebar hidden w-60 shrink-0 border-r md:block">
        <SidebarNav />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-2 border-b px-4">
          <Button asChild variant="ghost" size="sm">
            <Link to="/">
              <ArrowLeft className="size-4" />
              {t('toApp')}
            </Link>
          </Button>
          <div className="flex-1" />
          <LangToggle />
          <ThemeToggle />
          <UserMenu />
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center">
                <Loader2 className="text-muted-foreground size-6 animate-spin" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
