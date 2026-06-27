import type { ReactNode } from 'react'
import { Info } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/**
 * 内联说明：难点字段旁的 ⓘ 图标，悬停/聚焦显示解释。降低新手理解成本。
 */
export function InfoHint({
  children,
  className,
  side = 'top',
}: {
  children: ReactNode
  className?: string
  side?: 'top' | 'right' | 'bottom' | 'left'
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="说明 Help"
          className={cn(
            'inline-flex shrink-0 text-muted-foreground/60 transition hover:text-foreground',
            className,
          )}
        >
          <Info className="size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side={side}
        className="max-w-[260px] text-[12px] leading-relaxed font-normal"
      >
        {children}
      </TooltipContent>
    </Tooltip>
  )
}
