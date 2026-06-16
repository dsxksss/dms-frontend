import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

/**
 * M0 占位首页：验证设计系统(Tailwind v4 + shadcn + 双主题)与 i18n 已就绪。
 * M1 起本文件改为承载 React Router 的根。
 */
function App() {
  const { t } = useTranslation()
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 p-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{t('app.name')}</h1>
        <p className="text-muted-foreground max-w-[48ch]">{t('app.tagline')}</p>
      </div>
      <Button>{t('actions.getStarted')}</Button>
    </main>
  )
}

export default App
