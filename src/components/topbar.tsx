import { Fragment, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Bell, HelpCircle, Search } from 'lucide-react'
import { LangToggle } from '@/components/lang-toggle'
import { cn } from '@/lib/utils'

export type Crumb = { label: ReactNode; to?: string }

/** 顶栏（58px）：面包屑 + 装饰搜索 + 语言切换 + 帮助 + 通知。 */
export function Topbar({
  crumbs,
  onHelp,
}: {
  crumbs: Crumb[]
  /** 点「帮助」重播新手引导。 */
  onHelp?: () => void
}) {
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
      <div className="hidden w-[240px] items-center gap-2 rounded-[9px] border bg-background px-[11px] py-[7px] text-[#9aa3b0] lg:flex">
        <Search className="size-[15px]" />
        <span className="text-[12.5px]">搜索 Search…</span>
        <span className="ml-auto text-[11px] text-[#aeb6c2]">⌘K</span>
      </div>
      <LangToggle />
      {onHelp && (
        <button
          onClick={onHelp}
          data-tour="help"
          className="flex size-9 items-center justify-center rounded-[9px] border bg-card text-[#5a6473] transition hover:bg-background"
          aria-label="Help / guided tour"
        >
          <HelpCircle className="size-4" />
        </button>
      )}
      <button
        className="flex size-9 items-center justify-center rounded-[9px] border bg-card text-[#5a6473] transition hover:bg-background"
        aria-label="Notifications"
      >
        <Bell className="size-4" />
      </button>
    </header>
  )
}
