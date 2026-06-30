import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

/** 中 / EN 语言切换。 */
export function LangToggle({ className }: { className?: string }) {
  const { i18n } = useTranslation()
  const isZh = i18n.language.startsWith('zh')
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className={className}
      aria-label="Toggle language"
      onClick={() => void i18n.changeLanguage(isZh ? 'en' : 'zh-CN')}
    >
      <span className="text-[12px] font-bold">{isZh ? 'EN' : '中'}</span>
    </Button>
  )
}
