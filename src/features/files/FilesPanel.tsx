import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ColumnDef } from '@tanstack/react-table'
import { Download, Lock, Loader2, MoreHorizontal, ShieldCheck, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'

import { DataTable } from '@/components/data-table'
import { EmptyState } from '@/components/states'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
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
  useSetFileConfidential,
  useUploadFile,
} from '@/hooks/use-files'
import { useToastError } from '@/hooks/use-toast-error'
import { FileGrantsDialog } from './FileGrantsDialog'
import { roleAtLeast } from '@/lib/roles'
import { formatBytes } from '@/lib/format'
import {
  ALLOWED_EXT,
  FILE_CATEGORIES,
  extOf,
  type FileCategory,
  type FileItem,
} from '@/api/files'
import { filesApi } from '@/api/files'

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
      toast.error(t('invalidExt', { ext, category: t(`category.${uploadCat}`) }))
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

  const columns = useMemo<ColumnDef<FileItem, unknown>[]>(
    () => [
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
          <Badge variant="secondary">{t(`category.${row.original.category}`)}</Badge>
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
    ],
    [t, projectId, canWrite, canManage, toastError],
  )

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
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1.5">
          <Label>{t('columns.category')}</Label>
          <Select
            value={catFilter || 'all'}
            onValueChange={(v) => {
              setCatFilter(v === 'all' ? '' : v)
              setPage((p) => ({ ...p, offset: 0 }))
            }}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('category.all')}</SelectItem>
              {FILE_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {t(`category.${c}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {canWrite && (
          <div className="flex items-end gap-2">
            <div className="space-y-1.5">
              <Label>{t('pickCategory')}</Label>
              <Select
                value={uploadCat}
                onValueChange={(v) => setUploadCat(v as FileCategory)}
              >
                <SelectTrigger className="w-44">
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
            </div>
            <label className="flex items-center gap-2 pb-2 text-sm">
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
            <Button onClick={() => fileRef.current?.click()} disabled={upload.isPending}>
              {upload.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              {t('upload')}
            </Button>
          </div>
        )}
      </div>

      {canWrite && (
        <p className="text-muted-foreground text-xs">
          {t('allowedExt', { exts: ALLOWED_EXT[uploadCat].join(', ') })}
        </p>
      )}

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
