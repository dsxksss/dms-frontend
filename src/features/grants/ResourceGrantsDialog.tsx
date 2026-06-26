import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { GrantResourceType } from '@/api/grants'
import { ResourceGrantsPanel } from './ResourceGrantsPanel'

/** ResourceGrantsPanel 的弹窗外壳：标题带资源名，内嵌授权面板。 */
export function ResourceGrantsDialog({
  resourceType,
  resourceId,
  projectId,
  name,
  open,
  onOpenChange,
}: {
  resourceType: GrantResourceType
  resourceId: string
  projectId: string
  name: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation('common')
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{t('resourceGrants.title')}</DialogTitle>
          <DialogDescription className="truncate">{name}</DialogDescription>
        </DialogHeader>
        {open && (
          <ResourceGrantsPanel
            resourceType={resourceType}
            resourceId={resourceId}
            projectId={projectId}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
