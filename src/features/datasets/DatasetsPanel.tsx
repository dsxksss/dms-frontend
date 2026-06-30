import { useRef, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  Download,
  Grid3x3,
  MoreHorizontal,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PageHeader } from '@/components/page-header'
import { GridHeader, GridRow, TableCard, Th } from '@/components/data-grid'
import { EmptyState, ErrorState, TableSkeleton } from '@/components/states'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { cn } from '@/lib/utils'
import { roleAtLeast } from '@/lib/roles'
import { useProjectRole } from '@/hooks/use-projects'
import { useToastError } from '@/hooks/use-toast-error'
import {
  datasetKeys,
  useDatasets,
  useDatasetTags,
  useDeleteDataset,
} from '@/hooks/use-datasets'
import { datasetsApi, type Dataset, type DatasetScope } from '@/api/datasets'
import { CreateDatasetDialog } from './CreateDatasetDialog'

const COLS = '1.6fr 1fr 130px 110px'

/** 项目数据集列表（成员可见，Contributor+ 可写）。 */
export function DatasetsPanel({
  projectId,
  scope,
  detailBasePath,
  canWrite: canWriteOverride,
  title,
  titleEn,
  description,
  embedded = false,
}: {
  projectId?: string
  scope?: DatasetScope
  detailBasePath?: string
  canWrite?: boolean
  title?: string
  titleEn?: string
  description?: string
  embedded?: boolean
}) {
  const { t } = useTranslation(['datasets', 'common'])
  const navigate = useNavigate()
  const qc = useQueryClient()
  const role = useProjectRole(projectId)
  const datasetScope = scope ?? projectId ?? ''
  const basePath = detailBasePath ?? `/projects/${projectId}/datasets`
  const canWrite = canWriteOverride ?? roleAtLeast(role, 'contributor')
  const del = useDeleteDataset(datasetScope)
  const toastError = useToastError()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)
  const [tag, setTag] = useState<string | undefined>(undefined)
  const query = useDatasets(datasetScope, tag)
  const tags = useDatasetTags(datasetScope)
  const [createOpen, setCreateOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [delTarget, setDelTarget] = useState<Dataset | null>(null)
  const [uploadingCsv, setUploadingCsv] = useState(false)
  const data = query.data ?? []
  const hasData = data.length > 0
  const csvUploading = uploadingCsv

  const onDelete = () => {
    if (!delTarget) return
    del
      .mutateAsync({ id: delTarget.id, version: delTarget.version })
      .then(() => {
        toast.success(t('toast.deleted'))
        setDelTarget(null)
      })
      .catch(toastError)
  }

  const createBtn = (
    <Button onClick={() => setCreateOpen(true)}>
      <Plus className="size-4" />
      {t('create.title')}
    </Button>
  )

  const uploadFiles = async (files: FileList | null) => {
    const csvFiles = Array.from(files ?? []).filter((file) =>
      file.name.toLowerCase().endsWith('.csv'),
    )
    if (csvFiles.length === 0) {
      toast.error(t('create.noCsvFiles'))
      return
    }
    setUploadingCsv(true)
    try {
      for (const file of csvFiles) {
        const dataset = await datasetsApi.create(datasetScope, {
          name: file.name.replace(/\.csv$/i, ''),
        })
        await datasetsApi.uploadVersion(datasetScope, dataset.id, file, 'csv')
      }
      await qc.invalidateQueries({ queryKey: datasetKeys.scope(datasetScope) })
      toast.success(
        t('toast.createdFromCsv', { count: csvFiles.length }),
      )
      setUploadOpen(false)
    } catch (err) {
      toastError(err)
    } finally {
      setUploadingCsv(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const uploadFolder = async (files: FileList | null) => {
    const csvFiles = Array.from(files ?? [])
      .filter((file) => file.name.toLowerCase().endsWith('.csv'))
      .sort((a, b) =>
        (a.webkitRelativePath || a.name).localeCompare(
          b.webkitRelativePath || b.name,
        ),
      )
    if (csvFiles.length === 0) {
      toast.error(t('create.noCsvFiles'))
      return
    }
    const firstPath = csvFiles[0]?.webkitRelativePath
    const folderName = firstPath?.split('/').filter(Boolean)[0]
    const datasetName =
      folderName || csvFiles[0].name.replace(/\.csv$/i, '')
    setUploadingCsv(true)
    try {
      const dataset = await datasetsApi.create(datasetScope, {
        name: datasetName,
      })
      for (const file of csvFiles) {
        await datasetsApi.uploadVersion(datasetScope, dataset.id, file, 'csv')
      }
      await qc.invalidateQueries({ queryKey: datasetKeys.scope(datasetScope) })
      toast.success(
        t('toast.createdFolderFromCsv', {
          name: datasetName,
          count: csvFiles.length,
        }),
      )
      setUploadOpen(false)
    } catch (err) {
      toastError(err)
    } finally {
      setUploadingCsv(false)
      if (folderInputRef.current) folderInputRef.current.value = ''
    }
  }

  const uploadControls = canWrite ? (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        multiple
        className="hidden"
        onChange={(e) => uploadFiles(e.target.files)}
      />
      <input
        ref={folderInputRef}
        type="file"
        accept=".csv,text/csv"
        multiple
        className="hidden"
        onChange={(e) => uploadFolder(e.target.files)}
      />
    </>
  ) : null

  const uploadBtn = canWrite ? (
    <Button
      variant="outline"
      onClick={() => setUploadOpen(true)}
      disabled={csvUploading}
    >
      <Upload className="size-4" />
      {csvUploading ? t('create.uploadingCsv') : t('create.uploadCsv')}
    </Button>
  ) : null

  const uploadDialog = canWrite ? (
    <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{t('create.uploadCsv')}</DialogTitle>
          <DialogDescription>
            {t('create.uploadCsvDescription')}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Button
            type="button"
            variant="outline"
            className="h-auto items-start justify-start gap-3 whitespace-normal p-4 text-left"
            onClick={() => fileInputRef.current?.click()}
            disabled={csvUploading}
          >
            <Upload className="mt-0.5 size-4 shrink-0" />
            <span className="space-y-1">
              <span className="block font-bold">{t('create.uploadCsvFile')}</span>
              <span className="block text-[12px] font-normal text-muted-foreground">
                {t('create.uploadCsvFileHint')}
              </span>
            </span>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-auto items-start justify-start gap-3 whitespace-normal p-4 text-left"
            onClick={() => {
              folderInputRef.current?.setAttribute('webkitdirectory', '')
              folderInputRef.current?.click()
            }}
            disabled={csvUploading}
          >
            <Upload className="mt-0.5 size-4 shrink-0" />
            <span className="space-y-1">
              <span className="block font-bold">{t('create.uploadCsvFolder')}</span>
              <span className="block text-[12px] font-normal text-muted-foreground">
                {t('create.uploadCsvFolderHint')}
              </span>
            </span>
          </Button>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setUploadOpen(false)}
            disabled={csvUploading}
          >
            {t('actions.cancel', { ns: 'common', defaultValue: '取消' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ) : null

  const actions = canWrite ? (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {uploadBtn}
      {createBtn}
    </div>
  ) : undefined

  return (
    <div className={embedded ? 'space-y-4' : 'px-[26px] py-[22px] max-w-[1200px]'}>
      <PageHeader
        title={title ?? t('title')}
        titleEn={titleEn ?? 'Datasets'}
        description={description ?? t('subtitle')}
        actions={hasData ? actions : undefined}
      />

      {(tags.data?.length ?? 0) > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          <FilterChip active={!tag} onClick={() => setTag(undefined)}>
            {t('filter.allTags')}
          </FilterChip>
          {tags.data!.map((tg) => (
            <FilterChip key={tg} active={tag === tg} onClick={() => setTag(tg)}>
              {tg}
            </FilterChip>
          ))}
        </div>
      )}

      {query.isLoading ? (
        <TableSkeleton rows={5} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : data.length === 0 ? (
        <EmptyState
          title={t('empty.title')}
          hint={t('empty.description')}
          action={actions}
        />
      ) : (
        <TableCard>
          <GridHeader cols={COLS}>
            <Th>{t('columns.name')}</Th>
            <Th>{t('meta.tags')}</Th>
            <Th>{t('versions.versionNo')}</Th>
            <Th />
          </GridHeader>
          {data.map((ds) => (
            <GridRow
              key={ds.id}
              cols={COLS}
              onClick={() =>
                navigate(`${basePath}/${ds.id}`)
              }
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-accent text-brand">
                  <Grid3x3 className="size-4" />
                </div>
                <div className="min-w-0">
                  <div className="truncate font-bold">{ds.name}</div>
                  {ds.description && (
                    <div className="truncate text-[11.5px] text-muted-foreground">
                      {ds.description}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                {ds.tags.slice(0, 3).map((tg) => (
                  <Badge key={tg} variant="info">
                    {tg}
                  </Badge>
                ))}
              </div>
              {/* 列表项不含行数/时间戳；此处用版本号占位，避免 N+1 拉版本。 */}
              <div className="mono text-[12px] text-muted-foreground">
                v{ds.version}
              </div>
              <div
                className="flex items-center justify-end gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="text-[12px] font-semibold text-brand">
                  {t('row.open')} →
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" title={t('actions.more', { ns: 'common' })}>
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() =>
                        navigate(`${basePath}/${ds.id}`)
                      }
                    >
                      {t('row.open')}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        datasetsApi.exportDownload(datasetScope, ds.id, 'csv')
                      }
                    >
                      <Download className="size-4" />
                      {t('preview.exportCsv')}
                    </DropdownMenuItem>
                    {canWrite && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDelTarget(ds)}
                        >
                          <Trash2 className="size-4" />
                          {t('row.delete')}
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </GridRow>
          ))}
        </TableCard>
      )}

      <ConfirmDialog
        open={!!delTarget}
        onOpenChange={(o) => !o && setDelTarget(null)}
        title={t('delete.title')}
        description={t('delete.description', { name: delTarget?.name })}
        destructive
        confirmText={t('delete.confirm')}
        loading={del.isPending}
        onConfirm={onDelete}
      />
      {uploadControls}
      {uploadDialog}

      <CreateDatasetDialog
        scope={datasetScope}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </div>
  )
}

/** 标签过滤胶囊。 */
function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-2.5 py-1 text-[12px] font-semibold transition',
        active
          ? 'border-brand bg-accent text-brand'
          : 'border-transparent bg-[#F0F2F6] text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}
