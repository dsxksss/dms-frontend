import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useIsZh } from '@/components/bilingual'

/**
 * 页面标题区（原型 H1）：中文大标题 + 浅色英文副名（仅中文 locale）+ 描述 + 右侧操作。
 * title 传已本地化的串；titleEn 传固定英文短名（如 "Projects"）。
 */
export function PageHeader({
  title,
  titleEn,
  description,
  actions,
  size = 'lg',
}: {
  title: string
  titleEn?: string
  description?: ReactNode
  actions?: ReactNode
  size?: 'lg' | 'md'
}) {
  const isZh = useIsZh()
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
          {isZh && titleEn && (
            <span
              className={cn(
                'ml-2 font-semibold text-muted-foreground',
                size === 'lg' ? 'text-[18px]' : 'text-[17px]',
              )}
            >
              {titleEn}
            </span>
          )}
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
