import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Archive, ArchiveRestore, KeyRound, ListChecks, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EmptyState, ErrorState, TableSkeleton } from '@/components/states'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Pagination } from '@/components/pagination'
import { useProjectRole } from '@/hooks/use-projects'
import {
  useDeleteProtocol,
  useProtocols,
  useSetProtocolArchived,
} from '@/hooks/use-protocols'
import { useToastError } from '@/hooks/use-toast-error'
import { roleAtLeast } from '@/lib/roles'
import type { Protocol } from '@/api/protocols'
import { ProtocolDialog } from './ProtocolDialog'

export function ProtocolsPanel({ projectId }: { projectId: string }) {
  const { t } = useTranslation('protocols')
  const role = useProjectRole(projectId)
  const canManage = roleAtLeast(role, 'manager')
  const toastError = useToastError()

  const [includeArchived, setIncludeArchived] = useState(false)
  const [page, setPage] = useState({ limit: 20, offset: 0 })
  const query = useProtocols(projectId, { include_archived: includeArchived, ...page })
  const setArchived = useSetProtocolArchived(projectId)
  const del = useDeleteProtocol(projectId)

  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Protocol | null>(null)
  const [delTarget, setDelTarget] = useState<Protocol | null>(null)

  const onArchive = async (p: Protocol) => {
    try {
      await setArchived.mutateAsync({ id: p.id, archived: !p.archived })
      toast.success(p.archived ? t('protocol.unarchived') : t('protocol.archived'))
    } catch (e) {
      toastError(e)
    }
  }
  const onDelete = async () => {
    if (!delTarget) return
    try {
      await del.mutateAsync({ id: delTarget.id, version: delTarget.version })
      toast.success(t('protocol.deleted'))
      setDelTarget(null)
    } catch (e) {
      toastError(e)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Switch
            id="proto-archived"
            checked={includeArchived}
            onCheckedChange={(v) => {
              setIncludeArchived(v)
              setPage((p) => ({ ...p, offset: 0 }))
            }}
          />
          <Label htmlFor="proto-archived" className="text-muted-foreground text-sm">
            {t('protocol.filterArchived')}
          </Label>
        </div>
        {canManage && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            {t('protocol.create')}
          </Button>
        )}
      </div>

      {query.isLoading ? (
        <TableSkeleton rows={3} cols={2} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.data && query.data.items.length > 0 ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {query.data.items.map((p) => (
              <Card key={p.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{p.name}</div>
                      <div className="text-muted-foreground flex items-center gap-1 font-mono text-xs">
                        <KeyRound className="size-3" />
                        {p.key}
                      </div>
                    </div>
                    {p.archived && (
                      <Badge variant="neutral" className="shrink-0">
                        {t('status.archived', { ns: 'projects' })}
                      </Badge>
                    )}
                    {canManage && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8 shrink-0">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditTarget(p)}>
                            <Pencil className="size-4" />
                            {t('protocol.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onArchive(p)}>
                            {p.archived ? (
                              <ArchiveRestore className="size-4" />
                            ) : (
                              <Archive className="size-4" />
                            )}
                            {p.archived
                              ? t('protocol.unarchived')
                              : t('protocol.archived')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDelTarget(p)}
                          >
                            <Trash2 className="size-4" />
                            {t('actions.delete', { ns: 'common' })}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="text-muted-foreground flex items-center gap-1.5 text-sm">
                  <ListChecks className="size-4" />
                  {t('protocol.stepCount', { count: p.steps.length })}
                </CardContent>
              </Card>
            ))}
          </div>
          <Pagination
            limit={page.limit}
            offset={page.offset}
            total={query.data.total}
            onChange={setPage}
          />
        </>
      ) : (
        <EmptyState
          title={t('protocol.empty')}
          description={t('protocol.emptyDesc')}
          action={
            canManage ? (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" />
                {t('protocol.create')}
              </Button>
            ) : undefined
          }
        />
      )}

      <ProtocolDialog
        projectId={projectId}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
      <ProtocolDialog
        projectId={projectId}
        open={!!editTarget}
        onOpenChange={(o) => !o && setEditTarget(null)}
        protocol={editTarget}
      />
      <ConfirmDialog
        open={!!delTarget}
        onOpenChange={(o) => !o && setDelTarget(null)}
        title={t('protocol.deleteTitle')}
        description={t('protocol.deleteDesc', { name: delTarget?.name })}
        destructive
        loading={del.isPending}
        onConfirm={onDelete}
      />
    </div>
  )
}
