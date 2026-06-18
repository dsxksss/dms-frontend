import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/page-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EntityTypesPanel } from './EntityTypesPanel'
import { RecordsPanel } from './EntitiesPanel'

export function RegistryTab({ projectId }: { projectId: string }) {
  const { t } = useTranslation('registry')
  return (
    <Tabs defaultValue="assets" className="mx-auto max-w-[1200px] gap-4">
      <PageHeader title={t('title')} description={t('subtitle')} />
      <TabsList>
        <TabsTrigger value="assets">{t('tabs.assets')}</TabsTrigger>
        <TabsTrigger value="data">{t('tabs.data')}</TabsTrigger>
        <TabsTrigger value="types">{t('tabs.types')}</TabsTrigger>
      </TabsList>
      <TabsContent value="assets" className="pt-4">
        <RecordsPanel projectId={projectId} kind="asset" />
      </TabsContent>
      <TabsContent value="data" className="pt-4">
        <RecordsPanel projectId={projectId} kind="template" />
      </TabsContent>
      <TabsContent value="types" className="pt-4">
        <EntityTypesPanel projectId={projectId} />
      </TabsContent>
    </Tabs>
  )
}
