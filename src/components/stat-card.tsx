import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * 统计卡（概览 / 平台概览）：标签 + 可选图标方块 + 大数值 + 副标。
 * tint=[底色,图标色]，缺省则不显示图标方块（平台概览样式）。
 */
export function StatCard({
  label,
  value,
  sub,
  subTone = 'muted',
  tint,
  icon,
}: {
  label: ReactNode
  value: ReactNode
  sub?: ReactNode
  subTone?: 'muted' | 'positive'
  tint?: readonly [string, string]
  icon?: ReactNode
}) {
  return (
    <div className="card-shadow rounded-[14px] border bg-card px-[18px] py-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12.5px] font-semibold text-muted-foreground">
          {label}
        </span>
        {tint && icon && (
          <span
            className="flex size-[30px] shrink-0 items-center justify-center rounded-lg [&>svg]:size-4"
            style={{ background: tint[0], color: tint[1] }}
          >
            {icon}
          </span>
        )}
      </div>
      <div className="mt-2 text-[27px] font-extrabold tracking-[-0.01em]">
        {value}
      </div>
      {sub && (
        <div
          className={cn(
            'mt-0.5 text-[11.5px] font-semibold',
            subTone === 'positive' ? 'text-[#16A34A]' : 'text-muted-foreground',
          )}
        >
          {sub}
        </div>
      )}
    </div>
  )
}
