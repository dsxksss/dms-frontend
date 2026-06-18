import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/page-header'
import { ProtocolsPanel } from './ProtocolsPanel'
import { RunsPanel } from './RunsPanel'

/** 实验方案与执行（ELN）：方案卡片 + 执行实例表，单页同屏（对齐原型）。 */
export function ProtocolsTab({ projectId }: { projectId: string }) {
  const { t } = useTranslation('protocols')
  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <PageHeader
        title={t('title')}
        titleI18n={{ key: 'title', ns: 'protocols' }}
        description={t('subtitle')}
      />
      <ProtocolsPanel projectId={projectId} />
      <div>
        <h2 className="mb-3 text-[15px] font-bold">{t('run.section')}</h2>
        <RunsPanel projectId={projectId} />
      </div>
    </div>
  )
}
