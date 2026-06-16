import { useTranslation } from 'react-i18next'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProtocolsPanel } from './ProtocolsPanel'
import { RunsPanel } from './RunsPanel'

export function ProtocolsTab({ projectId }: { projectId: string }) {
  const { t } = useTranslation('protocols')
  return (
    <Tabs defaultValue="protocols">
      <TabsList>
        <TabsTrigger value="protocols">{t('tabs.protocols')}</TabsTrigger>
        <TabsTrigger value="runs">{t('tabs.runs')}</TabsTrigger>
      </TabsList>
      <TabsContent value="protocols" className="pt-4">
        <ProtocolsPanel projectId={projectId} />
      </TabsContent>
      <TabsContent value="runs" className="pt-4">
        <RunsPanel projectId={projectId} />
      </TabsContent>
    </Tabs>
  )
}
