import { useUser } from '@/hooks/use-membership'
import { shortId } from '@/lib/format'
import { cn } from '@/lib/utils'

/** 把 user_id 解析为显示名（目录查询，缓存去重）；解析前/失败回退到短 id。 */
export function UserName({
  id,
  className,
  showEmail,
}: {
  id: string | null | undefined
  className?: string
  showEmail?: boolean
}) {
  const { data } = useUser(id)
  if (!id) return <span className={cn('text-muted-foreground', className)}>-</span>
  const name = data?.display_name || data?.email || shortId(id)
  return (
    <span className={className} title={data?.email ?? id}>
      {name}
      {showEmail && data?.email && data.email !== name && (
        <span className="text-muted-foreground ml-1 text-xs">{data.email}</span>
      )}
    </span>
  )
}
