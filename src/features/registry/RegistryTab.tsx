import { useTranslation } from 'react-i18next'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EntityTypesPanel } from './EntityTypesPanel'
import { EntitiesPanel } from './EntitiesPanel'

export function RegistryTab({ projectId }: { projectId: string }) {
  const { t } = useTranslation('registry')
  return (
    <Tabs defaultValue="types">
      <TabsList>
        <TabsTrigger value="types">{t('tabs.types')}</TabsTrigger>
        <TabsTrigger value="entities">{t('tabs.entities')}</TabsTrigger>
      </TabsList>
      <TabsContent value="types" className="pt-4">
        <EntityTypesPanel projectId={projectId} />
      </TabsContent>
      <TabsContent value="entities" className="pt-4">
        <EntitiesPanel projectId={projectId} />
      </TabsContent>
    </Tabs>
  )
}
