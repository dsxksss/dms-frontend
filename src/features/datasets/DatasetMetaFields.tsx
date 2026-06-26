import { useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'

export interface DatasetMetaValue {
  tags: string[]
  author: string
  references: string[]
}

export const emptyMeta = (): DatasetMetaValue => ({
  tags: [],
  author: '',
  references: [],
})

/**
 * 数据集元数据录入：标签(chips) + 作者 + 参考文献(每行一条)。
 * 受控；后端会再做 trim/去空/去重规范化（各 ≤50 项）。复用于新建/编辑与「转数据集」。
 */
export function DatasetMetaFields({
  value,
  onChange,
}: {
  value: DatasetMetaValue
  onChange: (next: DatasetMetaValue) => void
}) {
  const { t } = useTranslation('datasets')
  const [tagDraft, setTagDraft] = useState('')

  const addTag = () => {
    const tag = tagDraft.trim()
    if (
      tag &&
      value.tags.length < 50 && // 后端各 ≤50 项，前端先拦避免静默 422
      !value.tags.some((x) => x.toLowerCase() === tag.toLowerCase())
    ) {
      onChange({ ...value, tags: [...value.tags, tag] })
    }
    setTagDraft('')
  }
  const removeTag = (tag: string) =>
    onChange({ ...value, tags: value.tags.filter((x) => x !== tag) })

  const onTagKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag()
    } else if (e.key === 'Backspace' && !tagDraft && value.tags.length) {
      removeTag(value.tags[value.tags.length - 1])
    }
  }

  return (
    <>
      <div className="space-y-1.5">
        <Label>{t('meta.tags')}</Label>
        <div className="flex flex-wrap items-center gap-1.5 rounded-[8px] border border-input px-2 py-1.5">
          {value.tags.map((tag) => (
            <Badge key={tag} variant="info" className="gap-1">
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="hover:text-destructive"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
          <input
            className="min-w-[80px] flex-1 bg-transparent text-[13px] outline-none"
            placeholder={t('meta.tagsPlaceholder')}
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={onTagKey}
            onBlur={addTag}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ds-author">{t('meta.author')}</Label>
        <Input
          id="ds-author"
          placeholder={t('meta.authorPlaceholder')}
          value={value.author}
          onChange={(e) => onChange({ ...value, author: e.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ds-refs">{t('meta.references')}</Label>
        <Textarea
          id="ds-refs"
          rows={2}
          placeholder={t('meta.referencesPlaceholder')}
          value={value.references.join('\n')}
          onChange={(e) =>
            onChange({
              ...value,
              // 后端参考文献 ≤50 项，前端先截断避免静默 422。
              references: e.target.value.split('\n').slice(0, 50),
            })
          }
        />
        <p className="text-[11px] text-muted-foreground">{t('meta.referencesHint')}</p>
      </div>
    </>
  )
}

/** 规范化提交：trim、去空。后端还会做大小写去重 + 上限校验。 */
export function normalizeMeta(v: DatasetMetaValue) {
  return {
    tags: v.tags.map((s) => s.trim()).filter(Boolean),
    author: v.author.trim(),
    references: v.references.map((s) => s.trim()).filter(Boolean),
  }
}
