import { Fragment, useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Search } from 'lucide-react'
import { LangToggle } from '@/components/lang-toggle'
import { CommandPalette } from '@/components/command-palette'
import { cn } from '@/lib/utils'

export type Crumb = { label: ReactNode; to?: string }

/** 顶栏（58px）：面包屑 + 全局搜索（⌘K/Ctrl+K）+ 语言切换。 */
export function Topbar({
  crumbs,
  search = true,
}: {
  crumbs: Crumb[]
  /** 是否启用全局搜索（租户 app 启用；平台后台无租户级数据，关闭）。 */
  search?: boolean
}) {
  const { t } = useTranslation('common')
  const [searchOpen, setSearchOpen] = useState(false)

  // 全局快捷键 ⌘K / Ctrl+K 打开搜索。
  useEffect(() => {
    if (!search) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [search])

  return (
    <header className="flex h-[58px] flex-none items-center gap-4 border-b bg-card px-[22px]">
      <nav className="flex min-w-0 items-center gap-[7px] text-[12.5px] text-muted-foreground">
        {crumbs.map((c, i) => (
          <Fragment key={i}>
            {i > 0 && <span className="opacity-40">/</span>}
            {c.to ? (
              <Link to={c.to} className="truncate hover:text-foreground">
                {c.label}
              </Link>
            ) : (
              <span
                className={cn(
                  'truncate',
                  i === crumbs.length - 1 && 'font-semibold text-foreground',
                )}
              >
                {c.label}
              </span>
            )}
          </Fragment>
        ))}
      </nav>
      <div className="flex-1" />
      {search && (
        <>
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="hidden w-[240px] items-center gap-2 rounded-[9px] border bg-background px-[11px] py-[7px] text-[#9aa3b0] transition hover:border-[#c7cdd8] hover:text-foreground lg:flex"
          >
            <Search className="size-[15px]" />
            <span className="text-[12.5px]">{t('search.trigger')}</span>
            <span className="ml-auto text-[11px] text-[#aeb6c2]">⌘K</span>
          </button>
          {/* 小屏：仅图标按钮 */}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex size-9 items-center justify-center rounded-[9px] border bg-card text-[#5a6473] transition hover:bg-background lg:hidden"
            aria-label={t('search.trigger')}
          >
            <Search className="size-4" />
          </button>
          <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
        </>
      )}
      <LangToggle />
    </header>
  )
}
