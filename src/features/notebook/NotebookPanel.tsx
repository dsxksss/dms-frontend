import { useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  Archive,
  ArchiveRestore,
  Bold,
  Code,
  Columns2,
  Eye,
  Heading1,
  Heading2,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  MoreHorizontal,
  Notebook,
  Pencil,
  Plus,
  Quote,
  Save,
  Table,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EmptyState, ErrorState } from '@/components/states'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { roleAtLeast } from '@/lib/roles'
import { useProjectRole } from '@/hooks/use-projects'
import {
  useArchiveNotebookEntry,
  useCreateNotebookEntry,
  useDeleteNotebookEntry,
  useNotebookEntries,
  useUpdateNotebookEntry,
} from '@/hooks/use-notebook'
import { useToastError } from '@/hooks/use-toast-error'
import { AppError } from '@/lib/errors'
import { notebookApi, type NotebookEntry } from '@/api/notebook'
import { MarkdownPreview } from './MarkdownPreview'

type View = 'edit' | 'preview' | 'split'

/** 实验记录本（ELN）：条目列表 + Markdown 编辑器 + 实时预览（对标 Benchling Notebook）。 */
export function NotebookPanel({ projectId }: { projectId: string }) {
  const { t } = useTranslation('notebook')
  const role = useProjectRole(projectId)
  const canWrite = roleAtLeast(role, 'contributor')
  const canDelete = roleAtLeast(role, 'manager')
  const [showArchived, setShowArchived] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [limit, setLimit] = useState(100)
  const query = useNotebookEntries(projectId, {
    include_archived: showArchived,
    limit,
  })
  const create = useCreateNotebookEntry(projectId)
  const toastError = useToastError()

  const entries = query.data?.items ?? []
  const total = query.data?.total ?? 0
  const selected = entries.find((e) => e.id === selectedId) ?? null

  const onNew = () =>
    create
      .mutateAsync({ title: t('untitled'), content: '' })
      .then((e) => setSelectedId(e.id))
      .catch(toastError)

  return (
    <div className="flex h-full overflow-hidden">
      {/* entry list */}
      <aside className="flex w-[280px] flex-none flex-col border-r bg-card">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <Notebook className="size-[18px] text-brand" />
          <span className="flex-1 text-[14px] font-bold">{t('title')}</span>
          {canWrite && (
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={onNew}
              disabled={create.isPending}
              aria-label={t('new')}
            >
              {create.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
            </Button>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-1.5">
          {query.isLoading ? (
            <div className="space-y-1.5 p-1.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 rounded-lg" />
              ))}
            </div>
          ) : query.isError ? (
            <ErrorState error={query.error} onRetry={() => query.refetch()} />
          ) : entries.length === 0 ? (
            <p className="px-3 py-8 text-center text-[12.5px] text-muted-foreground">
              {t('list.empty')}
            </p>
          ) : (
            entries.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => setSelectedId(e.id)}
                className={cn(
                  'mb-0.5 flex w-full items-center gap-2 rounded-[9px] px-2.5 py-2 text-left transition',
                  selectedId === e.id ? 'bg-accent' : 'hover:bg-surface-2',
                )}
              >
                <span
                  className={cn(
                    'min-w-0 flex-1 truncate text-[13px]',
                    selectedId === e.id ? 'font-bold text-brand' : 'font-medium',
                  )}
                >
                  {e.title || t('untitled')}
                </span>
                {e.archived && (
                  <Archive className="size-3.5 shrink-0 text-muted-foreground" />
                )}
              </button>
            ))
          )}
          {entries.length < total && (
            <button
              type="button"
              onClick={() => setLimit((l) => l + 100)}
              disabled={query.isFetching}
              className="mt-1 w-full rounded-[9px] px-2.5 py-2 text-center text-[12px] font-semibold text-muted-foreground transition hover:bg-surface-2 hover:text-foreground disabled:opacity-50"
            >
              {t('list.loadMore', { defaultValue: '加载更多' })} ({entries.length}/
              {total})
            </button>
          )}
        </div>

        <div className="border-t px-3 py-2">
          <button
            type="button"
            onClick={() => setShowArchived((v) => !v)}
            className={cn(
              'text-[12px] font-semibold transition',
              showArchived ? 'text-brand' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t('showArchived')}
          </button>
        </div>
      </aside>

      {/* editor */}
      <main className="flex min-w-0 flex-1 flex-col">
        {selected ? (
          <EntryEditor
            key={selected.id}
            projectId={projectId}
            entry={selected}
            canWrite={canWrite}
            canDelete={canDelete}
            onDeleted={() => setSelectedId(null)}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center p-8">
            <EmptyState
              title={t('empty.title')}
              hint={t('empty.hint')}
              action={
                canWrite && (
                  <Button onClick={onNew} disabled={create.isPending}>
                    <Plus className="size-4" />
                    {t('new')}
                  </Button>
                )
              }
            />
          </div>
        )}
      </main>
    </div>
  )
}

