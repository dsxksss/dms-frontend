import { Moon, Sun, Monitor } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useThemeStore, type Theme } from '@/lib/theme'

const ICON = {
  light: Sun,
  dark: Moon,
  system: Monitor,
} satisfies Record<Theme, typeof Sun>

export function ThemeToggle() {
  const { t } = useTranslation()
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)
  const Active = ICON[theme]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t('theme.label')}>
          <Active className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {(['light', 'dark', 'system'] as const).map((value) => {
          const Icon = ICON[value]
          return (
            <DropdownMenuItem
              key={value}
              onClick={() => setTheme(value)}
              className={theme === value ? 'text-brand' : undefined}
            >
              <Icon className="size-4" />
              {t(`theme.${value}`)}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
