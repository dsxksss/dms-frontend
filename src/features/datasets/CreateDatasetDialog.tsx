import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Loader2, Upload, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  datasetKeys,
  useCreateDataset,
  useUpdateDataset,
} from '@/hooks/use-datasets'
import { useToastError } from '@/hooks/use-toast-error'
import { datasetsApi, type Dataset, type DatasetScope } from '@/api/datasets'
import {
  DatasetMetaFields,
  emptyMeta,
  normalizeMeta,
  type DatasetMetaValue,
} from './DatasetMetaFields'

/** 新建 / 编辑数据集：名称 + 描述。编辑携带乐观锁 version。 */
export function CreateDatasetDialog({
  projectId,
  scope,
  open,
  onOpenChange,
  dataset,
}: {
  projectId?: string
  scope?: DatasetScope
  open: boolean
  onOpenChange: (open: boolean) => void
  dataset?: Dataset
}) {
  const { t } = useTranslation('datasets')
  const qc = useQueryClient()
  const toastError = useToastError()
  const isEdit = !!dataset
  const datasetScope = scope ?? projectId ?? ''
  const create = useCreateDataset(datasetScope)
  const update = useUpdateDataset(datasetScope, dataset?.id ?? '')
  const fileRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [meta, setMeta] = useState<DatasetMetaValue>(emptyMeta())
  const [initialFile, setInitialFile] = useState<File | null>(null)
  const [uploadingInitial, setUploadingInitial] = useState(false)

  // 打开时同步初值（编辑回填 / 新建清空）。
  useEffect(() => {
    if (open) {
      setName(dataset?.name ?? '')
      setDescription(dataset?.description ?? '')
      setMeta({
        tags: dataset?.tags ?? [],
        author: dataset?.author ?? '',
        references: dataset?.references ?? [],
      })
      setInitialFile(null)
      setUploadingInitial(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }, [open, dataset])

  const pending = create.isPending || update.isPending || uploadingInitial

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setInitialFile(file)
    if (file && !name.trim()) {
      setName(file.name.replace(/\.(csv|xlsx)$/i, ''))
    }
  }

  const clearFile = () => {
    setInitialFile(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const submit = async () => {
    if (!name.trim()) return
    let created: Dataset | null = null
    try {
      if (isEdit && dataset) {
        await update.mutateAsync({
          name: name.trim(),
          description: description.trim(),
          version: dataset.version,
          ...normalizeMeta(meta),
        })
        toast.success(t('toast.updated'))
      } else {
        created = await create.mutateAsync({
          name: name.trim(),
          description: description.trim() || undefined,
          ...normalizeMeta(meta),
        })
        if (initialFile) {
          setUploadingInitial(true)
          const format = initialFile.name.toLowerCase().endsWith('.xlsx')
            ? 'xlsx'
            : 'csv'
          await datasetsApi.uploadVersion(
            datasetScope,
            created.id,
            initialFile,
            format,
          )
          await qc.invalidateQueries({
            queryKey: datasetKeys.scope(datasetScope),
          })
          toast.success(t('toast.createdWithFile'))
        } else {
          toast.success(t('toast.created'))
        }
      }
      onOpenChange(false)
    } catch (e) {
      if (created) {
        toast.success(t('toast.created'))
        onOpenChange(false)
      }
      toastError(e)
    } finally {
      setUploadingInitial(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t('edit.title') : t('create.title')}
          </DialogTitle>
          <DialogDescription>{t('subtitle')}</DialogDescription>
        </DialogHeader>
        <div className="max-h-[64vh] space-y-4 overflow-auto px-0.5">
          <div className="space-y-1.5">
            <Label htmlFor="ds-name">{t('create.name')}</Label>
            <Input
              id="ds-name"
              placeholder={t('create.namePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ds-desc">{t('create.description')}</Label>
            <Textarea
              id="ds-desc"
              placeholder={t('create.descriptionPlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          {!isEdit && (
            <div className="space-y-1.5">
              <Label>{t('create.initialFile')}</Label>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={onPickFile}
              />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileRef.current?.click()}
                  disabled={pending}
                >
                  <Upload className="size-4" />
                  {initialFile
                    ? t('create.changeFile')
                    : t('create.pickFile')}
                </Button>
                {initialFile && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={clearFile}
                    disabled={pending}
                    title={t('create.clearFile')}
                  >
                    <X className="size-4" />
                  </Button>
                )}
              </div>
              {initialFile ? (
                <div className="truncate text-[12px] font-semibold text-muted-foreground">
                  {initialFile.name}
                </div>
              ) : (
                <p className="text-[12px] text-muted-foreground">
                  {t('create.fileHint')}
                </p>
              )}
            </div>
          )}
          <DatasetMetaFields value={meta} onChange={setMeta} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('actions.cancel', { ns: 'common', defaultValue: '取消' })}
          </Button>
          <Button onClick={submit} disabled={!name.trim() || pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            {isEdit
              ? t('actions.save', { ns: 'common', defaultValue: '保存' })
              : initialFile
                ? t('create.submitWithFile')
                : t('create.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
