import { Suspense, type ComponentType } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Bell,
  Building2,
  ChevronsUpDown,
  Database,
  Gauge,
  Loader2,
  LogOut,
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
import { BrandMark } from '@/components/brand-mark'
import { NavLabel } from '@/components/nav-label'
import { usePlatformAuth } from '@/platform/platform-auth'
import { cn } from '@/lib/utils'

interface NavItem {
  to: string
  labelKey: string
  icon: ComponentType<{ className?: string }>
  end?: boolean
}

const NAV: NavItem[] = [
  { to: '/system', labelKey: 'nav.overview', icon: Gauge, end: true },
  { to: '/system/tenants', labelKey: 'nav.tenants', icon: Building2 },
  { to: '/system/datasets', labelKey: 'nav.datasets', icon: Database },
  { to: '/system/settings', labelKey: 'nav.settings', icon: Settings },
]

function SidebarNav() {
  const { t, i18n } = useTranslation('platform')
  const isZh = i18n.language.startsWith('zh')
  return (
    <aside className="hidden w-[236px] shrink-0 flex-col bg-[#161A2B] md:flex">
      <div className="flex items-center gap-2.5 px-4 pt-[18px] pb-3.5">
        <BrandMark variant="platform" className="size-[30px]" />
        <div>
          <div className="text-[14px] font-extrabold text-white">{t('title')}</div>
          <div className="text-[10px] text-[#8990B5]">Platform Console</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-2">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-[13.5px] transition-colors',
                isActive
                  ? 'bg-[#6D5BD0] font-bold text-white'
                  : 'font-medium text-[#9AA0C4] hover:bg-white/5 hover:text-white',
              )
            }
          >
            <item.icon className="size-[18px] shrink-0" />
            <NavLabel
              zh={t(item.labelKey)}
              en={isZh ? t(item.labelKey, { lng: 'en' }) : undefined}
            />
          </NavLink>
        ))}
      </nav>

      <PlatformAccountMenu />
    </aside>
  )
}

function PlatformAccountMenu() {
  const { t } = useTranslation('platform')
  const { me, logout } = usePlatformAuth()
  const name = me?.display_name ?? me?.email ?? t('account')
  const initials = (me?.display_name ?? me?.email ?? 'P').slice(0, 2).toUpperCase()

  return (
    <div className="border-t border-white/8 p-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex w-full items-center gap-2.5 rounded-[9px] px-1.5 py-1.5 text-left transition-colors hover:bg-white/5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#6D5BD0] text-[10.5px] font-bold text-white">
              {initials}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-bold text-white">
                {name}
              </span>
              <span className="block truncate text-[10.5px] text-[#8990B5]">
                {me?.email ?? ''}
              </span>
            </span>
            <ChevronsUpDown className="size-3.5 shrink-0 text-[#8990B5]" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" className="w-56">
          <DropdownMenuLabel className="flex flex-col">
            <span>{me?.display_name ?? t('account')}</span>
            <span className="text-muted-foreground truncate font-mono text-xs">
              {me?.email}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => void logout()}>
            <LogOut className="size-4" />
            {t('logout')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function Topbar() {
  const { t } = useTranslation('platform')
  const { pathname } = useLocation()
  const current = [...NAV]
    .reverse()
    .find((i) => (i.end ? pathname === i.to : pathname.startsWith(i.to)))

  return (
    <header className="bg-card flex h-[58px] shrink-0 items-center gap-4 border-b px-4 md:px-[22px]">
      <div className="flex items-center gap-2 text-[12.5px]">
        <span className="text-muted-foreground">{t('title')}</span>
        {current && (
          <>
            <span className="text-muted-foreground/40">/</span>
            <span className="font-semibold">{t(current.labelKey)}</span>
          </>
        )}
      </div>
      <div className="flex-1" />
      <Button variant="outline" size="icon" aria-label={t('title')}>
        <Bell className="size-4" />
      </Button>
    </header>
  )
}

export function PlatformLayout() {
  return (
    <div className="bg-background flex h-[100dvh] overflow-hidden">
      <SidebarNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-auto px-5 py-6 md:px-8 md:py-7">
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
