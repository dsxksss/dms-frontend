import { useTranslation } from 'react-i18next'
import { Globe } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { EmptyState } from '@/components/states'

export function PlatformAdminPage() {
  const { t } = useTranslation('admin')
  return (
    <div>
      <PageHeader title={t('platform.title')} />
      <EmptyState icon={<Globe className="size-8" />} title={t('platform.title')} description={t('platform.desc')} />
    </div>
  )
}
