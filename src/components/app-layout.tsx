import { Suspense, useState, type ComponentType } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Building2,
  Database,
  FolderKanban,
  Loader2,
  LogOut,
  Mail,
  Menu,
  ScrollText,
  Settings,
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
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { ThemeToggle } from '@/components/theme-toggle'
import { LangToggle } from '@/components/lang-toggle'
import { useAuth, hasPerm } from '@/auth/auth-context'
import { useHasOrgs } from '@/hooks/use-orgs'
import { cn } from '@/lib/utils'

interface NavItem {
  to: string
  labelKey: string
  icon: ComponentType<{ className?: string }>
  perm?: string
  /** 仅在用户拥有组织时显示（组织/审计等管理类入口）。 */
  requiresOrg?: boolean
}

const NAV: NavItem[] = [
  { to: '/projects', labelKey: 'nav.projects', icon: FolderKanban },
  { to: '/datasets', labelKey: 'nav.datasets', icon: Database, perm: 'dataset:read' },
  { to: '/inbox', labelKey: 'nav.inbox', icon: Mail },
  {
    to: '/orgs',
    labelKey: 'nav.organizations',
    icon: Building2,
    perm: 'org:read',
    requiresOrg: true,
  },
  {
    to: '/audit',
    labelKey: 'nav.audit',
    icon: ScrollText,
    perm: 'audit:read',
    requiresOrg: true,
  },
  { to: '/settings', labelKey: 'nav.settings', icon: Settings },
]

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation()
  const { me } = useAuth()
  const hasOrgs = useHasOrgs()
  const items = NAV.filter(
    (i) => (!i.perm || hasPerm(me, i.perm)) && (!i.requiresOrg || hasOrgs),
  )

  return (
    <nav className="flex flex-col gap-1 p-3">
      <div className="flex items-center gap-2 px-2 py-3">
        <div className="bg-brand text-brand-foreground flex size-7 items-center justify-center rounded-md text-sm font-semibold">
          D
        </div>
        <span className="font-semibold tracking-tight">{t('app.shortName')}</span>
      </div>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
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

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-[100dvh]">
      <aside className="bg-sidebar hidden w-60 shrink-0 border-r md:block">
        <SidebarNav />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-2 border-b px-4">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-60 p-0">
              <SidebarNav onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>

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
