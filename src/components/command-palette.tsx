import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Boxes,
  Building2,
  Database,
  FileText,
  FolderClosed,
  Loader2,
  Notebook,
  Table2,
} from 'lucide-react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { useDebounce } from '@/hooks/use-debounce'
import { useSearch } from '@/hooks/use-search'
import type { SearchHit } from '@/api/search'

/** kind → 图标 / i18n 分组名 / 跳转目标（顺序即展示顺序）。 */
const GROUPS: {
  kind: SearchHit['kind']
  icon: typeof FolderClosed
  label: string
  to: (h: SearchHit) => string
}[] = [
  { kind: 'project', icon: FolderClosed, label: 'projects', to: (h) => `/projects/${h.id}` },
  { kind: 'organization', icon: Building2, label: 'organizations', to: (h) => `/orgs/${h.id}` },
  {
    kind: 'dataset',
    icon: Database,
    label: 'datasets',
    to: (h) => `/projects/${h.project_id}/datasets/${h.id}`,
  },
  { kind: 'asset', icon: Boxes, label: 'assets', to: (h) => `/projects/${h.project_id}/registry` },
  { kind: 'data', icon: Table2, label: 'data', to: (h) => `/projects/${h.project_id}/data` },
  { kind: 'file', icon: FileText, label: 'files', to: (h) => `/projects/${h.project_id}/files` },
  {
    kind: 'notebook',
    icon: Notebook,
    label: 'notebook',
    to: (h) => `/projects/${h.project_id}/notebook`,
  },
]

/**
 * 全局命令面板：⌘K / Ctrl+K 或点顶栏搜索框打开，跨**可见项目内的内容**（项目/组织/数据集/药物资产/
 * 药物数据/文件/记录本/方案）搜索——结果由后端 `/v1/search` 按授权过滤，前端分组展示、选中即跳转。
 */
export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const debounced = useDebounce(q, 250)
  const { data, isFetching } = useSearch(debounced, open)
  const hits = data ?? []

  const close = (next: boolean) => {
    onOpenChange(next)
    if (!next) setQ('')
  }
  const go = (to: string) => {
    close(false)
    navigate(to)
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={close}
      shouldFilter={false}
      title={t('search.placeholder')}
      description={t('search.placeholder')}
    >
      <CommandInput
        value={q}
        onValueChange={setQ}
        placeholder={t('search.placeholder')}
      />
      <CommandList>
        {isFetching && (
          <div className="flex items-center gap-2 px-3 py-3 text-[13px] text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            {t('search.searching', { defaultValue: '搜索中…' })}
          </div>
        )}
        {!isFetching && hits.length === 0 && debounced.trim().length >= 2 && (
          <CommandEmpty>{t('search.empty')}</CommandEmpty>
        )}
        {GROUPS.map((g) => {
          const items = hits.filter((h) => h.kind === g.kind)
          if (items.length === 0) return null
          const Icon = g.icon
          return (
            <CommandGroup key={g.kind} heading={t(`search.${g.label}`)}>
              {items.map((h) => (
                <CommandItem
                  key={`${h.kind}:${h.id}`}
                  value={`${h.kind}:${h.id}`}
                  onSelect={() => go(g.to(h))}
                >
                  <Icon className="text-muted-foreground" />
                  <span className="truncate">{h.title || '—'}</span>
                  {h.subtitle && (
                    <span className="ml-auto truncate pl-2 text-[11px] text-muted-foreground">
                      {h.subtitle}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )
        })}
      </CommandList>
    </CommandDialog>
  )
}
