import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ColumnDef } from '@tanstack/react-table'
import {
  Download,
  Lock,
  Loader2,
  MoreHorizontal,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/page-header'
import { DataTable } from '@/components/data-table'
import { EmptyState } from '@/components/states'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useProjectRole } from '@/hooks/use-projects'
import {
  useDeleteFile,
  useFiles,
  useFilesSummary,
  useSetFileConfidential,
  useUploadFile,
} from '@/hooks/use-files'
import { useToastError } from '@/hooks/use-toast-error'
import { FileGrantsDialog } from './FileGrantsDialog'
import { roleAtLeast } from '@/lib/roles'
import { formatBytes } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  ALLOWED_EXT,
  FILE_CATEGORIES,
  extOf,
  type FileCategory,
  type FileItem,
} from '@/api/files'
import { filesApi } from '@/api/files'

/** 分类图标块配色（对齐原型 fileCats tints）。 */
const CAT_TINT: Record<FileCategory, { bg: string; fg: string }> = {
  raw_data: { bg: '#EAF0FF', fg: '#2F6BFF' },
  structures: { bg: '#E7F6EC', fg: '#15803D' },
  sequences: { bg: '#FEF4E6', fg: '#B45309' },
  reports: { bg: '#F3EEFB', fg: '#7C3AED' },
  datasets: { bg: '#FBEAF2', fg: '#BE185D' },
  misc: { bg: '#EEF0F3', fg: '#64748B' },
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7l-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z" />
    </svg>
  )
}

