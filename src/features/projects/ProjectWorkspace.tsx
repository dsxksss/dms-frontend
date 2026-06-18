import { Outlet, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQueries } from '@tanstack/react-query'
import {
  Boxes,
  Database,
  FlaskConical,
  FolderClosed,
  LayoutGrid,
  PenLine,
  Table2,
  Users,
} from 'lucide-react'
import {
  Sidebar,
  SidebarFooter,
  SidebarNav,
  SidebarNavItem,
} from '@/components/sidebar'
import { Topbar, type Crumb } from '@/components/topbar'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/page-header'
import { StatCard } from '@/components/stat-card'
import { BrandTile } from '@/components/brand-tile'
import { BiLabel, useIsZh } from '@/components/bilingual'
import { UserAvatar } from '@/components/user-avatar'
import { ErrorState } from '@/components/states'
import { roleTone } from '@/components/tone'
import { useProject, useProjectRole, useMembers } from '@/hooks/use-projects'
import { useEntityTypes } from '@/hooks/use-registry'
import { useDatasets } from '@/hooks/use-datasets'
import { useRuns } from '@/hooks/use-protocols'
import { useFilesSummary } from '@/hooks/use-files'
import { useAudit } from '@/hooks/use-audit'
import { useCan } from '@/auth/auth-context'
import { registryApi } from '@/api/registry'
import { formatDateTime } from '@/lib/format'
import { RegistryTab } from '@/features/registry/RegistryTab'
import { DatasetsPanel } from '@/features/datasets/DatasetsPanel'
import { ProtocolsTab } from '@/features/protocols/ProtocolsTab'
import { SignaturesPanel } from '@/features/signatures/SignaturesPanel'
import { FilesPanel } from '@/features/files/FilesPanel'
import { MembersPanel } from '@/features/projects/MembersPanel'

const NAV = [
  { seg: '', end: true, icon: <LayoutGrid />, zh: '概览', en: 'Overview' },
  { seg: '/registry', icon: <Boxes />, zh: '药物资产', en: 'Drug Assets' },
  { seg: '/data', icon: <Table2 />, zh: '数据资产', en: 'Data Assets' },
  { seg: '/datasets', icon: <Database />, zh: '数据集', en: 'Datasets', count: 'datasets' },
  { seg: '/protocols', icon: <FlaskConical />, zh: '实验方案', en: 'ELN' },
  { seg: '/files', icon: <FolderClosed />, zh: '文件', en: 'Files', count: 'files' },
  { seg: '/members', icon: <Users />, zh: '成员', en: 'Members', count: 'members' },
  { seg: '/signatures', icon: <PenLine />, zh: '签名', en: 'Signatures' },
] as const

function useProjectId() {
  return useParams<{ id: string }>().id ?? ''
}

/** 项目内上下文外壳：白侧栏（项目导航）+ 顶栏 + 内容（原型 ctxProject）。 */
export function ProjectLayout() {
  const projectId = useProjectId()
  const isZh = useIsZh()
  const project = useProject(projectId)
  const role = useProjectRole(projectId)

  const datasets = useDatasets(projectId)
  const files = useFilesSummary(projectId)
  const members = useMembers(projectId)
  const counts: Record<string, number | undefined> = {
    datasets: datasets.data?.length,
    files: files.data?.total,
    members: members.data?.length,
  }

  const name = project.data?.name ?? ''
  const crumbs: Crumb[] = [{ label: name, to: `/projects/${projectId}` }]

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar>
        <div className="px-3.5 pt-4 pb-3">
          <SidebarNavItem to="/projects" icon={<span className="text-base">←</span>}>
            <span className="text-[12.5px]">{isZh ? '返回项目列表' : 'All projects'}</span>
          </SidebarNavItem>
        </div>
        <div className="px-3 pb-2.5">
          <div className="flex items-center gap-2.5 rounded-[9px] bg-accent px-2.5 py-2.5">
            <BrandTile name={name || '·'} seed={projectId} size={24} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-bold">{name}</div>
              <div className="truncate text-[10.5px] text-muted-foreground">
                {project.data?.organization_id
                  ? isZh
                    ? '组织项目'
                    : 'Org project'
                  : isZh
                    ? '个人项目'
                    : 'Personal'}
              </div>
            </div>
          </div>
        </div>
        <SidebarNav>
          {NAV.map((n) => (
            <SidebarNavItem
              key={n.seg}
              to={`/projects/${projectId}${n.seg}`}
              end={'end' in n ? n.end : undefined}
              icon={n.icon}
              badge={'count' in n ? counts[n.count] : undefined}
            >
              <BiLabel zh={n.zh} en={n.en} />
            </SidebarNavItem>
          ))}
        </SidebarNav>
        <SidebarFooter>
          {role && (
            <Badge variant={roleTone(role)} className="w-full justify-center">
              {isZh ? '我的角色' : 'Role'}：{role}
            </Badge>
          )}
        </SidebarFooter>
      </Sidebar>

      <div className="relative flex min-w-0 flex-1 flex-col">
        <Topbar crumbs={crumbs} />
        <div className="flex-1 overflow-auto">
          {project.isError ? (
            <div className="p-8">
              <ErrorState error={project.error} onRetry={() => project.refetch()} />
            </div>
          ) : (
            <Outlet />
          )}
        </div>
      </div>
    </div>
  )
}

/* ============ sections ============ */

