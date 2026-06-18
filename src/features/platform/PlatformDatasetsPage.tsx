import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Plus, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { EmptyState, ErrorState, TableSkeleton } from '@/components/states'
import {
  usePlatformDatasets,
  useCreatePlatformDataset,
  useUploadPlatformDatasetVersion,
  useDeletePlatformDataset,
} from '@/hooks/use-platform'
import { useToastError } from '@/hooks/use-toast-error'
import type { SystemDataset } from '@/api/datasets'

function UploadButton({ datasetId }: { datasetId: string }) {
  const { t } = useTranslation('platform')
  const upload = useUploadPlatformDatasetVersion(datasetId)
  const toastError = useToastError()
  const fileRef = useRef<HTMLInputElement>(null)
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      await upload.mutateAsync({ file, format: 'csv' })
      toast.success(t('datasets.uploaded'))
    } catch (err) {
      toastError(err)
    }
  }
  return (
    <>
      <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={onFile} />
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        title={t('datasets.upload')}
        onClick={() => fileRef.current?.click()}
        disabled={upload.isPending}
      >
        {upload.isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Upload className="size-4" />
        )}
      </Button>
    </>
  )
}

export function PlatformDatasetsPage() {
  const { t } = useTranslation('platform')
  const query = usePlatformDatasets()
  const create = useCreatePlatformDataset()
  const del = useDeletePlatformDataset()
  const toastError = useToastError()

  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [delTarget, setDelTarget] = useState<SystemDataset | null>(null)

  const submitCreate = async () => {
    if (!name.trim()) return
    try {
      await create.mutateAsync({ name: name.trim(), description })
      toast.success(t('datasets.created'))
      setCreateOpen(false)
      setName('')
      setDescription('')
    } catch (e) {
      toastError(e)
    }
  }

  const onDelete = async () => {
    if (!delTarget) return
    try {
      await del.mutateAsync(delTarget.id)
      toast.success(t('datasets.deleted'))
      setDelTarget(null)
    } catch (e) {
      toastError(e)
    }
  }

  const items = query.data ?? []

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('datasets.title')}
        titleI18n={{ key: 'datasets.title', ns: 'platform' }}
        description={t('datasets.desc')}
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            {t('datasets.create')}
          </Button>
        }
      />

      {query.isLoading ? (
        <TableSkeleton rows={3} cols={2} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState title={t('datasets.empty')} description={t('datasets.emptyDesc')} />
      ) : (
        <ul className="divide-y rounded-lg border">
          {items.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="font-medium">{d.name}</div>
                <div className="text-muted-foreground truncate text-xs">
                  {d.description || '—'} · v{d.version}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <UploadButton datasetId={d.id} />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => setDelTarget(d)}
                >
                  <Trash2 className="text-destructive size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('datasets.create')}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              void submitCreate()
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="pdsname">{t('datasets.name')}</Label>
              <Input
                id="pdsname"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pdsdesc">{t('datasets.description')}</Label>
              <Textarea
                id="pdsdesc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending && <Loader2 className="size-4 animate-spin" />}
                {t('datasets.create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!delTarget}
        onOpenChange={(o) => !o && setDelTarget(null)}
        title={t('datasets.deleteTitle')}
        description={t('datasets.deleteConfirm', { name: delTarget?.name })}
        destructive
        loading={del.isPending}
        onConfirm={onDelete}
      />
    </div>
  )
}
