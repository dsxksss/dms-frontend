import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useDebounce } from '@/hooks/use-debounce'
import { useUserSearch } from '@/hooks/use-membership'
import type { UserCard } from '@/api/membership'

/** 用户目录多选：按姓名/邮箱搜索，点选加入；选中以 chip 展示。 */
export function UserPicker({
  value,
  onChange,
}: {
  value: UserCard[]
  onChange: (users: UserCard[]) => void
}) {
  const { t } = useTranslation('membership')
  const [q, setQ] = useState('')
  const debounced = useDebounce(q, 250)
  const search = useUserSearch(debounced)
  const results = (search.data ?? []).filter(
    (u) => !value.some((v) => v.id === u.id),
  )

  const add = (u: UserCard) => {
    onChange([...value, u])
    setQ('')
  }
  const remove = (id: string) => onChange(value.filter((u) => u.id !== id))

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('userPicker.placeholder')}
        />
        {search.isFetching && (
          <Loader2 className="text-muted-foreground absolute top-2.5 right-2.5 size-4 animate-spin" />
        )}
      </div>

      {debounced.trim().length >= 1 && (
        <div className="max-h-48 overflow-auto rounded-md border">
          {results.length === 0 ? (
            <p className="text-muted-foreground px-3 py-3 text-sm">
              {t('userPicker.empty')}
            </p>
          ) : (
            results.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => add(u)}
                className="hover:bg-accent flex w-full flex-col items-start px-3 py-2 text-left text-sm"
              >
                <span className="font-medium">{u.display_name || u.email}</span>
                <span className="text-muted-foreground text-xs">{u.email}</span>
              </button>
            ))
          )}
        </div>
      )}

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((u) => (
            <Badge key={u.id} variant="secondary" className="gap-1">
              {u.display_name || u.email}
              <button type="button" onClick={() => remove(u.id)}>
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
