import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EmptyState, ErrorState, TableSkeleton } from '@/components/states'
import {
  useDatasetVersions,
  useSetColumnRoles,
  useUploadVersion,
} from '@/hooks/use-datasets'
import { useToastError } from '@/hooks/use-toast-error'
import { formatBytes } from '@/lib/format'
import type { ColumnRole, DatasetVersion } from '@/api/datasets'

const ROLES: ColumnRole[] = ['feature', 'label', 'id', 'ignore']

function VersionCard({
  datasetId,
  version,
  canManage,
}: {
  datasetId: string
  version: DatasetVersion
  canManage: boolean
}) {
  const { t } = useTranslation('datasets')
  const setRoles = useSetColumnRoles(datasetId)
  const toastError = useToastError()
  const [draft, setDraft] = useState<Record<string, string>>(
    Object.fromEntries(version.columns.map((c) => [c.name, c.role])),
  )

  const save = async () => {
    try {
      await setRoles.mutateAsync({ versionNo: version.version_no, roles: draft })
      toast.success(t('toast.rolesSaved'))
    } catch (e) {
      toastError(e)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge>v{version.version_no}</Badge>
          <Badge variant="secondary">{version.format}</Badge>
          <span className="text-muted-foreground tabular-nums">
            {t('versions.rows')}: {version.row_count}
          </span>
          <span className="text-muted-foreground tabular-nums">
            {t('versions.size')}: {formatBytes(version.byte_size)}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-2 text-xs">{t('versions.roles')}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {version.columns.map((c) => (
            <div key={c.name} className="flex items-center gap-2">
              <span
                className="w-28 truncate font-mono text-xs"
                title={`${c.name} (${c.type})`}
              >
                {c.name}
              </span>
              <Select
                value={draft[c.name]}
                onValueChange={(v) => setDraft((d) => ({ ...d, [c.name]: v }))}
                disabled={!canManage}
              >
                <SelectTrigger size="sm" className="flex-1">
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
            </div>
          ))}
        </div>
        {canManage && (
          <Button
            size="sm"
            variant="outline"
            className="mt-3"
            onClick={save}
            disabled={setRoles.isPending}
          >
            {setRoles.isPending && <Loader2 className="size-4 animate-spin" />}
            {t('versions.saveRoles')}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export function DatasetVersionsPanel({
  datasetId,
  canManage,
}: {
  datasetId: string
  canManage: boolean
}) {
  const { t } = useTranslation('datasets')
  const query = useDatasetVersions(datasetId)
  const upload = useUploadVersion(datasetId)
  const toastError = useToastError()
  const fileRef = useRef<HTMLInputElement>(null)

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const lower = file.name.toLowerCase()
    const format = lower.endsWith('.xlsx') || lower.endsWith('.xls') ? 'xlsx' : 'csv'
    try {
      await upload.mutateAsync({ file, format })
      toast.success(t('toast.uploaded'))
    } catch (err) {
      toastError(err)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">{t('versions.title')}</h2>
        {canManage && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={onFile}
            />
            <Button onClick={() => fileRef.current?.click()} disabled={upload.isPending}>
              {upload.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              {upload.isPending ? t('versions.uploading') : t('versions.upload')}
            </Button>
          </>
        )}
      </div>

      {query.isLoading ? (
        <TableSkeleton rows={2} cols={3} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.data && query.data.length > 0 ? (
        <div className="space-y-3">
          {query.data.map((v) => (
            <VersionCard
              key={v.id}
              datasetId={datasetId}
              version={v}
              canManage={canManage}
            />
          ))}
        </div>
      ) : (
        <EmptyState title={t('versions.empty')} />
      )}
    </div>
  )
}
