import { useState } from 'react'
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
import { useCreateOrg } from '@/hooks/use-orgs'
import { useToastError } from '@/hooks/use-toast-error'
import { autoSlug, slugify } from '@/lib/slug'

/** 新建组织：名称 + 可选 slug（留空按名称自动生成）。 */
export function CreateOrgDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation('orgs')
  const create = useCreateOrg()
  const toastError = useToastError()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')

  const submit = async () => {
    if (!name.trim()) return
    try {
      await create.mutateAsync({
        name: name.trim(),
        slug: slug.trim() || slugify(name) || autoSlug(name, 'org'),
      })
      toast.success(t('created'))
      onOpenChange(false)
      setName('')
      setSlug('')
    } catch (e) {
      toastError(e)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{t('create.title')}</DialogTitle>
          <DialogDescription>{t('subtitle')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="o-name">{t('create.name')}</Label>
            <Input
              id="o-name"
              placeholder={t('create.namePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="o-slug">{t('create.slug')}</Label>
            <Input
              id="o-slug"
              placeholder={t('create.slugPlaceholder')}
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">{t('create.slugHint')}</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('actions.cancel', { ns: 'common', defaultValue: '取消' })}
          </Button>
          <Button onClick={submit} disabled={!name.trim() || create.isPending}>
            {create.isPending && <Loader2 className="size-4 animate-spin" />}
            {t('create.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
