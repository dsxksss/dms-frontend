import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { UserAvatar } from '@/components/user-avatar'
import { cn } from '@/lib/utils'
import { useDebounce } from '@/hooks/use-debounce'
import { useUserSearch } from '@/hooks/use-membership'

/**
 * 可复用的「目录用户多选」：搜索框 + 结果列表（头像/姓名/邮箱 + 勾选）。
 * 选中态为受控 string[]（用户 id），由父组件持有并通过 onChange 回写。
 * `disabledIds` 命中的用户**灰显、不可选**（右侧显示 `disabledLabel`，如「已是成员」），
 * 与 FileGrantsDialog 的「已授权」范式一致——避免对已处于目标状态的人重复操作。
 */
export function UserPicker({
  selected,
  onChange,
  disabledIds,
  disabledLabel,
}: {
  selected: string[]
  onChange: (ids: string[]) => void
  disabledIds?: Set<string>
  disabledLabel?: string
}) {
  const { t } = useTranslation('membership')
  const [search, setSearch] = useState('')
  const debounced = useDebounce(search, 300)
  // 打开即列出公司目录用户（空查询也拉），可直接勾选；输入则过滤。
  const results = useUserSearch(debounced, { listAll: true, limit: 50 })
  const rows = results.data ?? []

  const toggle = (id: string) => {
    onChange(
      selected.includes(id)
        ? selected.filter((x) => x !== id)
        : [...selected, id],
    )
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute top-2.5 left-3 size-[15px] text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder={t('userPicker.placeholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="max-h-[252px] min-h-[120px] overflow-auto">
        {rows.map((u) => {
          const on = selected.includes(u.id)
          const disabled = disabledIds?.has(u.id) ?? false
          if (disabled) {
            // 已处于目标状态（如已是成员）：灰显、不可选，右侧给出说明标签。
            return (
              <div
                key={u.id}
                className="flex w-full items-center gap-2.5 rounded-[9px] px-1.5 py-2 opacity-60"
              >
                <UserAvatar
                  name={u.display_name || u.email}
                  seed={u.id}
                  size={32}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold">
                    {u.display_name || u.email.split('@')[0]}
                  </div>
                  <div className="truncate text-[11.5px] text-muted-foreground">
                    {u.email}
                  </div>
                </div>
                {disabledLabel && (
                  <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#15803D]">
                    <Check className="size-3.5" />
                    {disabledLabel}
                  </span>
                )}
              </div>
            )
          }
          return (
            <button
              type="button"
              key={u.id}
              onClick={() => toggle(u.id)}
              className="flex w-full items-center gap-2.5 rounded-[9px] px-1.5 py-2 text-left hover:bg-surface-2"
            >
              <UserAvatar
                name={u.display_name || u.email}
                seed={u.id}
                size={32}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold">
                  {u.display_name || u.email.split('@')[0]}
                </div>
                <div className="truncate text-[11.5px] text-muted-foreground">
                  {u.email}
                </div>
              </div>
              <span
                className={cn(
                  'flex size-5 items-center justify-center rounded-md border',
                  on ? 'border-brand bg-brand text-white' : 'border-[#c7cdd8]',
                )}
              >
                {on && <Check className="size-3" />}
              </span>
            </button>
          )
        })}
        {rows.length === 0 && (
          <p className="py-8 text-center text-[12.5px] text-muted-foreground">
            {results.isLoading
              ? t('userPicker.hint')
              : debounced.trim()
                ? t('userPicker.empty')
                : t('userPicker.emptyDirectory')}
          </p>
        )}
      </div>
    </div>
  )
}
