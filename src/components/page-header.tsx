import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * 页面标题区（原型 H1）：只显示当前语言的标题 + 描述 + 右侧操作（与侧栏 BiLabel 口径一致，
 * 不再中英并排）。title 传已本地化的串；titleEn 仅为兼容旧调用而保留，不渲染。
 */
export function PageHeader({
  title,
  description,
  actions,
  size = 'lg',
}: {
  title: string
  /** @deprecated 不再渲染——中文模式只显示中文标题，避免中英并排冗余。 */
  titleEn?: string
  description?: ReactNode
  actions?: ReactNode
  size?: 'lg' | 'md'
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end gap-x-3.5 gap-y-2.5">
      <div className="min-w-0 flex-1">
        <h1
          className={cn(
            'font-extrabold leading-tight tracking-[-0.01em]',
            size === 'lg' ? 'text-[25px]' : 'text-[23px]',
          )}
        >
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  )
}
