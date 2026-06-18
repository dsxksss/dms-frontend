import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Loader2, Upload } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TableCard } from '@/components/data-grid'
import { EmptyState, ErrorState, TableSkeleton } from '@/components/states'
import { columnRoleTone } from '@/components/tone'
import {
  useDatasetVersions,
  useSetColumnRoles,
  useUploadVersion,
} from '@/hooks/use-datasets'
import { useToastError } from '@/hooks/use-toast-error'
import { formatBytes } from '@/lib/format'
import type { ColumnRole, DatasetVersion } from '@/api/datasets'

const ROLES: ColumnRole[] = ['feature', 'label', 'id', 'ignore']

/** 数据集版本：版本列表 + 上传新版本 + 逐列角色编辑（AI-ready）。 */
export function DatasetVersionsPanel({
  projectId,
  datasetId,
  canManage,
}: {
  projectId: string
  datasetId: string
  canManage: boolean
}) {
  const { t } = useTranslation('datasets')
  const toastError = useToastError()
  const query = useDatasetVersions(projectId, datasetId)
  const upload = useUploadVersion(projectId, datasetId)
  const fileRef = useRef<HTMLInputElement>(null)
  const versions = query.data ?? []

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const format = file.name.toLowerCase().endsWith('.xlsx') ? 'xlsx' : 'csv'
    try {
      await upload.mutateAsync({ file, format })
      toast.success(t('toast.uploaded'))
    } catch (err) {
      toastError(err)
    }
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx"
            className="hidden"
            onChange={onPick}
          />
          <Button
            variant="outline"
            onClick={() => fileRef.current?.click()}
            disabled={upload.isPending}
          >
            {upload.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            {upload.isPending ? t('versions.uploading') : t('versions.upload')}
          </Button>
        </div>
      )}

      {query.isLoading ? (
        <TableSkeleton rows={3} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : versions.length === 0 ? (
        <EmptyState title={t('versions.empty')} />
      ) : (
        <div className="space-y-3">
          {versions.map((v) => (
            <VersionCard
              key={v.id}
              projectId={projectId}
              datasetId={datasetId}
              version={v}
              canManage={canManage}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function VersionCard({
  projectId,
  datasetId,
  version,
  canManage,
}: {
  projectId: string
  datasetId: string
  version: DatasetVersion
  canManage: boolean
}) {
  const { t } = useTranslation('datasets')
  const toastError = useToastError()
  const setRoles = useSetColumnRoles(projectId, datasetId)
  const [draft, setDraft] = useState<Record<string, ColumnRole>>({})

  // 版本数据到来/变化时，用其列角色初始化草稿。
  useEffect(() => {
    const init: Record<string, ColumnRole> = {}
    for (const c of version.columns) init[c.name] = c.role
    setDraft(init)
  }, [version])

  const dirty = version.columns.some((c) => draft[c.name] !== c.role)

  const save = async () => {
    try {
      await setRoles.mutateAsync({
        versionNo: version.version_no,
        roles: draft as Record<string, string>,
      })
      toast.success(t('toast.rolesSaved'))
    } catch (e) {
      toastError(e)
    }
  }

  return (
    <TableCard className="p-[18px]">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <Badge variant="info" className="mono">
          v{version.version_no}
        </Badge>
        <span className="text-[12.5px] text-muted-foreground">
          {version.format.toUpperCase()}
        </span>
        <span className="text-[12.5px] text-muted-foreground">
          {version.row_count} {t('versions.rows')}
        </span>
        <span className="text-[12.5px] text-muted-foreground">
          {version.columns.length} {t('versions.columns')}
        </span>
        <span className="text-[12.5px] text-muted-foreground">
          {formatBytes(version.byte_size)}
        </span>
      </div>

      <div className="mt-3 border-t border-divider pt-3">
        <div className="mb-2 text-[11.5px] font-bold text-muted-foreground">
          {t('versions.roles')}
        </div>
        <div className="flex flex-wrap gap-2">
          {version.columns.map((c) => (
            <div
              key={c.name}
              className="flex items-center gap-2 rounded-lg border border-divider px-2.5 py-1.5"
            >
              <span className="mono text-[12px] font-semibold">{c.name}</span>
              {canManage ? (
                <Select
                  value={draft[c.name] ?? c.role}
                  onValueChange={(val) =>
                    setDraft((d) => ({ ...d, [c.name]: val as ColumnRole }))
                  }
                >
                  <SelectTrigger size="sm" className="h-7 w-[112px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {t(`columnRole.${r}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant={columnRoleTone(c.role)}>
                  {t(`columnRole.${c.role}`)}
                </Badge>
              )}
            </div>
          ))}
        </div>
        {canManage && (
          <div className="mt-3">
            <Button
              size="sm"
              onClick={save}
              disabled={!dirty || setRoles.isPending}
            >
              {setRoles.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              {t('versions.saveRoles')}
            </Button>
          </div>
        )}
      </div>
    </TableCard>
  )
}
