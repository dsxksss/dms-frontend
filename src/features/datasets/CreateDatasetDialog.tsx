import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
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
import { useCreateDataset, useUpdateDataset } from '@/hooks/use-datasets'
import { useToastError } from '@/hooks/use-toast-error'
import type { Dataset } from '@/api/datasets'
import {
  DatasetMetaFields,
  emptyMeta,
  normalizeMeta,
  type DatasetMetaValue,
} from './DatasetMetaFields'

/** 新建 / 编辑数据集：名称 + 描述。编辑携带乐观锁 version。 */
export function CreateDatasetDialog({
  projectId,
  open,
  onOpenChange,
  dataset,
}: {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  dataset?: Dataset
}) {
  const { t } = useTranslation('datasets')
  const toastError = useToastError()
  const isEdit = !!dataset
  const create = useCreateDataset(projectId)
  const update = useUpdateDataset(projectId, dataset?.id ?? '')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [meta, setMeta] = useState<DatasetMetaValue>(emptyMeta())

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
    }
  }, [open, dataset])

  const pending = create.isPending || update.isPending

  const submit = async () => {
    if (!name.trim()) return
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
        await create.mutateAsync({
          name: name.trim(),
          description: description.trim() || undefined,
          ...normalizeMeta(meta),
        })
        toast.success(t('toast.created'))
      }
      onOpenChange(false)
    } catch (e) {
      toastError(e)
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
              : t('create.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