export function ProjectRegistrySection() {
  return <RegistryTab projectId={useProjectId()} kind="asset" />
}
export function ProjectDataSection() {
  return <RegistryTab projectId={useProjectId()} kind="template" />
}
export function ProjectDatasetsSection() {
  return <DatasetsPanel projectId={useProjectId()} />
}
export function ProjectProtocolsSection() {
  return <ProtocolsTab projectId={useProjectId()} />
}
export function ProjectFilesSection() {
  return <FilesPanel projectId={useProjectId()} />
}
export function ProjectMembersSection() {
  return <MembersPanel projectId={useProjectId()} />
}
export function ProjectSignaturesSection() {
  return <SignaturesPanel projectId={useProjectId()} />
}

/* ============ overview dashboard ============ */

const STAT_TINTS = {
  assets: ['#EAF0FF', '#2F6BFF'],
  datasets: ['#E7F6EC', '#15803D'],
  runs: ['#FEF4E6', '#B45309'],
  members: ['#F3EEFB', '#7C3AED'],
} as const

const BAR_COLORS = ['#2F6BFF', '#16A34A', '#C77B16', '#7C3AED', '#DB2777']

export function ProjectOverviewSection() {
  const projectId = useProjectId()
  const { t } = useTranslation('projects')
  const isZh = useIsZh()
  const canAudit = useCan('audit:read')

  const project = useProject(projectId)
  const members = useMembers(projectId)
  const datasets = useDatasets(projectId)
  const runs = useRuns(projectId, { limit: 1 })
  const types = useEntityTypes(projectId)
  const assetTypes = (types.data ?? []).filter((ty) => ty.kind === 'asset')

  const counts = useQueries({
    queries: assetTypes.map((ty) => ({
      queryKey: ['registry', projectId, 'count', 'asset', ty.id],
      queryFn: () =>
        registryApi
          .listRecords(projectId, 'asset', { type: ty.id, limit: 1 })
          .then((r) => r.total),
      staleTime: 30_000,
    })),
  })
  const assetTotal = counts.reduce((s, q) => s + (q.data ?? 0), 0)
  const maxBar = Math.max(1, ...counts.map((q) => q.data ?? 0))

  const audit = useAudit({ limit: 6 })
  const memberList = members.data ?? []

  return (
    <div className="mx-auto max-w-[1180px] px-[30px] py-[26px]">
      <PageHeader
        title={project.data?.name ?? ''}
        titleEn={isZh ? '概览' : undefined}
        size="md"
        description={project.data?.description}
        actions={
          <div className="flex items-center">
            {memberList.slice(0, 4).map((m, i) => (
              <UserAvatar
                key={m.user_id}
                name={m.user_id}
                seed={m.user_id}
                size={28}
                ring
                className={i > 0 ? '-ml-[7px]' : ''}
              />
            ))}
            {memberList.length > 4 && (
              <span className="-ml-[7px] flex size-7 items-center justify-center rounded-full bg-[#E9EDF4] text-[10.5px] font-bold text-[#5a6473] ring-2 ring-white">
                +{memberList.length - 4}
              </span>
            )}
          </div>
        }
      />

      <div className="mb-[18px] grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <StatCard
          label={t('tabs.registry')}
          value={assetTotal}
          tint={STAT_TINTS.assets}
          icon={<Boxes />}
        />
        <StatCard
          label={t('tabs.datasets')}
          value={datasets.data?.length ?? 0}
          tint={STAT_TINTS.datasets}
          icon={<Database />}
        />
        <StatCard
          label={t('overview.runs')}
          value={runs.data?.total ?? 0}
          tint={STAT_TINTS.runs}
          icon={<FlaskConical />}
        />
        <StatCard
          label={t('members.title')}
          value={memberList.length}
          tint={STAT_TINTS.members}
          icon={<Users />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="card-shadow rounded-[14px] border bg-card px-5 py-[18px]">
          <div className="mb-3.5 text-[14px] font-bold">{t('overview.byType')}</div>
          {assetTypes.length === 0 ? (
            <p className="text-[12.5px] text-muted-foreground">
              {t('overview.none')}
            </p>
          ) : (
            assetTypes.map((ty, i) => {
              const c = counts[i]?.data ?? 0
              return (
                <div key={ty.id} className="mb-3 flex items-center gap-3">
                  <div className="w-[90px] truncate text-[12.5px] font-semibold">
                    {ty.name}
                  </div>
                  <div className="h-[9px] flex-1 overflow-hidden rounded-full bg-divider">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(c / maxBar) * 100}%`,
                        background: BAR_COLORS[i % BAR_COLORS.length],
                      }}
                    />
                  </div>
                  <div className="mono w-9 text-right text-[12px] text-muted-foreground">
                    {c}
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="card-shadow rounded-[14px] border bg-card px-5 py-[18px]">
          <div className="mb-3.5 text-[14px] font-bold">{t('overview.recent')}</div>
          {!canAudit ? (
            <p className="text-[12.5px] text-muted-foreground">
              {t('overview.noActivity')}
            </p>
          ) : (audit.data?.items ?? []).length === 0 ? (
            <p className="text-[12.5px] text-muted-foreground">
              {t('overview.noActivity')}
            </p>
          ) : (
            (audit.data?.items ?? []).map((a) => (
              <div key={a.id} className="mb-3.5 flex gap-2.5">
                <UserAvatar
                  name={a.user_name || '?'}
                  seed={a.actor_id || a.id}
                  size={24}
                  className="mt-0.5"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] leading-snug">
                    <b>{a.user_name || a.user_handle || '—'}</b>{' '}
                    {a.event_description || a.action}
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {formatDateTime(a.occurred_at)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
