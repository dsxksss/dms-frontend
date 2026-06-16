import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import type { Project } from '@/api/projects'
import { useCreateProject, useUpdateProject } from '@/hooks/use-projects'
import { useToastError } from '@/hooks/use-toast-error'

export function CreateProjectDialog({
  open,
  onOpenChange,
  project,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  project?: Project | null
}) {
  const { t } = useTranslation('projects')
  const isEdit = !!project
  const create = useCreateProject()
  const update = useUpdateProject(project?.id ?? '')
  const toastError = useToastError()

  const schema = z.object({
    name: z.string().min(1, t('create.nameRequired')),
    description: z.string(),
  })
  type Values = z.infer<typeof schema>

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '' },
  })

  useEffect(() => {
    if (open) {
      reset({
        name: project?.name ?? '',
        description: project?.description ?? '',
      })
    }
  }, [open, project, reset])

  const onSubmit = async (values: Values) => {
    try {
      if (isEdit && project) {
        await update.mutateAsync({ ...values, version: project.version })
        toast.success(t('toast.updated'))
      } else {
        await create.mutateAsync(values)
        toast.success(t('toast.created'))
      }
      onOpenChange(false)
    } catch (e) {
      toastError(e)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? t('edit.title') : t('create.title')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t('create.name')}</Label>
            <Input
              id="name"
              placeholder={t('create.namePlaceholder')}
              aria-invalid={!!errors.name}
              {...register('name')}
            />
            {errors.name && (
              <p className="text-destructive text-sm">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{t('create.description')}</Label>
            <Textarea
              id="description"
              placeholder={t('create.descriptionPlaceholder')}
              {...register('description')}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? t('actions.save', { ns: 'common' }) : t('create.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
