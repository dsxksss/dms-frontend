import { useTranslation } from 'react-i18next'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

/** 可邀请/可授予的项目角色（不含 owner——属主不经邀请/授权产生）。 */
const SELECTABLE_ROLES = ['viewer', 'contributor', 'manager'] as const
export type SelectableRole = (typeof SELECTABLE_ROLES)[number]

/**
 * 统一的项目角色下拉（自定义 Select，替代散落的原生 `<select>`）。
 * 文案走 `projects:roles.*`，触发器直接回显当前角色名（与邀请弹窗一致、稳）。
 */
export function RoleSelect({
  value,
  onChange,
  disabled,
  className,
}: {
  value: SelectableRole
  onChange: (role: SelectableRole) => void
  disabled?: boolean
  className?: string
}) {
  const { t } = useTranslation('projects')
  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v as SelectableRole)}
      disabled={disabled}
    >
      <SelectTrigger className={cn('h-8 w-32', className)}>
        {t(`roles.${value}`)}
      </SelectTrigger>
      {/* popper 定位：锚定在触发器下方、碰撞时自动翻转/平移；不受外层 `overflow-hidden`
          （如成员表 TableCard）影响——item-aligned 默认模式在被裁剪容器内会算出近 0 高度而「打不开」。 */}
      <SelectContent position="popper">
        {SELECTABLE_ROLES.map((r) => (
          <SelectItem key={r} value={r}>
            {t(`roles.${r}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
