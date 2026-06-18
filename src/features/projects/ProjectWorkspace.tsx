import { Suspense, useState, type ComponentType } from 'react'
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useParams,
} from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQueries } from '@tanstack/react-query'
import {
  Bell,
  Boxes,
  ChevronLeft,
  FlaskConical,
  Folder,
  LayoutGrid,
  Loader2,
  Menu,
  PenLine,
  Pencil,
  Search,
  Table2,
  Users,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { NavLabel } from '@/components/nav-label'
import { UserAvatar } from '@/components/user-avatar'
import { EmptyState, ErrorState } from '@/components/states'
import { Can } from '@/auth/Can'
import { useCan } from '@/auth/auth-context'
import { useMembers, useProject, useProjectRole } from '@/hooks/use-projects'
import { useEntityTypes } from '@/hooks/use-registry'
import { useDatasets } from '@/hooks/use-datasets'
import { useFilesSummary } from '@/hooks/use-files'
import { useRuns } from '@/hooks/use-protocols'
import { useAudit } from '@/hooks/use-audit'
import { registryApi } from '@/api/registry'
import { roleAtLeast } from '@/lib/roles'
import { roleTone } from '@/lib/tone'
import { codeOf, tintOf } from '@/lib/tile'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ResourceGrantsPanel } from '@/features/grants/ResourceGrantsPanel'
import { RegistryTab } from '@/features/registry/RegistryTab'
import { ProtocolsTab } from '@/features/protocols/ProtocolsTab'
import { DatasetsPanel } from '@/features/datasets/DatasetsPanel'
import { FilesPanel } from '@/features/files/FilesPanel'
import { SignaturesPanel } from '@/features/signatures/SignaturesPanel'
import { MembersPanel } from './MembersPanel'
import { SharesPanel } from './SharesPanel'
import { CreateProjectDialog } from './CreateProjectDialog'

interface Section {
  seg: string
  key: string
  icon: ComponentType<{ className?: string }>
}

const SECTIONS: Section[] = [
  { seg: '', key: 'overview', icon: LayoutGrid },
  { seg: 'registry', key: 'registry', icon: Boxes },
  { seg: 'protocols', key: 'protocols', icon: FlaskConical },
  { seg: 'datasets', key: 'datasets', icon: Table2 },
  { seg: 'files', key: 'files', icon: Folder },
  { seg: 'members', key: 'members', icon: Users },
  { seg: 'signatures', key: 'signatures', icon: PenLine },
]

function useProjectId() {
  return useParams().id ?? ''
}

function ProjectSidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const id = useProjectId()
  const { t, i18n } = useTranslation('projects')
  const isZh = i18n.language.startsWith('zh')
  const project = useProject(id).data
  const role = useProjectRole(id)
  const tint = tintOf(id)

  // 分区计数徽标（资产数=各资产类型记录数求和，并发取；其余单查询，均缓存复用）。
  const types = useEntityTypes(id)
  const assetTypes = (types.data ?? []).filter((ty) => ty.kind === 'asset')
  const assetCounts = useQueries({
    queries: assetTypes.map((ty) => ({
      queryKey: ['registry', id, 'count', 'asset', ty.id],
      queryFn: () =>
        registryApi
          .listRecords(id, 'asset', { type: ty.id, limit: 1 })
          .then((r) => r.total),
      enabled: !!id,
    })),
  })
  const datasets = useDatasets(id)
  const runs = useRuns(id, { limit: 1 })
  const files = useFilesSummary(id)
  const members = useMembers(id)
  const sectionCount: Record<string, number | undefined> = {
    registry: types.data
      ? assetCounts.reduce((s, c) => s + ((c.data as number) ?? 0), 0)
      : undefined,
    datasets: datasets.data?.length,
    protocols: runs.data?.total,
    files: files.data?.total,
    members: members.data?.length,
  }

  return (
    <div className="flex h-full flex-col">
      <div className="px-3.5 pt-4 pb-2">
        <Link
          to="/projects"
          onClick={onNavigate}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 rounded-[9px] px-2 py-1.5 text-[12.5px] font-medium transition-colors"
        >
          <ChevronLeft className="size-4" />
          {t('back')}
        </Link>
      </div>

      <div className="px-3 pb-2">
        <div className="bg-accent flex items-center gap-2.5 rounded-[9px] px-2.5 py-2.5">
          <span
            className="flex size-6 shrink-0 items-center justify-center rounded-[7px] text-[10px] font-bold"
            style={{ background: tint.fg, color: '#fff' }}
          >
            {project ? codeOf(project.name) : '··'}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-bold">
              {project?.name ?? '…'}
            </div>
            <div className="text-muted-foreground truncate text-[10.5px]">
              {project?.organization_id
                ? t('card.orgProject')
                : t('card.personalProject')}
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-auto px-3 py-1">
        {SECTIONS.map((s) => (
          <NavLink
            key={s.key}
            to={`/projects/${id}${s.seg ? `/${s.seg}` : ''}`}
            end={s.seg === ''}
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
            <s.icon className="size-[18px] shrink-0" />
            <NavLabel
              zh={t(`tabs.${s.key}`)}
              en={isZh ? t(`tabs.${s.key}`, { lng: 'en' }) : undefined}
            />
            {sectionCount[s.key] != null && (
              <span className="bg-muted text-muted-foreground rounded-full px-1.5 text-[10.5px] font-bold tabular-nums">
                {sectionCount[s.key]}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {role && (
        <div className="border-t p-3">
          <Badge variant={roleTone(role)}>
            {t('roleLabel')}：{role.charAt(0).toUpperCase() + role.slice(1)}
          </Badge>
        </div>
      )}
    </div>
  )
}

function ProjectTopbar({ onMenu }: { onMenu: () => void }) {
  const id = useProjectId()
  const { t } = useTranslation('projects')
  const { t: tc } = useTranslation('common')
  const project = useProject(id).data
  const { pathname } = useLocation()
  const seg = pathname.replace(`/projects/${id}`, '').replace(/^\//, '').split('/')[0]
  const current = SECTIONS.find((s) => s.seg === seg) ?? SECTIONS[0]

  return (
    <header className="bg-card flex h-[58px] shrink-0 items-center gap-4 border-b px-4 md:px-[22px]">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onMenu}
        aria-label={tc('nav.menu')}
      >
        <Menu className="size-4" />
      </Button>
      <div className="flex items-center gap-2 text-[12.5px]">
        <Link to="/projects" className="text-muted-foreground hover:text-foreground">
          {tc('app.shortName')}
        </Link>
        <span className="text-muted-foreground/40">/</span>
        <span className="text-muted-foreground max-w-[160px] truncate">
          {project?.name ?? '…'}
        </span>
        <span className="text-muted-foreground/40">/</span>
        <span className="font-semibold">{t(`tabs.${current.key}`)}</span>
      </div>
      <div className="flex-1" />
      <div className="bg-background hidden h-9 w-60 items-center gap-2 rounded-[9px] border px-3 text-[12.5px] sm:flex">
        <Search className="size-[15px] text-[#9aa3b0]" />
        <span className="text-[#9aa3b0]">{tc('nav.search')}</span>
        <span className="ml-auto text-[11px] text-[#aeb6c2]">⌘K</span>
      </div>
      <Button variant="outline" size="icon" aria-label={tc('nav.notifications')}>
        <Bell className="size-4" />
      </Button>
    </header>
  )
}

export function ProjectLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { t } = useTranslation('projects')

  return (
    <div className="bg-background flex h-[100dvh] overflow-hidden">
      <aside className="bg-sidebar hidden w-[236px] shrink-0 border-r md:block">
        <ProjectSidebarBody />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[236px] p-0">
          <SheetTitle className="sr-only">{t('title')}</SheetTitle>
          <ProjectSidebarBody onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <ProjectTopbar onMenu={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-auto px-5 py-6 md:px-7 md:py-6">
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

/* —— sections —— */

const STAT_TINTS = [
  { bg: '#EAF0FF', fg: '#2F6BFF', icon: Boxes },
  { bg: '#E7F6EC', fg: '#15803D', icon: Table2 },
  { bg: '#FEF4E6', fg: '#B45309', icon: FlaskConical },
  { bg: '#F3EEFB', fg: '#7C3AED', icon: Users },
]
const TYPE_COLORS = ['#2F6BFF', '#16A34A', '#C77B16', '#7C3AED', '#DB2777', '#0E9AB5']

export function ProjectOverviewSection() {
  const id = useProjectId()
  const { t } = useTranslation('projects')
  const query = useProject(id)
  const [editOpen, setEditOpen] = useState(false)

  const types = useEntityTypes(id)
  const assetTypes = (types.data ?? []).filter((ty) => ty.kind === 'asset')
  const counts = useQueries({
    queries: assetTypes.map((ty) => ({
      queryKey: ['registry', id, 'count', 'asset', ty.id],
      queryFn: () =>
        registryApi
          .listRecords(id, 'asset', { type: ty.id, limit: 1 })
          .then((r) => r.total),
      enabled: !!id,
    })),
  })
  const datasets = useDatasets(id)
  const runs = useRuns(id, { limit: 1 })
  const members = useMembers(id)
  const canAudit = useCan('audit:read')
  const audit = useAudit({ limit: 6 })

  const totalAssets = counts.reduce((s, c) => s + ((c.data as number) ?? 0), 0)
  const typeBars = assetTypes
    .map((ty, i) => ({
      name: ty.name,
      count: (counts[i].data as number) ?? 0,
      color: TYPE_COLORS[i % TYPE_COLORS.length],
    }))
    .sort((a, b) => b.count - a.count)
  const maxCount = Math.max(1, ...typeBars.map((b) => b.count))

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-56 w-full" />
      </div>
    )
  }
  if (query.isError) {
    return <ErrorState error={query.error} onRetry={() => query.refetch()} />
  }
  const project = query.data
  if (!project) return <EmptyState title={t('notFound')} />

  const stats = [
    { label: t('tabs.registry'), value: totalAssets },
    { label: t('tabs.datasets'), value: datasets.data?.length ?? 0 },
    { label: t('overview.runs'), value: runs.data?.total ?? 0 },
    { label: t('tabs.members'), value: members.data?.length ?? 0 },
  ]
  const mlist = members.data ?? []

  return (
    <div className="mx-auto max-w-[1180px]">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[24px] font-extrabold tracking-tight">
            {project.name}{' '}
            <span className="text-muted-foreground text-[16px] font-semibold">
              {t('tabs.overview')}
            </span>
          </h1>
          {project.description && (
            <p className="text-muted-foreground mt-1 text-[13px]">
              {project.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {mlist.length > 0 && (
            <div className="flex items-center">
              {mlist.slice(0, 4).map((m, i) => (
                <UserAvatar
                  key={m.user_id}
                  seed={m.user_id}
                  className={cn('ring-card ring-2', i > 0 && '-ml-2')}
                />
              ))}
              {mlist.length > 4 && (
                <span className="bg-muted text-muted-foreground ring-card -ml-2 flex size-[30px] items-center justify-center rounded-full text-[10px] font-bold ring-2">
                  +{mlist.length - 4}
                </span>
              )}
            </div>
          )}
          <Can perm="project:write">
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="size-4" />
              {t('row.edit')}
            </Button>
          </Can>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {stats.map((s, i) => {
          const tint = STAT_TINTS[i]
          return (
            <Card key={i} className="gap-0 px-[18px] py-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-[12.5px] font-semibold">
                  {s.label}
                </span>
                <span
                  className="flex size-[30px] items-center justify-center rounded-[8px]"
                  style={{ background: tint.bg, color: tint.fg }}
                >
                  <tint.icon className="size-4" />
                </span>
              </div>
              <div className="mt-2 text-[27px] font-extrabold tracking-tight tabular-nums">
                {s.value}
              </div>
            </Card>
          )
        })}
      </div>

      <div className="mt-[18px] grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card className="gap-0 px-5 py-[18px]">
          <div className="mb-3.5 text-[14px] font-bold">{t('overview.byType')}</div>
          {typeBars.length === 0 ? (
            <p className="text-muted-foreground text-[13px]">{t('overview.none')}</p>
          ) : (
            typeBars.map((b) => (
              <div key={b.name} className="mb-3 flex items-center gap-3 last:mb-0">
                <div className="w-[92px] shrink-0 truncate text-[12.5px] font-semibold">
                  {b.name}
                </div>
                <div className="bg-muted h-[9px] flex-1 overflow-hidden rounded-full">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(b.count / maxCount) * 100}%`,
                      background: b.color,
                    }}
                  />
                </div>
                <div className="text-muted-foreground w-9 text-right font-mono text-[12px] tabular-nums">
                  {b.count}
                </div>
              </div>
            ))
          )}
        </Card>

        <Card className="gap-0 px-5 py-[18px]">
          <div className="mb-3.5 text-[14px] font-bold">{t('overview.recent')}</div>
          {!canAudit ? (
            <p className="text-muted-foreground text-[13px]">{t('overview.noActivity')}</p>
          ) : audit.data && audit.data.items.length > 0 ? (
            audit.data.items.slice(0, 5).map((a) => (
              <div key={a.id} className="mb-3.5 flex gap-2.5 last:mb-0">
                <UserAvatar
                  seed={a.actor_id ?? a.user_name ?? '?'}
                  initials={a.user_name ?? undefined}
                  className="size-6"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] leading-[1.45]">
                    <b>{a.user_name ?? '—'}</b>{' '}
                    <span className="text-[#5a6473]">
                      {a.event_description ?? a.action}
                    </span>
                  </div>
                  <div className="text-muted-foreground mt-0.5 text-[11px] tabular-nums">
                    {formatDateTime(a.occurred_at)}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground text-[13px]">{t('overview.noActivity')}</p>
          )}
        </Card>
      </div>

      <CreateProjectDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        project={project}
      />
    </div>
  )
}

export function ProjectRegistrySection() {
  return <RegistryTab projectId={useProjectId()} />
}

export function ProjectProtocolsSection() {
  return <ProtocolsTab projectId={useProjectId()} />
}

export function ProjectDatasetsSection() {
  return <DatasetsPanel projectId={useProjectId()} />
}

export function ProjectFilesSection() {
  return <FilesPanel projectId={useProjectId()} />
}

export function ProjectSignaturesSection() {
  return <SignaturesPanel projectId={useProjectId()} />
}

export function ProjectMembersSection() {
  const id = useProjectId()
  const { t } = useTranslation('projects')
  const role = useProjectRole(id)
  const canGrant = roleAtLeast(role, 'manager')

  return (
    <div className="mx-auto max-w-[1180px] space-y-8">
      <MembersPanel projectId={id} />
      <SharesPanel projectId={id} />
      {canGrant && (
        <div className="space-y-3">
          <h2 className="text-[15px] font-bold">
            {t('resourceGrants.title', { ns: 'common' })}
          </h2>
          <ResourceGrantsPanel resourceType="project" resourceId={id} />
        </div>
      )}
    </div>
  )
}
