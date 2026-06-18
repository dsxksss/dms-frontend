import { Suspense, useState, type ComponentType } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Bell,
  Building2,
  ChevronsUpDown,
  FolderKanban,
  Languages,
  Loader2,
  LogOut,
  Mail,
  Menu,
  ScrollText,
  Search,
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
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { BrandMark } from '@/components/brand-mark'
import { NavLabel } from '@/components/nav-label'
import { useAuth, hasPerm } from '@/auth/auth-context'
import { useHasOrgs } from '@/hooks/use-orgs'
import { useMyInvitations } from '@/hooks/use-membership'
import { useSession } from '@/auth/session'
import { SUPPORTED_LANGS } from '@/i18n/i18n'
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

function useNavItems() {
  const { me } = useAuth()
  const hasOrgs = useHasOrgs()
  return NAV.filter(
    (i) => (!i.perm || hasPerm(me, i.perm)) && (!i.requiresOrg || hasOrgs),
  )
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const { t, i18n } = useTranslation()
  const items = useNavItems()
  const isZh = i18n.language.startsWith('zh')
  const inviteCount = useMyInvitations().data?.length ?? 0

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-4 pt-[18px] pb-3.5">
        <BrandMark className="size-[30px]" />
        <span className="text-[15px] font-extrabold tracking-tight">
          {t('app.shortName')}
        </span>
      </div>

      <nav className="flex-1 px-3 py-2">
        <div className="text-muted-foreground px-3 pt-2 pb-1.5 text-[10.5px] font-bold tracking-[0.05em] uppercase">
          {t('nav.workspace')}
          {isZh && (
            <span className="ml-1 font-bold opacity-70">
              {t('nav.workspace', { lng: 'en' })}
            </span>
          )}
        </div>
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-[13.5px] font-medium transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground font-bold'
                  : 'text-muted-foreground hover:bg-background hover:text-foreground',
              )
            }
          >
            <item.icon className="size-[18px] shrink-0" />
            <NavLabel
              zh={t(item.labelKey)}
              en={isZh ? t(item.labelKey, { lng: 'en' }) : undefined}
            />
            {item.to === '/inbox' && inviteCount > 0 && (
              <span className="rounded-full bg-[#DC2626] px-[7px] py-px text-[10px] font-bold text-white tabular-nums">
                {inviteCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <AccountMenu />
    </div>
  )
}

function AccountMenu() {
  const { t, i18n } = useTranslation()
  const { logout } = useAuth()
  const tenant = useSession((s) => s.tenant)
  const initials = (tenant ?? 'BD').slice(0, 2).toUpperCase()

  return (
    <div className="border-t p-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="hover:bg-background flex w-full items-center gap-2.5 rounded-[9px] px-1.5 py-1.5 text-left transition-colors">
            <span className="bg-brand text-brand-foreground flex size-7 shrink-0 items-center justify-center rounded-full text-[10.5px] font-bold">
              {initials}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-bold">
                {tenant ?? t('app.shortName')}
              </span>
              <span className="text-muted-foreground block truncate text-[10.5px]">
                {t('nav.account')}
              </span>
            </span>
            <ChevronsUpDown className="text-muted-foreground size-3.5 shrink-0" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" className="w-52">
          <DropdownMenuLabel className="flex flex-col">
            <span>{t('nav.account')}</span>
            <span className="text-muted-foreground truncate font-mono text-xs">
              {tenant}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {SUPPORTED_LANGS.map((lng) => (
            <DropdownMenuItem
              key={lng}
              onClick={() => void i18n.changeLanguage(lng)}
              className={i18n.resolvedLanguage === lng ? 'text-brand' : undefined}
            >
              <Languages className="size-4" />
              {t(`lang.${lng}`)}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => void logout()}>
            <LogOut className="size-4" />
            {t('logout', { ns: 'auth' })}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function Topbar({ onMenu }: { onMenu: () => void }) {
  const { t } = useTranslation()
  const items = useNavItems()
  const { pathname } = useLocation()
  const current = items.find(
    (i) => pathname === i.to || pathname.startsWith(i.to + '/'),
  )

  return (
    <header className="bg-card flex h-[58px] shrink-0 items-center gap-4 border-b px-4 md:px-[22px]">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onMenu}
        aria-label={t('nav.menu')}
      >
        <Menu className="size-4" />
      </Button>

      <div className="flex items-center gap-2 text-[12.5px]">
        <span className="text-muted-foreground">{t('app.shortName')}</span>
        {current && (
          <>
            <span className="text-muted-foreground/40">/</span>
            <span className="font-semibold">{t(current.labelKey)}</span>
          </>
        )}
      </div>

      <div className="flex-1" />

      <div className="bg-background hidden h-9 w-60 items-center gap-2 rounded-[9px] border px-3 text-[12.5px] sm:flex">
        <Search className="size-[15px] text-[#9aa3b0]" />
        <span className="text-[#9aa3b0]">{t('nav.search')}</span>
        <span className="ml-auto text-[11px] text-[#aeb6c2]">⌘K</span>
      </div>

      <Button variant="outline" size="icon" aria-label={t('nav.notifications')}>
        <Bell className="size-4" />
      </Button>
    </header>
  )
}

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { t } = useTranslation()

  return (
    <div className="bg-background flex h-[100dvh] overflow-hidden">
      <aside className="bg-sidebar hidden w-[236px] shrink-0 border-r md:block">
        <SidebarBody />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[236px] p-0">
          <SheetTitle className="sr-only">{t('app.shortName')}</SheetTitle>
          <SidebarBody onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setMobileOpen(true)} />
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
