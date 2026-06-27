import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { extOf, filesApi, type FileItem } from '@/api/files'

type PreviewKind = 'image' | 'pdf' | 'text' | 'none'

const IMAGE = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'avif']
const TEXT = [
  'txt',
  'md',
  'markdown',
  'csv',
  'tsv',
  'json',
  'xml',
  'yaml',
  'yml',
  'log',
  'tex',
]

export function previewKind(name: string): PreviewKind {
  const ext = extOf(name)
  if (IMAGE.includes(ext)) return 'image'
  if (ext === 'pdf') return 'pdf'
  if (TEXT.includes(ext)) return 'text'
  return 'none'
}

/** 该文件能否在线预览（决定点击行为：可预览→开预览，否则→下载）。 */
export function isPreviewable(name: string): boolean {
  return previewKind(name) !== 'none'
}

const MAX_TEXT_ROWS = 500

/** csv/tsv → 表格；json → 美化；其余 → 等宽原文。 */
function PreviewText({ name, text }: { name: string; text: string }) {
  const { t } = useTranslation('files')
  const ext = extOf(name)

  if (ext === 'csv' || ext === 'tsv') {
    const sep = ext === 'tsv' ? '\t' : ','
    const lines = text.split(/\r?\n/).filter((l) => l.length > 0)
    const rows = lines.slice(0, MAX_TEXT_ROWS).map((r) => r.split(sep))
    const [head, ...body] = rows
    return (
      <div className="overflow-auto">
        <table className="w-full border-collapse text-[12px]">
          {head && (
            <thead className="sticky top-0 bg-surface-2">
              <tr>
                {head.map((c, i) => (
                  <th
                    key={i}
                    className="border border-divider px-2 py-1 text-left font-semibold"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {body.map((r, ri) => (
              <tr key={ri} className="even:bg-surface-1">
                {r.map((c, ci) => (
                  <td key={ci} className="border border-divider px-2 py-1 align-top">
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {lines.length > MAX_TEXT_ROWS && (
          <p className="mt-2 text-[12px] text-muted-foreground">
            {t('browser.previewTruncated', { count: MAX_TEXT_ROWS })}
          </p>
        )}
      </div>
    )
  }

  let body = text
  if (ext === 'json') {
    try {
      body = JSON.stringify(JSON.parse(text), null, 2)
    } catch {
      /* 非法 JSON：原样展示 */
    }
  }
  return (
    <pre className="mono whitespace-pre-wrap break-words text-[12px] leading-relaxed">
      {body}
    </pre>
  )
}

/**
 * 文件在线预览：图片 / PDF / 文本（csv 表格、json 美化）。内容经鉴权取 Blob 构造对象 URL，
 * 关闭时回收。不可预览类型给出下载入口。
 */
export function FilePreviewDialog({
  projectId,
  file,
  onClose,
}: {
  projectId: string
  file: FileItem | null
  onClose: () => void
}) {
  const { t } = useTranslation(['files', 'common'])
  const [url, setUrl] = useState<string | null>(null)
  const [text, setText] = useState<string | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')

  const kind = file ? previewKind(file.name) : 'none'

  useEffect(() => {
    if (!file) return
    let cancelled = false
    let objectUrl: string | null = null
    setState('loading')
    setUrl(null)
    setText(null)

    filesApi
      .fetchBlob(projectId, file.id)
      .then(async (blob) => {
        if (cancelled) return
        if (kind === 'text') {
          const txt = await blob.text()
          if (!cancelled) {
            setText(txt)
            setState('ready')
          }
        } else {
          objectUrl = URL.createObjectURL(blob)
          if (!cancelled) {
            setUrl(objectUrl)
            setState('ready')
          }
        }
      })
      .catch(() => {
        if (!cancelled) setState('error')
      })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [projectId, file, kind])

  const onDownload = () => file && filesApi.download(projectId, file.id, file.name)

  return (
    <Dialog open={!!file} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[88vh] flex-col gap-3 sm:max-w-[920px]">
        <DialogHeader>
          <DialogTitle className="truncate pr-6">{file?.name}</DialogTitle>
        </DialogHeader>

        <div
          className={cn(
            'min-h-[320px] flex-1 overflow-auto rounded-md border border-divider bg-surface-1 p-3',
            kind === 'image' && 'flex items-center justify-center',
          )}
        >
          {state === 'loading' && (
            <div className="flex h-[320px] items-center justify-center text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          )}
          {state === 'error' && (
            <div className="flex h-[320px] flex-col items-center justify-center gap-3 text-[13px] text-muted-foreground">
              {t('common:error.server')}
            </div>
          )}
          {state === 'ready' && kind === 'image' && url && (
            <img
              src={url}
              alt={file?.name}
              className="max-h-[70vh] max-w-full object-contain"
            />
          )}
          {state === 'ready' && kind === 'pdf' && url && (
            <iframe src={url} title={file?.name} className="h-[70vh] w-full" />
          )}
          {state === 'ready' && kind === 'text' && text !== null && file && (
            <PreviewText name={file.name} text={text} />
          )}
          {state === 'ready' && kind === 'none' && (
            <div className="flex h-[320px] items-center justify-center text-[13px] text-muted-foreground">
              {t('browser.previewUnsupported')}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onDownload}>
            <Download className="size-4" />
            {t('common:actions.download')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
