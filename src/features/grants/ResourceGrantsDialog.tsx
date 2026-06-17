import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { GrantResourceType } from '@/api/grants'
import { ResourceGrantsPanel } from './ResourceGrantsPanel'

export function ResourceGrantsDialog({
  resourceType,
  resourceId,
  name,
  open,
  onOpenChange,
}: {
  resourceType: GrantResourceType
  resourceId: string
  name?: string
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const { t } = useTranslation('common')
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t('resourceGrants.title')}
            {name ? ` · ${name}` : ''}
          </DialogTitle>
        </DialogHeader>
        {open && (
          <ResourceGrantsPanel
            resourceType={resourceType}
            resourceId={resourceId}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
