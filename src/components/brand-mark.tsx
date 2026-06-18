import { cn } from '@/lib/utils'

/**
 * Bio-Data OS 品牌标记：渐变方块 + 烧瓶线性图标（来自 design_handoff 原型）。
 * 尺寸由 className 控制（如 `size-[30px]`），图标尺寸由 iconClassName 控制。
 */
export function BrandMark({
  className,
  iconClassName,
  variant = 'brand',
}: {
  className?: string
  iconClassName?: string
  /** brand = 蓝色渐变（前台）；platform = 紫色渐变（平台控制台） */
  variant?: 'brand' | 'platform'
}) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-lg',
        variant === 'platform'
          ? 'bg-gradient-to-br from-[#6D5BD0] to-[#8E7DE8]'
          : 'bg-gradient-to-br from-[#2F6BFF] to-[#5B8DEF]',
        className,
      )}
    >
      {variant === 'platform' ? (
        <svg
          className={cn('size-4', iconClassName)}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth={2.1}
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ) : (
        <svg
          className={cn('size-[17px]', iconClassName)}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth={2.2}
          strokeLinecap="round"
        >
          <path d="M9 3h6M9 3v5l-4.5 8A2.5 2.5 0 0 0 6.8 20h10.4a2.5 2.5 0 0 0 2.3-3.6L15 8V3" />
          <path d="M7.5 14h9" />
        </svg>
      )}
    </div>
  )
}
