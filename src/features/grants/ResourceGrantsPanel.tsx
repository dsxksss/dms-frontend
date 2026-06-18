import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { RowList, Row } from '@/components/row-list'
import { UserAvatar } from '@/components/user-avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TableSkeleton } from '@/components/states'
import { UserName } from '@/components/user-name'
import { UserPicker } from '@/features/membership/UserPicker'
import {
  useResourceGrants,
  useGrantResource,
  useRevokeResource,
} from '@/hooks/use-grants'
import { useToastError } from '@/hooks/use-toast-error'
import {
  GRANT_ACTIONS,
  type GrantAction,
  type GrantResourceType,
} from '@/api/grants'
import type { UserCard } from '@/api/membership'

/** 资源协作者授权：给具体的人按动作(读/增/改/删/管理)叠加放行。仅项目 Manager 可用。 */
export function ResourceGrantsPanel({
  resourceType,
  resourceId,
}: {
  resourceType: GrantResourceType
  resourceId: string
}) {
  const { t } = useTranslation('common')
  const list = useResourceGrants(resourceType, resourceId)
  const grant = useGrantResource(resourceType, resourceId)
  const revoke = useRevokeResource(resourceType, resourceId)
  const toastError = useToastError()

  const [users, setUsers] = useState<UserCard[]>([])
  const [action, setAction] = useState<GrantAction>('read')

  const onGrant = async () => {
    const uid = users[0]?.id
    if (!uid) return
    try {
      await grant.mutateAsync({
        resource_type: resourceType,
        resource_id: resourceId,
        user_id: uid,
        action,
      })
      toast.success(t('resourceGrants.granted'))
      setUsers([])
    } catch (e) {
      toastError(e)
    }
  }

  const onRevoke = async (userId: string, act: GrantAction) => {
    try {
      await revoke.mutateAsync({
        resource_type: resourceType,
        resource_id: resourceId,
        user_id: userId,
        action: act,
      })
      toast.success(t('resourceGrants.revoked'))
    } catch (e) {
      toastError(e)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">{t('resourceGrants.desc')}</p>

      <Card className="gap-3 p-4">
        <div className="space-y-1.5">
          <Label>{t('resourceGrants.user')}</Label>
          <UserPicker value={users} onChange={setUsers} max={1} />
        </div>
        <div className="flex items-end gap-2">
          <div className="space-y-1.5">
            <Label>{t('resourceGrants.action')}</Label>
            <Select value={action} onValueChange={(v) => setAction(v as GrantAction)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GRANT_ACTIONS.map((a) => (
                  <SelectItem key={a} value={a}>
                    {t(`resourceGrants.actions.${a}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={onGrant} disabled={!users[0] || grant.isPending}>
            {grant.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            {t('resourceGrants.add')}
          </Button>
        </div>
      </Card>

      {list.isLoading ? (
        <TableSkeleton rows={2} cols={2} />
      ) : list.data && list.data.length > 0 ? (
        <RowList>
          {list.data.map((g) => (
            <Row key={g.id}>
              <UserAvatar seed={g.user_id} />
              <span className="min-w-0 flex-1">
                <UserName
                  id={g.user_id}
                  className="truncate text-[13px] font-semibold"
                />
              </span>
              <Badge variant="info">
                {t(`resourceGrants.actions.${g.action}`)}
              </Badge>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onRevoke(g.user_id, g.action)}
                aria-label={t('resourceGrants.revoked')}
              >
                <Trash2 className="text-destructive size-4" />
              </Button>
            </Row>
          ))}
        </RowList>
      ) : (
        <p className="text-muted-foreground text-sm">{t('resourceGrants.empty')}</p>
      )}
    </div>
  )
}
