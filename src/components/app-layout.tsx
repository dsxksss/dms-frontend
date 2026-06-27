import { Outlet, useLocation } from 'react-router-dom'
import { Activity, Building2, FolderClosed, Mail, Settings } from 'lucide-react'
import {
  Sidebar,
  SidebarCaption,
  SidebarFooter,
  SidebarNav,
  SidebarNavItem,
} from '@/components/sidebar'
import { Topbar, type Crumb } from '@/components/topbar'
import { BrandMark } from '@/components/brand-mark'
import { BiLabel, useIsZh } from '@/components/bilingual'
import { SidebarUser } from '@/components/sidebar-user'
import { useCan } from '@/auth/auth-context'
import {
  useIncomingOrgJoinRequests,
  useMyInvitations,
} from '@/hooks/use-membership'
import { useIncomingProjectJoinRequests } from '@/hooks/use-projects'
import { useFirstRunTour, useTourReplay } from '@/features/onboarding/onboarding'

/** 路由首段 → 面包屑标签。 */
const SECTION: Record<string, [string, string]> = {
  projects: ['我的项目', 'Projects'],
  orgs: ['组织', 'Organizations'],
  inbox: ['邀请', 'Invitations'],
  audit: ['审计', 'Audit'],
  settings: ['设置', 'Settings'],
  'public-datasets': ['公共数据集', 'Public datasets'],
}

function GlobalSidebar() {
  const isZh = useIsZh()
  const canAudit = useCan('audit:read')
  const invites = useMyInvitations()
  const incomingProjects = useIncomingProjectJoinRequests()
  const incomingOrgs = useIncomingOrgJoinRequests()
  // 收件箱红点 = 待我处理的邀请 + 待我审批的（项目 + 组织）加入申请。
  const inboxCount =
    (invites.data?.length ?? 0) +
    (incomingProjects.data?.length ?? 0) +
    (incomingOrgs.data?.length ?? 0)

  return (
    <Sidebar>
      <div className="flex items-center gap-2.5 px-4 pt-[18px] pb-3.5">
        <BrandMark size={30} />
        <span className="text-[15px] font-extrabold">Bio-Data OS</span>
      </div>
      <SidebarNav>
        <SidebarCaption>{isZh ? '工作区 WORKSPACE' : 'WORKSPACE'}</SidebarCaption>
        <SidebarNavItem to="/projects" icon={<FolderClosed />} tourId="nav-projects">
          <BiLabel zh="我的项目" en="Projects" />
        </SidebarNavItem>
        <SidebarNavItem to="/orgs" icon={<Building2 />} tourId="nav-orgs">
          <BiLabel zh="组织" en="Organizations" />
        </SidebarNavItem>
        <SidebarNavItem
          to="/inbox"
          icon={<Mail />}
          badge={inboxCount || undefined}
          badgeRed
        >
          <BiLabel zh="邀请" en="Invitations" />
        </SidebarNavItem>

        {canAudit && (
          <>
            <div className="h-2.5" />
            <SidebarCaption>{isZh ? '系统 SYSTEM' : 'SYSTEM'}</SidebarCaption>
            <SidebarNavItem to="/audit" icon={<Activity />} tourId="nav-audit">
              <BiLabel zh="审计" en="Audit" />
            </SidebarNavItem>
          </>
        )}
        <SidebarNavItem to="/settings" icon={<Settings />}>
          <BiLabel zh="设置" en="Settings" />
        </SidebarNavItem>
      </SidebarNav>

      <SidebarFooter>
        <SidebarUser />
      </SidebarFooter>
    </Sidebar>
  )
}

/** 全局上下文外壳：白侧栏 + 顶栏 + 内容（原型 ctxGlobal）。 */
export function AppLayout() {
  const { pathname } = useLocation()
  const isZh = useIsZh()
  const seg = pathname.split('/')[1] || 'projects'
  const label = SECTION[seg]
  const crumbs: Crumb[] = [
    { label: label ? (isZh ? label[0] : label[1]) : 'Bio-Data OS' },
  ]
  const { replayApp } = useTourReplay()
  // 首登 /projects 自动起一轮全局导航引导（看过即不再弹）。
  useFirstRunTour('app', seg === 'projects')
  return (
    <div className="flex h-screen overflow-hidden">
      <GlobalSidebar />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <Topbar crumbs={crumbs} onHelp={replayApp} />
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
