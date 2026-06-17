import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateType, useUpdateType } from '@/hooks/use-registry'
import { useToastError } from '@/hooks/use-toast-error'
import { autoSlug } from '@/lib/slug'
import type { EntityScope, EntityType, FieldDefInput } from '@/api/registry'
import { FieldBuilder } from './FieldBuilder'

export function EntityTypeDialog({
  projectId,
  open,
  onOpenChange,
  type,
}: {
  projectId: string
  open: boolean
  onOpenChange: (o: boolean) => void
  type?: EntityType | null
}) {
  const { t } = useTranslation('registry')
  const isEdit = !!type
  const create = useCreateType(projectId)
  const update = useUpdateType(projectId, type?.id ?? '')
  const toastError = useToastError()

  const [key, setKey] = useState('')
  const [name, setName] = useState('')
  const [scope, setScope] = useState<EntityScope>('project')
  const [fields, setFields] = useState<FieldDefInput[]>([])
  const [errors, setErrors] = useState<{ key?: string; name?: string }>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setKey(type?.key ?? '')
      setName(type?.name ?? '')
      setScope(type?.scope ?? 'project')
      setFields(type?.fields ?? [])
      setErrors({})
    }
  }, [open, type])

  const submit = async () => {
    const errs: typeof errors = {}
    if (!name.trim()) errs.name = t('types.nameRequired')
    setErrors(errs)
    if (Object.keys(errs).length) return

    setSubmitting(true)
    try {
      if (isEdit && type) {
        await update.mutateAsync({ name, fields, version: type.version })
        toast.success(t('types.updated'))
      } else {
        // key 留空时按名称自动派生（中文名回退随机），用户无需手填。
        const finalKey = key.trim() || autoSlug(name, 'type')
        await create.mutateAsync({ body: { key: finalKey, name, fields }, scope })
        toast.success(t('types.created'))
      }
      onOpenChange(false)
    } catch (e) {
      toastError(e)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('types.edit') : t('types.create')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!isEdit && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="key">{t('types.key')}</Label>
                <Input
                  id="key"
                  placeholder={t('types.keyAuto')}
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('types.scope')}</Label>
                <Select
                  value={scope}
                  onValueChange={(v) => setScope(v as EntityScope)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="project">{t('scope.project')}</SelectItem>
                    <SelectItem value="organization">
                      {t('scope.organization')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="tname">{t('types.name')}</Label>
            <Input
              id="tname"
              autoFocus
              placeholder={t('types.namePlaceholder')}
              value={name}
              aria-invalid={!!errors.name}
              onChange={(e) => setName(e.target.value)}
            />
            {errors.name && (
              <p className="text-destructive text-sm">{errors.name}</p>
            )}
          </div>

          <FieldBuilder value={fields} onChange={setFields} />
        </div>

        <DialogFooter>
          <Button onClick={submit} disabled={submitting}>
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {isEdit ? t('actions.save', { ns: 'common' }) : t('types.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
