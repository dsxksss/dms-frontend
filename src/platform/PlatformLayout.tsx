import { Suspense } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import {
  Building2,
  Database,
  Gauge,
  Loader2,
  LogOut,
  Settings,
} from 'lucide-react'
import {
  Sidebar,
  SidebarFooter,
  SidebarNav,
  SidebarNavItem,
} from '@/components/sidebar'
import { Topbar, type Crumb } from '@/components/topbar'
import { PlatformMark } from '@/components/brand-mark'
import { BiLabel, useIsZh } from '@/components/bilingual'
import { UserAvatar } from '@/components/user-avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { usePlatformAuth } from '@/platform/platform-auth'

const NAV = [
  { to: '/system', end: true, icon: <Gauge />, zh: '概览', en: 'Overview' },
  { to: '/system/tenants', icon: <Building2 />, zh: '企业', en: 'Tenants' },
  { to: '/system/datasets', icon: <Database />, zh: '系统数据集', en: 'System Datasets' },
  { to: '/system/settings', icon: <Settings />, zh: '全局配置', en: 'Settings' },
] as const

function PlatformSidebar() {
  const isZh = useIsZh()
  const { me, logout } = usePlatformAuth()
  const name = me?.display_name ?? me?.email ?? (isZh ? '超管' : 'Admin')

  return (
    <Sidebar dark>
      <div className="flex items-center gap-2.5 px-4 pt-[18px] pb-3.5">
        <PlatformMark size={30} />
        <div className="leading-tight">
          <div className="text-[14px] font-extrabold text-white">
            {isZh ? '平台控制台' : 'Platform Console'}
          </div>
          {isZh && <div className="text-[10px] text-[#8990B5]">Platform Console</div>}
        </div>
      </div>

      <SidebarNav>
        {NAV.map((n) => (
          <SidebarNavItem
            key={n.to}
            to={n.to}
            end={'end' in n ? n.end : undefined}
            icon={n.icon}
            dark
          >
            <BiLabel zh={n.zh} en={n.en} />
          </SidebarNavItem>
        ))}
      </SidebarNav>

      <SidebarFooter dark>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-2.5 text-left outline-none">
              <UserAvatar name={name} color="#6D5BD0" size={30} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12.5px] font-bold text-white">
                  {name}
                </div>
                <div className="truncate text-[10.5px] text-[#8990B5]">
                  {me?.email ?? ''}
                </div>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-56">
            <DropdownMenuItem disabled className="flex-col items-start gap-0">
              <span className="text-[12px] font-semibold">{name}</span>
              <span className="font-mono text-[11px] text-muted-foreground">
                {me?.email}
              </span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => void logout()}
            >
              <LogOut className="size-4" />
              {isZh ? '退出控制台' : 'Sign out'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

/** 平台控制台外壳：深色侧栏 + 顶栏 + 内容（原型 ctxPlatform）。 */
export function PlatformLayout() {
  const { pathname } = useLocation()
  const isZh = useIsZh()
  const current = [...NAV]
    .reverse()
    .find((n) =>
      'end' in n && n.end ? pathname === n.to : pathname.startsWith(n.to),
    )
  const crumbs: Crumb[] = [
    { label: isZh ? '平台控制台' : 'Platform Console' },
    { label: current ? (isZh ? current.zh : current.en) : '' },
  ]

  return (
    <div className="flex h-screen overflow-hidden">
      <PlatformSidebar />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <Topbar crumbs={crumbs} />
        <div className="flex-1 overflow-auto">
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center py-20">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