function EntryEditor({
  projectId,
  entry,
  canWrite,
  canDelete,
  onDeleted,
}: {
  projectId: string
  entry: NotebookEntry
  canWrite: boolean
  canDelete: boolean
  onDeleted: () => void
}) {
  const { t } = useTranslation('notebook')
  const update = useUpdateNotebookEntry(projectId, entry.id)
  const del = useDeleteNotebookEntry(projectId)
  const archive = useArchiveNotebookEntry(projectId)
  const toastError = useToastError()
  const taRef = useRef<HTMLTextAreaElement>(null)

  const [title, setTitle] = useState(entry.title)
  const [content, setContent] = useState(entry.content)
  const [version, setVersion] = useState(entry.version)
  const [dirty, setDirty] = useState(false)
  const [view, setView] = useState<View>('split')
  const [delOpen, setDelOpen] = useState(false)

  // 409 乐观锁冲突：拉服务端最新版本号，提示用户确认后再次保存（以其内容覆盖）。
  const onConflict = async () => {
    try {
      const latest = await notebookApi.get(projectId, entry.id)
      setVersion(latest.version)
    } catch {
      /* 拉取最新失败则保持原 version，下次保存仍会 409 */
    }
    toast.warning(t('conflict'))
  }

  const save = () => {
    if (!dirty) return
    update
      .mutateAsync({ title, content, version })
      .then((e) => {
        setVersion(e.version)
        setDirty(false)
        toast.success(t('saved'))
      })
      .catch((e) => {
        if (e instanceof AppError && e.status === 409) onConflict()
        else toastError(e)
      })
  }

  const onArchive = () =>
    archive
      .mutateAsync({ id: entry.id, archived: !entry.archived })
      .then(() => toast.success(t(entry.archived ? 'unarchived' : 'archivedDone')))
      .catch(toastError)

  /** 在光标处插入/包裹 Markdown 语法。 */
  const apply = (kind: string) => {
    const ta = taRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const sel = content.slice(start, end)
    let before = ''
    let after = ''
    let placeholder = ''
    let linePrefix = ''
    switch (kind) {
      case 'bold':
        before = '**'
        after = '**'
        placeholder = t('toolbar.bold')
        break
      case 'italic':
        before = '*'
        after = '*'
        placeholder = t('toolbar.italic')
        break
      case 'code':
        before = '`'
        after = '`'
        placeholder = 'code'
        break
      case 'link':
        before = '['
        after = '](https://)'
        placeholder = t('toolbar.link')
        break
      case 'h1':
        linePrefix = '# '
        break
      case 'h2':
        linePrefix = '## '
        break
      case 'ul':
        linePrefix = '- '
        break
      case 'ol':
        linePrefix = '1. '
        break
      case 'quote':
        linePrefix = '> '
        break
      case 'table':
        before =
          '\n| A | B |\n| --- | --- |\n| 1 | 2 |\n'
        break
    }

    let next: string
    let caret: number
    if (linePrefix) {
      const lineStart = content.lastIndexOf('\n', start - 1) + 1
      next = content.slice(0, lineStart) + linePrefix + content.slice(lineStart)
      caret = end + linePrefix.length
    } else {
      const inner = sel || placeholder
      next = content.slice(0, start) + before + inner + after + content.slice(end)
      caret = start + before.length + inner.length
    }
    setContent(next)
    setDirty(true)
    setTimeout(() => {
      ta.focus()
      ta.setSelectionRange(caret, caret)
    }, 0)
  }

  const TOOLBAR = [
    { k: 'bold', icon: <Bold className="size-4" /> },
    { k: 'italic', icon: <Italic className="size-4" /> },
    { k: 'h1', icon: <Heading1 className="size-4" /> },
    { k: 'h2', icon: <Heading2 className="size-4" /> },
    { k: 'ul', icon: <List className="size-4" /> },
    { k: 'ol', icon: <ListOrdered className="size-4" /> },
    { k: 'quote', icon: <Quote className="size-4" /> },
    { k: 'code', icon: <Code className="size-4" /> },
    { k: 'link', icon: <Link2 className="size-4" /> },
    { k: 'table', icon: <Table className="size-4" /> },
  ]

  const VIEWS: { k: View; icon: ReactNode }[] = [
    { k: 'edit', icon: <Pencil className="size-4" /> },
    { k: 'split', icon: <Columns2 className="size-4" /> },
    { k: 'preview', icon: <Eye className="size-4" /> },
  ]

  return (
    <div className="flex h-full flex-col">
      {/* header */}
      <div className="flex items-center gap-3 border-b px-5 py-3">
        <Input
          value={title}
          disabled={!canWrite}
          onChange={(e) => {
            setTitle(e.target.value)
            setDirty(true)
          }}
          className="h-auto flex-1 border-0 bg-transparent px-0 text-[18px] font-extrabold shadow-none focus-visible:ring-0"
          placeholder={t('untitled')}
        />
        <span className="mono shrink-0 text-[11px] text-muted-foreground">
          v{version}
        </span>
        {dirty && (
          <Badge variant="warning" className="shrink-0">
            {t('unsaved')}
          </Badge>
        )}
        {entry.archived && (
          <Badge variant="neutral" className="shrink-0">
            {t('archived')}
          </Badge>
        )}
        {/* view toggle */}
        <div className="flex shrink-0 items-center rounded-[9px] border p-0.5">
          {VIEWS.map((v) => (
            <button
              key={v.k}
              type="button"
              onClick={() => setView(v.k)}
              className={cn(
                'flex size-7 items-center justify-center rounded-[7px] transition',
                view === v.k
                  ? 'bg-accent text-brand'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              aria-label={t(`view.${v.k}`)}
            >
              {v.icon}
            </button>
          ))}
        </div>
        {canWrite && (
          <Button onClick={save} disabled={!dirty || update.isPending}>
            {update.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {t('save')}
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canWrite && (
              <DropdownMenuItem onClick={onArchive}>
                {entry.archived ? (
                  <ArchiveRestore className="size-4" />
                ) : (
                  <Archive className="size-4" />
                )}
                {entry.archived ? t('unarchive') : t('archive')}
              </DropdownMenuItem>
            )}
            {canDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setDelOpen(true)}
                >
                  <Trash2 className="size-4" />
                  {t('delete')}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* toolbar */}
      {canWrite && view !== 'preview' && (
        <div className="flex items-center gap-0.5 border-b bg-surface-2 px-4 py-1.5">
          {TOOLBAR.map((b) => (
            <button
              key={b.k}
              type="button"
              onClick={() => apply(b.k)}
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-card hover:text-foreground"
              aria-label={t(`toolbar.${b.k}`, { defaultValue: b.k })}
            >
              {b.icon}
            </button>
          ))}
        </div>
      )}

      {/* body */}
      <div className="flex min-h-0 flex-1">
        {view !== 'preview' && (
          <textarea
            ref={taRef}
            value={content}
            disabled={!canWrite}
            onChange={(e) => {
              setContent(e.target.value)
              setDirty(true)
            }}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault()
                save()
              }
            }}
            placeholder={t('placeholder')}
            spellCheck={false}
            className={cn(
              'mono min-h-0 resize-none overflow-auto bg-card px-6 py-5 text-[13px] leading-relaxed outline-none',
              view === 'split' ? 'w-1/2 border-r' : 'flex-1',
            )}
          />
        )}
        {view !== 'edit' && (
          <div
            className={cn(
              'min-h-0 overflow-auto px-6 py-5',
              view === 'split' ? 'w-1/2' : 'flex-1',
            )}
          >
            {content.trim() ? (
              <MarkdownPreview content={content} />
            ) : (
              <p className="text-[12.5px] text-muted-foreground italic">
                {t('previewEmpty')}
              </p>
            )}
          </div>
        )}
      </div>

      {/* NotebookEntry 无时间戳字段，故展示真实的保存状态 + 版本，不伪造日期。 */}
      <div className="border-t px-5 py-1.5 text-[11px] text-muted-foreground">
        {dirty ? t('unsaved') : t('saved')} · v{version}
      </div>

      <ConfirmDialog
        open={delOpen}
        onOpenChange={setDelOpen}
        title={t('deleteTitle')}
        description={t('deleteDesc', { title: entry.title || t('untitled') })}
        destructive
        confirmText={t('delete')}
        loading={del.isPending}
        onConfirm={() =>
          del
            .mutateAsync({ id: entry.id, version })
            .then(() => {
              toast.success(t('deleted'))
              setDelOpen(false)
              onDeleted()
            })
            .catch((e) => {
              if (e instanceof AppError && e.status === 409) {
                setDelOpen(false)
                onConflict()
              } else toastError(e)
            })
        }
      />
    </div>
  )
}
