import { Suspense, useState, type ComponentType } from 'react'
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useParams,
} from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
import { PageHeader } from '@/components/page-header'
import { NavLabel } from '@/components/nav-label'
import { EmptyState, ErrorState } from '@/components/states'
import { Can } from '@/auth/Can'
import { useProject, useProjectRole } from '@/hooks/use-projects'
import { roleAtLeast } from '@/lib/roles'
import { roleTone } from '@/lib/tone'
import { codeOf, tintOf } from '@/lib/tile'
import { shortId } from '@/lib/format'
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

export function ProjectOverviewSection() {
  const id = useProjectId()
  const { t } = useTranslation('projects')
  const query = useProject(id)
  const [editOpen, setEditOpen] = useState(false)

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-56 w-full max-w-[640px]" />
      </div>
    )
  }
  if (query.isError) {
    return <ErrorState error={query.error} onRetry={() => query.refetch()} />
  }
  const project = query.data
  if (!project) return <EmptyState title={t('notFound')} />

  const rows: Array<[string, React.ReactNode]> = [
    [t('overview.id'), <span className="font-mono text-[12.5px]">{shortId(project.id)}</span>],
    [
      t('overview.organization'),
      project.organization_id ? (
        <span className="font-mono text-[12.5px]">
          {shortId(project.organization_id)}
        </span>
      ) : (
        <span className="text-muted-foreground">{t('overview.none')}</span>
      ),
    ],
    [
      t('overview.status'),
      <Badge variant={project.archived ? 'neutral' : 'success'}>
        {t(project.archived ? 'status.archived' : 'status.active')}
      </Badge>,
    ],
    [t('overview.version'), <span className="tabular-nums">{project.version}</span>],
    [
      t('overview.description'),
      project.description || (
        <span className="text-muted-foreground">{t('overview.none')}</span>
      ),
    ],
  ]

  return (
    <div className="mx-auto max-w-[1180px]">
      <PageHeader
        title={project.name}
        description={project.description || undefined}
        actions={
          <Can perm="project:write">
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="size-4" />
              {t('row.edit')}
            </Button>
          </Can>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,360px)_1fr]">
        <Card className="gap-0 py-0">
          {rows.map(([label, value], i) => (
            <div
              key={i}
              className={cn(
                'flex items-center gap-4 px-5 py-3.5',
                i < rows.length - 1 && 'border-divider border-b',
              )}
            >
              <div className="text-muted-foreground w-28 shrink-0 text-[12.5px]">
                {label}
              </div>
              <div className="min-w-0 flex-1 text-[13px]">{value}</div>
            </div>
          ))}
        </Card>

        <div className="grid grid-cols-2 gap-4 self-start sm:grid-cols-3">
          {SECTIONS.filter((s) => s.seg !== '').map((s) => {
            const tint = tintOf(s.key)
            return (
              <Link
                key={s.key}
                to={`/projects/${id}/${s.seg}`}
                className="group bg-card hover:border-brand/40 flex flex-col gap-2.5 rounded-[14px] border p-4 shadow-[0_1px_2px_rgba(20,40,80,0.04)] transition-all hover:shadow-[0_8px_24px_rgba(20,40,80,0.08)]"
              >
                <span
                  className="flex size-9 items-center justify-center rounded-[10px]"
                  style={{ background: tint.bg, color: tint.fg }}
                >
                  <s.icon className="size-[18px]" />
                </span>
                <div className="text-[13.5px] font-bold">{t(`tabs.${s.key}`)}</div>
                <div className="text-brand text-[12px] font-semibold opacity-0 transition-opacity group-hover:opacity-100">
                  {t('openSection')} →
                </div>
              </Link>
            )
          })}
        </div>
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
