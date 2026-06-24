import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Plus, Rocket, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { isOnboardDone } from './flags'

const DISMISS_KEY = 'dms-checklist-dismissed'

/**
 * 「快速上手」任务清单：① 建项目 ② 录数据资产 ③ 生成数据集。
 * 完成态自动检测（建项目=有项目；后两步由对应操作打 localStorage 标记）；
 * 全部完成或手动关闭后不再显示。
 */
export function GettingStarted({
  hasProject,
  onCreateProject,
}: {
  hasProject: boolean
  onCreateProject: () => void
}) {
  const { t } = useTranslation('onboarding')
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISS_KEY) === '1',
  )

  const steps = [
    { done: hasProject, label: t('checklist.s1'), desc: t('checklist.s1d') },
    { done: isOnboardDone('asset'), label: t('checklist.s2'), desc: t('checklist.s2d') },
    {
      done: isOnboardDone('dataset'),
      label: t('checklist.s3'),
      desc: t('checklist.s3d'),
    },
  ]
  const doneCount = steps.filter((s) => s.done).length

  if (dismissed || doneCount === steps.length) return null

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }

  return (
    <div className="card-shadow mb-5 rounded-[14px] border bg-card p-5">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-accent text-brand">
          <Rocket className="size-[18px]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-[14.5px] font-extrabold">{t('checklist.title')}</h3>
            <span className="text-[12px] font-semibold text-muted-foreground">
              {doneCount} / {steps.length}
            </span>
          </div>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {t('checklist.subtitle')}
          </p>
        </div>
        <button
          onClick={dismiss}
          aria-label="dismiss"
          className="shrink-0 text-muted-foreground/60 transition hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* 进度条 */}
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#EEF0F3]">
        <div
          className="h-full rounded-full bg-brand transition-all"
          style={{ width: `${(doneCount / steps.length) * 100}%` }}
        />
      </div>

      <ol className="mt-3.5 space-y-2.5">
        {steps.map((s, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <span
              className={cn(
                'mt-px flex size-[18px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                s.done
                  ? 'bg-[#E7F6EC] text-[#15803D]'
                  : 'bg-[#EEF0F3] text-muted-foreground',
              )}
            >
              {s.done ? <Check className="size-3" /> : i + 1}
            </span>
            <div className="min-w-0">
              <div
                className={cn(
                  'text-[13px] font-semibold',
                  s.done && 'text-muted-foreground line-through',
                )}
              >
                {s.label}
              </div>
              {!s.done && (
                <div className="text-[11.5px] text-muted-foreground">{s.desc}</div>
              )}
            </div>
          </li>
        ))}
      </ol>

      {!hasProject && (
        <Button className="mt-4" onClick={onCreateProject}>
          <Plus className="size-4" />
          {t('checklist.cta')}
        </Button>
      )}
    </div>
  )
}
