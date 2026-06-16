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
import { useCreateOrg } from '@/hooks/use-orgs'
import { useToastError } from '@/hooks/use-toast-error'

export function CreateOrgDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const { t } = useTranslation('orgs')
  const create = useCreateOrg()
  const toastError = useToastError()
  const [slug, setSlug] = useState('')
  const [name, setName] = useState('')
  const [err, setErr] = useState<{ slug?: boolean; name?: boolean }>({})

  useEffect(() => {
    if (open) {
      setSlug('')
      setName('')
      setErr({})
    }
  }, [open])

  const submit = async () => {
    const e = { slug: !slug.trim(), name: !name.trim() }
    setErr(e)
    if (e.slug || e.name) return
    try {
      await create.mutateAsync({ slug, name })
      toast.success(t('created'))
      onOpenChange(false)
    } catch (ex) {
      toastError(ex)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('create.title')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="oslug">{t('create.slug')}</Label>
            <Input
              id="oslug"
              placeholder={t('create.slugPlaceholder')}
              value={slug}
              aria-invalid={err.slug}
              onChange={(e) => setSlug(e.target.value)}
            />
            {err.slug && (
              <p className="text-destructive text-sm">{t('create.slugRequired')}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="oname">{t('create.name')}</Label>
            <Input
              id="oname"
              placeholder={t('create.namePlaceholder')}
              value={name}
              aria-invalid={err.name}
              onChange={(e) => setName(e.target.value)}
            />
            {err.name && (
              <p className="text-destructive text-sm">{t('create.nameRequired')}</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={create.isPending}>
            {create.isPending && <Loader2 className="size-4 animate-spin" />}
            {t('create.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
