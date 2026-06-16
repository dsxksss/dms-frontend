import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/page-header'
import { EmptyState } from '@/components/states'

export function ComingSoonPage({ titleKey }: { titleKey: string }) {
  const { t } = useTranslation()
  return (
    <div>
      <PageHeader title={t(titleKey)} />
      <EmptyState title={t('comingSoon')} />
    </div>
  )
}
