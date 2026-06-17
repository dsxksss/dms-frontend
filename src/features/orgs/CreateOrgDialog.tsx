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
import { autoSlug } from '@/lib/slug'

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
    const e = { slug: false, name: !name.trim() }
    setErr(e)
    if (e.name) return
    try {
      // slug 留空时由名称自动派生（中文名回退随机串），用户无需手填。
      await create.mutateAsync({ slug: slug.trim() || autoSlug(name, 'org'), name })
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
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="oname">{t('create.name')}</Label>
            <Input
              id="oname"
              autoFocus
              placeholder={t('create.namePlaceholder')}
              value={name}
              aria-invalid={err.name}
              onChange={(e) => setName(e.target.value)}
            />
            {err.name && (
              <p className="text-destructive text-sm">{t('create.nameRequired')}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="oslug">{t('create.slug')}</Label>
            <Input
              id="oslug"
              placeholder={t('create.slugAuto')}
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">{t('create.slugHint')}</p>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending && <Loader2 className="size-4 animate-spin" />}
              {t('create.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
