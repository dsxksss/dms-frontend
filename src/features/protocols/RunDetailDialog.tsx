import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AlertTriangle, CheckCircle2, Loader2, Plus, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { statusTone } from '@/components/tone'
import {
  useAddRunLink,
  useDeleteRunLink,
  useRunLinks,
  useSetRunStatus,
  useUpdateResults,
} from '@/hooks/use-protocols'
import { useSignatures } from '@/hooks/use-signatures'
import { useToastError } from '@/hooks/use-toast-error'
import { formatDateTime, shortId } from '@/lib/format'
import type { LinkTarget, Run, RunResults } from '@/api/protocols'
import { SignDialog } from '@/features/signatures/SignDialog'

const LINK_KINDS: LinkTarget[] = ['entity', 'dataset', 'file']

/** Run 详情：步骤结果录入 + 关联 Links + 完成前合规（approved 电子签名）。 */
export function RunDetailDialog({
  projectId,
  run,
  open,
  onOpenChange,
}: {
  projectId: string
  run: Run
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation('protocols')
  const toastError = useToastError()
  const updateResults = useUpdateResults(projectId, run.id)
  const setStatus = useSetRunStatus(projectId, run.id)
  const [results, setResults] = useState<RunResults>({})
  const [signOpen, setSignOpen] = useState(false)

  // 本对象签名：判定是否已具 approved 签名（完成门禁）。
  const sigs = useSignatures(
    projectId,
    { target_kind: 'run', target_id: run.id, limit: 50 },
    open,
  )
  const hasApproved = (sigs.data?.items ?? []).some(
    (s) => s.meaning === 'approved',
  )
  const inProgress = run.status === 'in_progress'

  useEffect(() => {
    if (open) setResults(run.results ?? {})
  }, [open, run])

  const setField = (step: string, field: string, value: string) =>
    setResults((r) => ({ ...r, [step]: { ...(r[step] ?? {}), [field]: value } }))

  const saveResults = async () => {
    try {
      await updateResults.mutateAsync({ results, version: run.version })
      toast.success(t('run.resultsSaved'))
    } catch (e) {
      toastError(e)
    }
  }

  const complete = async () => {
    try {
      await setStatus.mutateAsync({ status: 'completed', version: run.version })
      toast.success(t('status.changed'))
      onOpenChange(false)
    } catch (e) {
      toastError(e)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] gap-0 overflow-y-auto sm:max-w-[820px]">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2.5">
            <span className="mono text-brand">{shortId(run.id)}</span>
            <span className="text-muted-foreground">·</span>
            <span>{run.name}</span>
            <Badge variant={statusTone(run.status)}>
              {t(`status.${run.status}`)}
            </Badge>
          </DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-3">
            <span>
              {t('run.protocolVersion')} v{run.protocol_version}
            </span>
            {run.started_at && (
              <span>
                {t('run.startedAt')}: {formatDateTime(run.started_at)}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[1.6fr_1fr]">
          {/* 左：步骤 + 结果录入 */}
          <Card className="gap-0 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[13px] font-bold">{t('steps.title')}</span>
              {inProgress && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={saveResults}
                  disabled={updateResults.isPending}
                >
                  {updateResults.isPending && (
                    <Loader2 className="size-4 animate-spin" />
                  )}
                  {t('run.saveResults')}
                </Button>
              )}
            </div>
            <div className="space-y-4">
              {run.steps.map((step, si) => (
                <div key={si}>
                  <div className="flex items-center gap-2">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-[12px] font-bold text-brand">
                      {si + 1}
                    </span>
                    <span className="text-[13px] font-semibold">
                      {step.name}
                    </span>
                  </div>
                  {step.fields.length > 0 && (
                    <div className="mt-2 space-y-2 pl-8">
                      {step.fields.map((f) => (
                        <div key={f.name} className="space-y-1">
                          <label className="text-[11.5px] font-medium text-muted-foreground">
                            {f.name}
                          </label>
                          <Input
                            className="h-8"
                            disabled={!inProgress}
                            value={String(results[step.name]?.[f.name] ?? '')}
                            onChange={(e) =>
                              setField(step.name, f.name, e.target.value)
                            }
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* 右：Links + 合规 */}
          <div className="space-y-4">
            <LinksCard projectId={projectId} runId={run.id} />

            {inProgress && !hasApproved && (
              <div className="rounded-[12px] border border-[#F5E6C8] bg-[#FFFCF5] p-3.5">
                <div className="flex items-center gap-2 text-[#C77B16]">
                  <AlertTriangle className="size-4" />
                  <span className="text-[12.5px] font-bold">
                    {t('compliance', { ns: 'signatures' })}
                  </span>
                </div>
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-[#8a6d2f]">
                  {t('complianceDesc', { ns: 'signatures' })}
                </p>
                <Button
                  size="sm"
                  className="mt-3"
                  onClick={() => setSignOpen(true)}
                >
                  {t('status.toCompleted')}
                </Button>
              </div>
            )}

            {inProgress && hasApproved && (
              <div className="rounded-[12px] border border-[#CDEBD6] bg-[#F4FBF6] p-3.5">
                <div className="flex items-center gap-2 text-[#15803D]">
                  <CheckCircle2 className="size-4" />
                  <span className="text-[12.5px] font-bold">
                    {t('run.signed', { defaultValue: '已签' })}
                  </span>
                </div>
                <Button
                  size="sm"
                  className="mt-3"
                  onClick={complete}
                  disabled={setStatus.isPending}
                >
                  {setStatus.isPending && (
                    <Loader2 className="size-4 animate-spin" />
                  )}
                  {t('status.toCompleted')}
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>

      <SignDialog
        projectId={projectId}
        open={signOpen}
        onOpenChange={setSignOpen}
        target={{ kind: 'run', id: run.id, name: run.name }}
      />
    </Dialog>
  )
}

function LinksCard({ projectId, runId }: { projectId: string; runId: string }) {
  const { t } = useTranslation('protocols')
  const toastError = useToastError()
  const query = useRunLinks(projectId, runId)
  const add = useAddRunLink(projectId, runId)
  const del = useDeleteRunLink(projectId, runId)
  const [kind, setKind] = useState<LinkTarget>('dataset')
  const [targetId, setTargetId] = useState('')
  const links = query.data ?? []

  const onAdd = async () => {
    if (!targetId.trim()) return
    try {
      await add.mutateAsync({ target_kind: kind, target_id: targetId.trim() })
      toast.success(t('links.added'))
      setTargetId('')
    } catch (e) {
      toastError(e)
    }
  }

  const onRemove = (id: string) =>
    del
      .mutateAsync(id)
      .then(() => toast.success(t('links.removed')))
      .catch(toastError)

  const targetLabel = useMemo(
    () => ({
      entity: t('links.entity'),
      dataset: t('links.dataset'),
      file: t('links.file'),
    }),
    [t],
  )

  return (
    <Card className="gap-0 p-4">
      <div className="mb-3 text-[13px] font-bold">{t('links.title')}</div>
      {links.length === 0 ? (
        <p className="text-[12px] text-muted-foreground">{t('links.empty')}</p>
      ) : (
        <div className="space-y-2">
          {links.map((l) => (
            <div key={l.id} className="flex items-center gap-2">
              <Badge variant="info">{targetLabel[l.target_kind]}</Badge>
              <span className="mono flex-1 truncate text-[11.5px] text-muted-foreground">
                {shortId(l.target_id)}
              </span>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => onRemove(l.id)}
              >
                <X className="size-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 border-t border-divider pt-3">
        <Select value={kind} onValueChange={(v) => setKind(v as LinkTarget)}>
          <SelectTrigger size="sm" className="h-8 w-[108px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LINK_KINDS.map((k) => (
              <SelectItem key={k} value={k}>
                {targetLabel[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          className="h-8"
          placeholder={t('links.add')}
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
        />
        <Button
          size="icon-sm"
          onClick={onAdd}
          disabled={!targetId.trim() || add.isPending}
        >
          <Plus className="size-4" />
        </Button>
      </div>
    </Card>
  )
}