export function FilesPanel({ projectId }: { projectId: string }) {
  const { t } = useTranslation('files')
  const role = useProjectRole(projectId)
  const canWrite = roleAtLeast(role, 'contributor')
  const canManage = roleAtLeast(role, 'manager')
  const toastError = useToastError()
  const fileRef = useRef<HTMLInputElement>(null)

  const [catFilter, setCatFilter] = useState<string>('')
  const [uploadCat, setUploadCat] = useState<FileCategory>('misc')
  const [uploadConfidential, setUploadConfidential] = useState(false)
  const [page, setPage] = useState({ limit: 20, offset: 0 })
  const query = useFiles(projectId, {
    category: catFilter || undefined,
    ...page,
  })
  const summary = useFilesSummary(projectId)
  const counts = new Map(
    summary.data?.by_category.map((c) => [c.category, c.count]) ?? [],
  )
  const upload = useUploadFile(projectId)
  const del = useDeleteFile(projectId)
  const setConf = useSetFileConfidential(projectId)
  const [delTarget, setDelTarget] = useState<FileItem | null>(null)
  const [grantsTarget, setGrantsTarget] = useState<FileItem | null>(null)

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const ext = extOf(file.name)
    if (!ALLOWED_EXT[uploadCat].includes(ext)) {
      toast.error(
        t('invalidExt', { ext, category: t(`category.${uploadCat}`) }),
      )
      return
    }
    try {
      await upload.mutateAsync({
        file,
        category: uploadCat,
        confidential: uploadConfidential,
      })
      toast.success(t('uploaded'))
    } catch (err) {
      toastError(err)
    }
  }

  const toggleConfidential = async (f: FileItem) => {
    try {
      await setConf.mutateAsync({ id: f.id, confidential: !f.confidential })
      toast.success(t('confidentialChanged'))
    } catch (e) {
      toastError(e)
    }
  }

  const columns: ColumnDef<FileItem, unknown>[] = [
    {
      accessorKey: 'name',
      header: t('columns.name'),
      cell: ({ row }) => (
        <span className="flex items-center gap-1.5">
          <span className="font-medium">{row.original.name}</span>
          {row.original.confidential && (
            <Badge
              variant="outline"
              className="text-warning border-warning/40 gap-1"
            >
              <Lock className="size-3" />
              {t('badge')}
            </Badge>
          )}
        </span>
      ),
    },
    {
      accessorKey: 'category',
      header: t('columns.category'),
      cell: ({ row }) => (
        <Badge variant="secondary">
          {t(`category.${row.original.category}`)}
        </Badge>
      ),
    },
    {
      accessorKey: 'size',
      header: t('columns.size'),
      cell: ({ row }) => (
        <span className="tabular-nums">{formatBytes(row.original.size)}</span>
      ),
    },
    {
      accessorKey: 'content_type',
      header: t('columns.type'),
      cell: ({ row }) => (
        <span className="text-muted-foreground font-mono text-xs">
          {row.original.content_type || '-'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const f = row.original
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() =>
                    filesApi.download(projectId, f.id, f.name).catch(toastError)
                  }
                >
                  <Download className="size-4" />
                  {t('actions.download', { ns: 'common' })}
                </DropdownMenuItem>
                {canManage && (
                  <DropdownMenuItem onClick={() => toggleConfidential(f)}>
                    <ShieldCheck className="size-4" />
                    {f.confidential
                      ? t('unsetConfidential')
                      : t('setConfidential')}
                  </DropdownMenuItem>
                )}
                {canManage && f.confidential && (
                  <DropdownMenuItem onClick={() => setGrantsTarget(f)}>
                    <Lock className="size-4" />
                    {t('grants.manage')}
                  </DropdownMenuItem>
                )}
                {canWrite && (
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => setDelTarget(f)}
                  >
                    <Trash2 className="size-4" />
                    {t('actions.delete', { ns: 'common' })}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
    },
  ]

  const onDelete = async () => {
    if (!delTarget) return
    try {
      await del.mutateAsync(delTarget.id)
      toast.success(t('deleted'))
      setDelTarget(null)
    } catch (e) {
      toastError(e)
    }
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <PageHeader
        title={t('title')}
        description={t('subtitle')}
        actions={
          canWrite && (
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={uploadCat}
                onValueChange={(v) => setUploadCat(v as FileCategory)}
              >
                <SelectTrigger className="h-9 w-40 text-[12.5px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FILE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {t(`category.${c}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <label className="text-secondary-foreground flex items-center gap-1.5 text-[12.5px] font-medium">
                <Switch
                  checked={uploadConfidential}
                  onCheckedChange={setUploadConfidential}
                />
                <Lock className="text-muted-foreground size-3.5" />
                {t('confidential')}
              </label>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                onChange={onFile}
              />
              <Button
                onClick={() => fileRef.current?.click()}
                disabled={upload.isPending}
              >
                {upload.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                {t('upload')}
              </Button>
            </div>
          )
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FILE_CATEGORIES.map((c) => {
          const tint = CAT_TINT[c]
          const active = catFilter === c
          return (
            <button
              key={c}
              type="button"
              onClick={() => {
                setCatFilter(active ? '' : c)
                setPage((p) => ({ ...p, offset: 0 }))
              }}
              className={cn(
                'bg-card focus-visible:ring-primary/20 flex flex-col gap-3 rounded-[14px] border p-4 text-left shadow-[0_1px_2px_rgba(20,40,80,0.04)] transition-all outline-none hover:shadow-[0_8px_24px_rgba(20,40,80,0.08)] focus-visible:ring-[3px]',
                active
                  ? 'border-brand ring-brand/30 ring-2'
                  : 'hover:border-brand/40',
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-[9px]"
                  style={{ background: tint.bg, color: tint.fg }}
                >
                  <FolderIcon className="size-[18px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-bold">
                    {t(`category.${c}`)}
                  </div>
                  <div className="text-muted-foreground truncate text-[11px] uppercase">
                    {ALLOWED_EXT[c].slice(0, 4).join(' / ')}
                  </div>
                </div>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[24px] font-extrabold tabular-nums">
                  {summary.isLoading ? '—' : (counts.get(c) ?? 0)}
                </span>
                <span className="text-muted-foreground text-[12px]">
                  {t('filesUnit')}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-2">
        <h2 className="text-[15px] font-bold">
          {catFilter ? t(`category.${catFilter}`) : t('category.all')}
        </h2>
        {catFilter && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setCatFilter('')
              setPage((p) => ({ ...p, offset: 0 }))
            }}
          >
            {t('category.all')}
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={query.data?.items ?? []}
        loading={query.isLoading}
        error={query.isError ? query.error : undefined}
        onRetry={() => query.refetch()}
        empty={<EmptyState title={t('empty')} description={t('emptyDesc')} />}
        pagination={{
          limit: page.limit,
          offset: page.offset,
          total: query.data?.total ?? 0,
          onChange: setPage,
        }}
      />

      <ConfirmDialog
        open={!!delTarget}
        onOpenChange={(o) => !o && setDelTarget(null)}
        title={t('deleteTitle')}
        description={t('deleteDesc', { name: delTarget?.name })}
        destructive
        loading={del.isPending}
        onConfirm={onDelete}
      />
      {grantsTarget && (
        <FileGrantsDialog
          projectId={projectId}
          file={grantsTarget}
          open={!!grantsTarget}
          onOpenChange={(o) => !o && setGrantsTarget(null)}
        />
      )}
    </div>
  )
}
