import type { ReactNode } from 'react'
import { useEnTitle } from '@/hooks/use-en-title'

export function PageHeader({
  title,
  titleEn,
  titleI18n,
  description,
  actions,
}: {
  title: ReactNode
  /** 双语副标（中文界面下的英文注，复刻原型「数据资产 Data Assets」）。 */
  titleEn?: ReactNode
  /** 由 i18n key 自动取英文副标（中文界面生效）。优先级低于显式 titleEn。 */
  titleI18n?: { key: string; ns?: string }
  description?: ReactNode
  actions?: ReactNode
}) {
  const enFromKey = useEnTitle(titleI18n?.ns)
  const en = titleEn ?? (titleI18n ? enFromKey(titleI18n.key) : undefined)

  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-1.5">
        <h1 className="text-[23px] font-extrabold tracking-tight">
          {title}
          {en && (
            <span className="text-muted-foreground ml-2 text-[17px] font-semibold">
              {en}
            </span>
          )}
        </h1>
        {description && (
          <p className="text-muted-foreground text-[13px]">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2.5">{actions}</div>}
    </div>
  )
}
