import { Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SUPPORTED_LANGS } from '@/i18n/i18n'

export function LangToggle() {
  const { t, i18n } = useTranslation()
  const current = i18n.resolvedLanguage

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t('lang.label')}>
          <Languages className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {SUPPORTED_LANGS.map((lng) => (
          <DropdownMenuItem
            key={lng}
            onClick={() => void i18n.changeLanguage(lng)}
            className={current === lng ? 'text-brand' : undefined}
          >
            {t(`lang.${lng}`)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
