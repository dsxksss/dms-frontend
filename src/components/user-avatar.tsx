import { User } from 'lucide-react'
import { tintOf } from '@/lib/tile'
import { cn } from '@/lib/utils'

/**
 * 统一的圆形用户头像：由 seed(建议 user_id) 取稳定底色；有 initials 显字母，否则显 User 图标。
 */
export function UserAvatar({
  seed,
  initials,
  className,
}: {
  seed: string
  initials?: string
  className?: string
}) {
  return (
    <span
      className={cn(
        'flex size-[30px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white',
        className,
      )}
      style={{ background: tintOf(seed).fg }}
    >
      {initials ? initials.slice(0, 2).toUpperCase() : <User className="size-4" />}
    </span>
  )
}
