import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/page-header'
import { ProtocolsPanel } from './ProtocolsPanel'
import { RunsPanel } from './RunsPanel'

/** 方案 + 执行实例（ELN）合并页：上方方案卡片，下方执行表。 */
export function ProtocolsTab({ projectId }: { projectId: string }) {
  const { t } = useTranslation('protocols')

  return (
    <div className="px-[26px] py-[22px] max-w-[1200px]">
      <PageHeader
        title={t('pageTitle')}
        titleEn="Protocols & Runs"
        description={t('subtitle')}
      />

      <ProtocolsPanel projectId={projectId} />

      <div className="mt-8">
        <h2 className="mb-4 text-[18px] font-extrabold tracking-[-0.01em]">
          {t('run.section')}
        </h2>
        <RunsPanel projectId={projectId} />
      </div>
    </div>
  )
}
