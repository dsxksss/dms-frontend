import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2, Upload } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PageHeader } from '@/components/page-header'
import { GridHeader, GridRow, TableCard, Th } from '@/components/data-grid'
import { EmptyState, ErrorState, TableSkeleton } from '@/components/states'
import { ConfirmDialog } from '@/components/confirm-dialog'
import {
  useCreatePlatformDataset,
  useDeletePlatformDataset,
  usePlatformDatasets,
} from '@/hooks/use-platform'
import { platformApi } from '@/platform/api'
import { useToastError } from '@/hooks/use-toast-error'
import type { SystemDataset } from '@/api/datasets'
import {
  DatasetMetaFields,
  emptyMeta,
  normalizeMeta,
  type DatasetMetaValue,
} from '@/features/datasets/DatasetMetaFields'

const COLS = '1.8fr 90px 120px 110px'

export function PlatformDatasetsPage() {
  const { t } = useTranslation('platform')
  const query = usePlatformDatasets()
  const del = useDeletePlatformDataset()
  const toastError = useToastError()
  const [uploadOpen, setUploadOpen] = useState(false)
  const [toDelete, setToDelete] = useState<SystemDataset | null>(null)
  const rows = query.data ?? []

  const confirmDelete = () => {
    if (!toDelete) return
    del
      .mutateAsync(toDelete.id)
      .then(() => {
        toast.success(t('datasets.deleted'))
        setToDelete(null)
      })
      .catch((e) => {
        setToDelete(null)
        toastError(e)
      })
  }

  return (
    <div className="mx-auto max-w-[1180px] px-8 py-7">
      <PageHeader
        title={t('datasets.title')}
        titleEn="System Datasets"
        description={t('datasets.desc')}
        actions={
          <Button onClick={() => setUploadOpen(true)}>
            <Plus className="size-4" />
            {t('datasets.create')}
          </Button>
        }
      />

      {query.isLoading ? (
        <TableSkeleton rows={5} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          title={t('datasets.empty')}
          hint={t('datasets.emptyDesc')}
          action={
            <Button onClick={() => setUploadOpen(true)}>
              <Plus className="size-4" />
              {t('datasets.create')}
            </Button>
          }
        />
      ) : (
        <TableCard>
          <GridHeader cols={COLS}>
            <Th>{t('datasets.name')}</Th>
            <Th>{t('datasets.version')}</Th>
            <Th>{t('datasets.rows')}</Th>
            <Th>{t('datasets.visibility')}</Th>
          </GridHeader>
          {rows.map((d) => (
            <GridRow key={d.id} cols={COLS}>
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className="flex size-[34px] shrink-0 items-center justify-center rounded-[9px] text-[13px] font-extrabold"
                  style={{ background: '#EFE9FB', color: '#6D5BD0' }}
                >
                  {(d.name[0] ?? '·').toUpperCase()}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-bold">{d.name}</div>
                  {d.description && (
                    <div className="truncate text-[11px] text-muted-foreground">
                      {d.description}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <Badge variant="neutral">v{d.version}</Badge>
              </div>
              <div className="mono text-[12.5px] text-muted-foreground">—</div>
              <div className="flex items-center justify-between gap-2">
                <Badge variant="success">{t('datasets.readonlyAll')}</Badge>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => setToDelete(d)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </GridRow>
          ))}
        </TableCard>
      )}

      <UploadDatasetDialog open={uploadOpen} onOpenChange={setUploadOpen} />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={t('datasets.deleteTitle')}
        description={t('datasets.deleteConfirm', { name: toDelete?.name ?? '' })}
        confirmText={t('actions.delete', { ns: 'common', defaultValue: '删除' })}
        destructive
        loading={del.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  )
}

/** 新建系统数据集（名称 + 描述）+ 可选首版 CSV 上传。 */
function UploadDatasetDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation('platform')
  const qc = useQueryClient()
  const create = useCreatePlatformDataset()
  const toastError = useToastError()
  const fileRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [meta, setMeta] = useState<DatasetMetaValue>(emptyMeta())
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const busy = create.isPending || uploading
  const reset = () => {
    setName('')
    setDescription('')
    setMeta(emptyMeta())
    setFile(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const submit = async () => {
    if (!name.trim()) return
    try {
      const m = normalizeMeta(meta)
      const ds = await create.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        tags: m.tags,
        author: m.author || undefined,
        references: m.references,
      })
      // 选了文件就追加首个 CSV 版本：上传需新建数据集的 id，故直接调 api（hook 的 id 在调用期已绑定）。
      if (file) {
        setUploading(true)
        await platformApi.uploadDatasetVersion(ds.id, file, 'csv')
        qc.invalidateQueries({ queryKey: ['platform', 'datasets'] })
      }
      toast.success(file ? t('datasets.uploaded') : t('datasets.created'))
      onOpenChange(false)
      reset()
    } catch (e) {
      toastError(e)
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{t('datasets.create')}</DialogTitle>
          <DialogDescription>{t('datasets.desc')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ds-name">{t('datasets.name')}</Label>
            <Input
              id="ds-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ds-desc">{t('datasets.description')}</Label>
            <Textarea
              id="ds-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <DatasetMetaFields value={meta} onChange={setMeta} />
          <div className="space-y-1.5">
            <Label htmlFor="ds-file">{t('datasets.upload')}</Label>
            <Input
              id="ds-file"
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-[11px] text-muted-foreground">
              {t('datasets.uploadHint')}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('actions.cancel', { ns: 'common', defaultValue: '取消' })}
          </Button>
          <Button onClick={submit} disabled={!name.trim() || busy}>
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            {t('datasets.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
