import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'

/** 侧栏容器（236px）。dark=平台深色墨蓝，否则白底。 */
export function Sidebar({
  dark,
  children,
}: {
  dark?: boolean
  children: ReactNode
}) {
  return (
    <aside
      className={cn(
        'flex w-[236px] flex-none flex-col',
        dark ? 'bg-[#161A2B]' : 'border-r bg-card',
      )}
    >
      {children}
    </aside>
  )
}

/** 分区小标题（如 工作区 WORKSPACE）。 */
export function SidebarCaption({ children }: { children: ReactNode }) {
  return (
    <div className="px-[11px] pt-2 pb-1.5 text-[10.5px] font-bold tracking-[0.05em] text-muted-foreground uppercase">
      {children}
    </div>
  )
}

/** 导航区（占满 + 可滚动）。 */
export function SidebarNav({ children }: { children: ReactNode }) {
  return <div className="flex-1 overflow-auto px-3 py-2">{children}</div>
}

/** 侧栏底部栏（用户 / 角色），带上边框。 */
export function SidebarFooter({
  dark,
  children,
}: {
  dark?: boolean
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2.5 border-t p-3',
        dark ? 'border-white/[0.08]' : 'border-border',
      )}
    >
      {children}
    </div>
  )
}

/** 导航项：图标 + 双语标签 + 可选计数徽标。激活态由路由匹配驱动。 */
export function SidebarNavItem({
  to,
  end,
  icon,
  badge,
  badgeRed,
  dark,
  children,
}: {
  to: string
  end?: boolean
  icon: ReactNode
  badge?: ReactNode
  badgeRed?: boolean
  dark?: boolean
  children: ReactNode
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        dark
          ? cn(
              'mb-0.5 flex items-center gap-2.5 rounded-[9px] px-[11px] py-[9px] text-[13.5px] font-medium transition',
              isActive
                ? 'bg-[#6D5BD0] font-bold text-white'
                : 'text-[#9AA0C4] hover:bg-white/[0.06] hover:text-white',
            )
          : cn('nav-i mb-0.5', isActive && 'on')
      }
    >
      <span className="flex shrink-0 [&>svg]:size-[18px]">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {badge != null && badge !== '' && (
        <span
          className={cn(
            'ml-auto shrink-0 rounded-full px-[7px] py-px text-[10px] font-bold',
            badgeRed
              ? 'bg-[#DC2626] text-white'
              : dark
                ? 'bg-white/10 text-white/70'
                : 'bg-[#EEF0F3] text-[#64748B]',
          )}
        >
          {badge}
        </span>
      )}
    </NavLink>
  )
}
