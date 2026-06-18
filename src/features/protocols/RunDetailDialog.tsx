import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, PenLine, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState, ErrorState } from '@/components/states'
import { UserName } from '@/components/user-name'
import { SchemaForm } from '@/features/registry/SchemaForm'
import { EntityPicker } from '@/features/registry/EntityPicker'
import { SignDialog } from '@/features/signatures/SignDialog'
import { SignaturesList } from '@/features/signatures/SignaturesList'
import { useSignatures } from '@/hooks/use-signatures'
import { useProjectRole } from '@/hooks/use-projects'
import { useDatasets } from '@/hooks/use-datasets'
import {
  useAddRunLink,
  useDeleteRunLink,
  useRun,
  useRunLinks,
  useSetRunStatus,
  useUpdateResults,
} from '@/hooks/use-protocols'
import { useToastError } from '@/hooks/use-toast-error'
import { roleAtLeast } from '@/lib/roles'
import { statusTone } from '@/lib/tone'
import { shortId, formatDateTime } from '@/lib/format'
import { buildData, initialValues, type FormValues } from '@/lib/field-types'
import type { LinkTarget, RunResults, RunStatus } from '@/api/protocols'

function RunLinksSection({
  projectId,
  runId,
  canEdit,
}: {
  projectId: string
  runId: string
  canEdit: boolean
}) {
  const { t } = useTranslation('protocols')
  const links = useRunLinks(projectId, runId)
  const datasets = useDatasets(projectId)
  const add = useAddRunLink(projectId, runId)
  const del = useDeleteRunLink(projectId, runId)
  const toastError = useToastError()
  const [target, setTarget] = useState<LinkTarget>('entity')
  const [entityId, setEntityId] = useState<string | undefined>()
  const [datasetId, setDatasetId] = useState('')

  const onAdd = async () => {
    const targetId = target === 'entity' ? entityId : datasetId
    if (!targetId) return
    try {
      await add.mutateAsync({ target_kind: target, target_id: targetId })
      toast.success(t('links.added'))
      setEntityId(undefined)
      setDatasetId('')
    } catch (e) {
      toastError(e)
    }
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">{t('links.title')}</h3>
      {canEdit && (
        <div className="space-y-2 rounded-md border p-3">
          <div className="flex gap-2">
            <Select value={target} onValueChange={(v) => setTarget(v as LinkTarget)}>
              <SelectTrigger size="sm" className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entity">{t('links.entity')}</SelectItem>
                <SelectItem value="dataset">{t('links.dataset')}</SelectItem>
              </SelectContent>
            </Select>
            {target === 'dataset' && (
              <Select value={datasetId} onValueChange={setDatasetId}>
                <SelectTrigger size="sm" className="flex-1">
                  <SelectValue placeholder={t('links.dataset')} />
                </SelectTrigger>
                <SelectContent>
                  {(datasets.data ?? []).map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          {target === 'entity' && (
            <EntityPicker projectId={projectId} value={entityId} onChange={setEntityId} />
          )}
          <Button size="sm" onClick={onAdd} disabled={add.isPending}>
            {add.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            {t('links.add')}
          </Button>
        </div>
      )}
      {links.data && links.data.length > 0 ? (
        <ul className="divide-y rounded-md border">
          {links.data.map((l) => (
            <li
              key={l.id}
              className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
            >
              <span className="flex items-center gap-2">
                <Badge variant="secondary">{t(`links.${l.target_kind}`)}</Badge>
                <span className="font-mono text-xs">{shortId(l.target_id)}</span>
              </span>
              {canEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() =>
                    del.mutateAsync(l.id).then(() => toast.success(t('links.removed'))).catch(toastError)
                  }
                >
                  <Trash2 className="text-destructive size-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">{t('links.empty')}</p>
      )}
    </div>
  )
}

export function RunDetailDialog({
  projectId,
  runId,
  open,
  onOpenChange,
}: {
  projectId: string
  runId: string
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const { t } = useTranslation('protocols')
  const role = useProjectRole(projectId)
  const canContribute = roleAtLeast(role, 'contributor')
  const query = useRun(projectId, runId, open)
  const run = query.data
  const updateResults = useUpdateResults(projectId, runId)
  const setStatus = useSetRunStatus(projectId, runId)
  const toastError = useToastError()

  const [forms, setForms] = useState<Record<string, FormValues>>({})
  const [signOpen, setSignOpen] = useState(false)

  // 强制签名：Run 须有 approved 签名才能标记完成（与后端校验一致，避免 422）。
  const runSigs = useSignatures(
    projectId,
    { target_kind: 'run', target_id: runId },
    open,
  )
  const hasApproved =
    runSigs.data?.items.some((s) => s.meaning === 'approved') ?? false
  useEffect(() => {
    if (run) {
      const next: Record<string, FormValues> = {}
      for (const s of run.steps) next[s.name] = initialValues(s.fields, run.results?.[s.name])
      setForms(next)
    }
  }, [run])

  const editable =
    canContribute && (run?.status === 'draft' || run?.status === 'in_progress')

  const saveResults = async () => {
    if (!run) return
    const results: RunResults = {}
    for (const s of run.steps) results[s.name] = buildData(s.fields, forms[s.name] ?? {})
    try {
      await updateResults.mutateAsync({ results, version: run.version })
      toast.success(t('run.resultsSaved'))
    } catch (e) {
      toastError(e)
    }
  }

  const changeStatus = async (status: RunStatus) => {
    if (!run) return
    try {
      await setStatus.mutateAsync({ status, version: run.version })
      toast.success(t('status.changed'))
    } catch (e) {
      toastError(e)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        {query.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : !run ? (
          <EmptyState title={t('run.empty')} />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {run.name}
                <Badge variant={statusTone(run.status)}>
                  {t(`status.${run.status}`)}
                </Badge>
              </DialogTitle>
            </DialogHeader>

            <div className="text-muted-foreground grid grid-cols-2 gap-y-1 text-sm">
              <span>{t('run.performedBy')}</span>
              <span className="text-foreground">
                <UserName id={run.performed_by} />
              </span>
              <span>{t('run.startedAt')}</span>
              <span className="text-foreground tabular-nums">
                {formatDateTime(run.started_at)}
              </span>
              {run.completed_at && (
                <>
                  <span>{t('run.completedAt')}</span>
                  <span className="text-foreground tabular-nums">
                    {formatDateTime(run.completed_at)}
                  </span>
                </>
              )}
              <span>{t('run.protocolVersion')}</span>
              <span className="text-foreground tabular-nums">
                v{run.protocol_version}
              </span>
            </div>

            {/* status transitions */}
            {canContribute && run.status !== 'completed' && run.status !== 'aborted' && (
              <div className="space-y-1.5">
                <div className="flex flex-wrap gap-2">
                  {run.status === 'draft' && (
                    <Button size="sm" onClick={() => changeStatus('in_progress')}>
                      {t('status.toInProgress')}
                    </Button>
                  )}
                  {run.status === 'in_progress' && (
                    <Button
                      size="sm"
                      onClick={() => changeStatus('completed')}
                      disabled={!hasApproved}
                    >
                      {t('status.toCompleted')}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => changeStatus('aborted')}
                  >
                    {t('status.toAborted')}
                  </Button>
                </div>
                {run.status === 'in_progress' && !hasApproved && (
                  <p className="text-muted-foreground text-xs">
                    {t('needApprovedToComplete', { ns: 'signatures' })}
                  </p>
                )}
              </div>
            )}

            {/* results per step */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">{t('run.results')}</Label>
              {run.steps.map((s) => (
                <div key={s.name} className="rounded-md border p-3">
                  <div className="mb-2">
                    <div className="font-medium">{s.name}</div>
                    {s.description && (
                      <div className="text-muted-foreground text-xs">
                        {s.description}
                      </div>
                    )}
                  </div>
                  {s.fields.length === 0 ? (
                    <p className="text-muted-foreground text-xs">—</p>
                  ) : (
                    <fieldset disabled={!editable} className="disabled:opacity-70">
                      <SchemaForm
                        projectId={projectId}
                        fields={s.fields}
                        values={forms[s.name] ?? {}}
                        errors={{}}
                        onChange={(name, value) =>
                          setForms((prev) => ({
                            ...prev,
                            [s.name]: { ...prev[s.name], [name]: value },
                          }))
                        }
                      />
                    </fieldset>
                  )}
                </div>
              ))}
              {editable && (
                <Button onClick={saveResults} disabled={updateResults.isPending}>
                  {updateResults.isPending && (
                    <Loader2 className="size-4 animate-spin" />
                  )}
                  {t('run.saveResults')}
                </Button>
              )}
            </div>

            <RunLinksSection projectId={projectId} runId={runId} canEdit={editable} />

            {/* e-signatures (21 CFR Part 11) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">
                  {t('onTarget', { ns: 'signatures' })}
                </h3>
                {canContribute && (
                  <Button size="sm" variant="outline" onClick={() => setSignOpen(true)}>
                    <PenLine className="size-4" />
                    {t('sign.button', { ns: 'signatures' })}
                  </Button>
                )}
              </div>
              <SignaturesList projectId={projectId} targetKind="run" targetId={runId} />
            </div>

            <SignDialog
              projectId={projectId}
              targetKind="run"
              targetId={run.id}
              content={JSON.stringify({
                id: run.id,
                protocol_version: run.protocol_version,
                status: run.status,
                results: run.results,
              })}
              open={signOpen}
              onOpenChange={setSignOpen}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
