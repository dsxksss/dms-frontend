import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { EmptyState, ErrorState, TableSkeleton } from '@/components/states'
import { Can } from '@/auth/Can'
import { useCan, useAuth } from '@/auth/auth-context'
import { useAddMember, useMembers, useRemoveMember } from '@/hooks/use-projects'
import { useToastError } from '@/hooks/use-toast-error'
import { PROJECT_ROLES, type ProjectRole } from '@/lib/roles'
import { shortId } from '@/lib/format'
import type { Member } from '@/api/projects'

function AddMemberDialog({
  projectId,
  open,
  onOpenChange,
}: {
  projectId: string
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const { t } = useTranslation('projects')
  const add = useAddMember(projectId)
  const toastError = useToastError()

  const schema = z.object({
    user_id: z.string().min(1, t('members.userIdRequired')),
    role: z.enum(PROJECT_ROLES),
  })
  type Values = z.infer<typeof schema>

  const { register, handleSubmit, reset, setValue, watch, formState } =
    useForm<Values>({
      resolver: zodResolver(schema),
      defaultValues: { user_id: '', role: 'contributor' },
    })

  const onSubmit = async (values: Values) => {
    try {
      await add.mutateAsync(values as Member)
      toast.success(t('members.added'))
      reset()
      onOpenChange(false)
    } catch (e) {
      toastError(e)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('members.add')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="user_id">{t('members.userId')}</Label>
            <Input
              id="user_id"
              placeholder={t('members.userIdPlaceholder')}
              aria-invalid={!!formState.errors.user_id}
              {...register('user_id')}
            />
            {formState.errors.user_id && (
              <p className="text-destructive text-sm">
                {formState.errors.user_id.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>{t('members.role')}</Label>
            <Select
              value={watch('role')}
              onValueChange={(v) => setValue('role', v as ProjectRole)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {t(`roles.${r}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={formState.isSubmitting}>
              {formState.isSubmitting && (
                <Loader2 className="size-4 animate-spin" />
              )}
              {t('members.add')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function MembersPanel({ projectId }: { projectId: string }) {
  const { t } = useTranslation('projects')
  const { me } = useAuth()
  const canWrite = useCan('project:write')
  const query = useMembers(projectId)
  const remove = useRemoveMember(projectId)
  const toastError = useToastError()
  const [addOpen, setAddOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null)

  const onRemove = async () => {
    if (!removeTarget) return
    try {
      await remove.mutateAsync(removeTarget.user_id)
      toast.success(t('members.removed'))
      setRemoveTarget(null)
    } catch (e) {
      toastError(e)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">{t('members.title')}</h2>
        <Can perm="project:write">
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="size-4" />
            {t('members.add')}
          </Button>
        </Can>
      </div>

      {query.isLoading ? (
        <TableSkeleton rows={3} cols={3} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.data && query.data.length > 0 ? (
        <ul className="divide-y rounded-lg border">
          {query.data.map((m) => (
            <li
              key={m.user_id}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm">{shortId(m.user_id)}</span>
                {me?.user_id === m.user_id && (
                  <span className="text-muted-foreground text-xs">
                    {t('members.you')}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{t(`roles.${m.role}`)}</Badge>
                {canWrite && me?.user_id !== m.user_id && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => setRemoveTarget(m)}
                  >
                    <Trash2 className="text-destructive size-4" />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title={t('members.empty')} />
      )}

      <AddMemberDialog
        projectId={projectId}
        open={addOpen}
        onOpenChange={setAddOpen}
      />
      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(o) => !o && setRemoveTarget(null)}
        title={t('members.removeTitle')}
        description={t('members.removeDescription')}
        destructive
        loading={remove.isPending}
        onConfirm={onRemove}
      />
    </div>
  )
}
