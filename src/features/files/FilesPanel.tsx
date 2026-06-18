import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  Loader2,
  Lock,
  MoreHorizontal,
  Pencil,
  Trash2,
  Unlock,
  Upload,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageHeader } from '@/components/page-header'
import { TableCard } from '@/components/data-grid'
import { EmptyState, ErrorState, TableSkeleton } from '@/components/states'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { cn } from '@/lib/utils'
import { formatBytes } from '@/lib/format'
import { roleAtLeast } from '@/lib/roles'
import { useProjectRole } from '@/hooks/use-projects'
import {
  useCreateFolder,
  useDeleteFile,
  useDeleteFolder,
  useFiles,
  useFolders,
  useMoveFile,
  useRenameFolder,
  useSetFileConfidential,
  useUploadFile,
} from '@/hooks/use-files'
import { useToastError } from '@/hooks/use-toast-error'
import {
  FILE_CATEGORIES,
  filesApi,
  type FileCategory,
  type FileItem,
  type FolderCategory,
  type FolderNode,
} from '@/api/files'
import { FileGrantsDialog } from './FileGrantsDialog'

/** 分类色（design_handoff 冻结）：[底色, 主色]。 */
const CATEGORY_TINT: Record<FileCategory, readonly [string, string]> = {
  raw_data: ['#EAF0FF', '#2F6BFF'],
  structures: ['#E7F6EC', '#15803D'],
  sequences: ['#FEF4E6', '#B45309'],
  reports: ['#F3EEFB', '#7C3AED'],
  datasets: ['#FBEAF2', '#BE185D'],
  misc: ['#EEF0F3', '#64748B'],
}

// 根目录在 Select 中的哨兵值（Radix SelectItem 不允许空串 value）。
const ROOT = '__root__'

interface Selection {
  category: FileCategory
  folder: string
}

/** 文件夹操作目标（新建子夹 / 重命名 / 删除）。 */
interface FolderOp {
  kind: 'new' | 'rename' | 'delete'
  category: FileCategory
  /** 父路径（new）或目标路径（rename/delete）。 */
  path: string
  name?: string
  totalCount?: number
}

/** 两栏文件夹树文件浏览器：左树 + 右文件列表。 */
export function FilesPanel({ projectId }: { projectId: string }) {
  const { t } = useTranslation('files')
  const folders = useFolders(projectId)
  const myRole = useProjectRole(projectId)
  const canManage = roleAtLeast(myRole, 'manager')
  const [sel, setSel] = useState<Selection>({
    category: 'raw_data',
    folder: '',
  })
  const [folderOp, setFolderOp] = useState<FolderOp | null>(null)

  return (
    <div className="px-[26px] py-[22px] max-w-[1200px]">
      <PageHeader
        title={t('title')}
        titleEn="Files"
        description={t('subtitle')}
      />

      {folders.isLoading ? (
        <TableSkeleton rows={6} />
      ) : folders.isError ? (
        <ErrorState error={folders.error} onRetry={() => folders.refetch()} />
      ) : (
        <div className="grid grid-cols-[300px_1fr] gap-4">
          <FolderTreePane
            categories={folders.data?.categories ?? []}
            selection={sel}
            onSelect={setSel}
            onFolderOp={setFolderOp}
          />
          <FileListPane
            projectId={projectId}
            selection={sel}
            canManage={canManage}
          />
        </div>
      )}

      {folderOp && (
        <FolderOpDialogs
          projectId={projectId}
          op={folderOp}
          onClose={() => setFolderOp(null)}
        />
      )}
    </div>
  )
}

/* ------------------------- 左栏：文件夹树 ------------------------- */

function FolderTreePane({
  categories,
  selection,
  onSelect,
  onFolderOp,
}: {
  categories: FolderCategory[]
  selection: Selection
  onSelect: (s: Selection) => void
  onFolderOp: (op: FolderOp) => void
}) {
  const { t } = useTranslation('files')
  // 默认展开当前选中分类。
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    [selection.category]: true,
  })
  const toggle = (key: string) =>
    setExpanded((e) => ({ ...e, [key]: !e[key] }))

  // 后端只返回有内容的分类；其余 6 类也要作为空根展示。
  const allCats: FolderCategory[] = FILE_CATEGORIES.map(
    (cat) =>
      categories.find((c) => c.category === cat) ?? {
        category: cat,
        file_count: 0,
        total_count: 0,
        folders: [],
      },
  )

  return (
    <TableCard className="h-fit">
      <div className="border-b bg-surface-2 px-3.5 py-[11px]">
        <span className="th">{t('folder.tree')}</span>
      </div>
      <div className="p-1.5">
        {allCats.map((cat) => {
          const [bg, fg] = CATEGORY_TINT[cat.category]
          const open = !!expanded[cat.category]
          const isSelected =
            selection.category === cat.category && selection.folder === ''
          return (
            <div key={cat.category}>
              <div
                className={cn(
                  'group flex items-center gap-1 rounded-[9px] px-1.5 py-1.5',
                  isSelected ? 'bg-accent' : 'hover:bg-surface-2',
                )}
              >
                <button
                  type="button"
                  className="flex size-5 shrink-0 items-center justify-center text-muted-foreground"
                  onClick={() => toggle(cat.category)}
                >
                  {open ? (
                    <ChevronDown className="size-4" />
                  ) : (
                    <ChevronRight className="size-4" />
                  )}
                </button>
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-2"
                  onClick={() =>
                    onSelect({ category: cat.category, folder: '' })
                  }
                >
                  <span
                    className="flex size-[22px] shrink-0 items-center justify-center rounded-[7px]"
                    style={{ background: bg, color: fg }}
                  >
                    {open ? (
                      <FolderOpen className="size-3.5" />
                    ) : (
                      <Folder className="size-3.5" />
                    )}
                  </span>
                  <span
                    className={cn(
                      'truncate text-[13px]',
                      isSelected ? 'font-bold text-brand' : 'font-semibold',
                    )}
                  >
                    {t(`category.${cat.category}`)}
                  </span>
                  <CountBadge count={cat.total_count} />
                </button>
                <FolderMenu
                  onNew={() =>
                    onFolderOp({
                      kind: 'new',
                      category: cat.category,
                      path: '',
                    })
                  }
                />
              </div>
              {open &&
                cat.folders.map((node) => (
                  <FolderTreeNode
                    key={node.path}
                    category={cat.category}
                    node={node}
                    depth={1}
                    selection={selection}
                    expanded={expanded}
                    onToggle={toggle}
                    onSelect={onSelect}
                    onFolderOp={onFolderOp}
                  />
                ))}
            </div>
          )
        })}
      </div>
    </TableCard>
  )
}

function FolderTreeNode({
  category,
  node,
  depth,
  selection,
  expanded,
  onToggle,
  onSelect,
  onFolderOp,
}: {
  category: FileCategory
  node: FolderNode
  depth: number
  selection: Selection
  expanded: Record<string, boolean>
  onToggle: (key: string) => void
  onSelect: (s: Selection) => void
  onFolderOp: (op: FolderOp) => void
}) {
  const key = `${category}:${node.path}`
  const open = !!expanded[key]
  const hasChildren = node.children.length > 0
  const isSelected =
    selection.category === category && selection.folder === node.path

  return (
    <div>
      <div
        className={cn(
          'group flex items-center gap-1 rounded-[9px] py-1.5 pr-1.5',
          isSelected ? 'bg-accent' : 'hover:bg-surface-2',
        )}
        style={{ paddingLeft: 8 + depth * 16 }}
      >
        <button
          type="button"
          className={cn(
            'flex size-5 shrink-0 items-center justify-center text-muted-foreground',
            !hasChildren && 'invisible',
          )}
          onClick={() => onToggle(key)}
        >
          {open ? (
            <ChevronDown className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )}
        </button>
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2"
          onClick={() => onSelect({ category, folder: node.path })}
        >
          <Folder className="size-3.5 shrink-0 text-muted-foreground" />
          <span
            className={cn(
              'truncate text-[12.5px]',
              isSelected ? 'font-bold text-brand' : 'font-medium',
            )}
          >
            {node.name}
          </span>
          <CountBadge count={node.total_count} />
        </button>
        <FolderMenu
          onNew={() =>
            onFolderOp({ kind: 'new', category, path: node.path })
          }
          onRename={() =>
            onFolderOp({
              kind: 'rename',
              category,
              path: node.path,
              name: node.name,
            })
          }
          onDelete={() =>
            onFolderOp({
              kind: 'delete',
              category,
              path: node.path,
              name: node.name,
              totalCount: node.total_count,
            })
          }
        />
      </div>
      {open &&
        node.children.map((child) => (
          <FolderTreeNode
            key={child.path}
            category={category}
            node={child}
            depth={depth + 1}
            selection={selection}
            expanded={expanded}
            onToggle={onToggle}
            onSelect={onSelect}
            onFolderOp={onFolderOp}
          />
        ))}
    </div>
  )
}

function CountBadge({ count }: { count: number }) {
  if (!count) return null
  return (
    <span className="ml-auto rounded-full bg-surface-2 px-1.5 py-0.5 text-[10.5px] font-semibold text-muted-foreground tabular-nums">
      {count}
    </span>
  )
}

function FolderMenu({
  onNew,
  onRename,
  onDelete,
}: {
  onNew: () => void
  onRename?: () => void
  onDelete?: () => void
}) {
  const { t } = useTranslation('files')
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          className="opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onNew}>
          <FolderPlus className="size-4" />
          {t('folder.newSub')}
        </DropdownMenuItem>
        {onRename && (
          <DropdownMenuItem onClick={onRename}>
            <Pencil className="size-4" />
            {t('folder.rename')}
          </DropdownMenuItem>
        )}
        {onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              <Trash2 className="size-4" />
              {t('folder.delete')}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/* ------------------------- 右栏：文件列表 ------------------------- */

function FileListPane({
  projectId,
  selection,
  canManage,
}: {
  projectId: string
  selection: Selection
  canManage: boolean
}) {
  const { t } = useTranslation('files')
  const files = useFiles(projectId, {
    category: selection.category,
    folder: selection.folder,
  })
  const upload = useUploadFile(projectId)
  const toastError = useToastError()
  const rows = files.data?.items ?? []

  const onPick = (file: File | undefined) => {
    if (!file) return
    upload
      .mutateAsync({
        file,
        category: selection.category,
        folder: selection.folder || undefined,
      })
      .then(() => toast.success(t('uploaded')))
      .catch(toastError)
  }

  const crumbs = selection.folder ? selection.folder.split('/') : []

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1.5 text-[13px]">
          <span className="font-bold">
            {t(`category.${selection.category}`)}
          </span>
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1.5 text-muted-foreground">
              <ChevronRight className="size-3.5" />
              <span
                className={cn(
                  i === crumbs.length - 1 && 'font-semibold text-foreground',
                )}
              >
                {c}
              </span>
            </span>
          ))}
        </div>
        <label
          className={cn(
            'shrink-0 cursor-pointer',
            upload.isPending && 'pointer-events-none',
          )}
        >
          <input
            type="file"
            className="hidden"
            disabled={upload.isPending}
            onChange={(e) => {
              onPick(e.target.files?.[0])
              e.target.value = ''
            }}
          />
          <Button asChild disabled={upload.isPending}>
            <span>
              {upload.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              {t('folder.uploadHere')}
            </span>
          </Button>
        </label>
      </div>

      {files.isLoading ? (
        <TableSkeleton rows={5} />
      ) : files.isError ? (
        <ErrorState error={files.error} onRetry={() => files.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState title={t('folder.emptyHere')} hint={t('emptyDesc')} />
      ) : (
        <TableCard>
          {rows.map((f) => (
            <FileRow
              key={f.id}
              projectId={projectId}
              file={f}
              canManage={canManage}
            />
          ))}
        </TableCard>
      )}
    </div>
  )
}

function FileRow({
  projectId,
  file,
  canManage,
}: {
  projectId: string
  file: FileItem
  canManage: boolean
}) {
  const { t } = useTranslation(['files', 'common'])
  const setConfidential = useSetFileConfidential(projectId)
  const del = useDeleteFile(projectId)
  const toastError = useToastError()
  const [moveOpen, setMoveOpen] = useState(false)
  const [grantsOpen, setGrantsOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const toggleConfidential = () =>
    setConfidential
      .mutateAsync({ id: file.id, confidential: !file.confidential })
      .then(() => toast.success(t('confidentialChanged')))
      .catch(toastError)

  return (
    <div className="flex items-center gap-3 border-b border-divider px-[18px] py-3 last:border-b-0">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-accent text-brand">
        <FileText className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold">{file.name}</div>
        <div className="text-[11.5px] text-muted-foreground">
          {formatBytes(file.size)}
        </div>
      </div>
      {file.confidential && (
        <span
          className="lockchip"
          title={t('confidentialHint')}
          onClick={() => canManage && setGrantsOpen(true)}
        >
          <Lock className="size-3" />
          {t('badge')}
        </span>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => filesApi.download(projectId, file.id, file.name)}
          >
            <Download className="size-4" />
            {t('common:actions.download')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setMoveOpen(true)}>
            <FolderPlus className="size-4" />
            {t('folder.move')}
          </DropdownMenuItem>
          {canManage && (
            <DropdownMenuItem onClick={toggleConfidential}>
              {file.confidential ? (
                <Unlock className="size-4" />
              ) : (
                <Lock className="size-4" />
              )}
              {file.confidential
                ? t('unsetConfidential')
                : t('setConfidential')}
            </DropdownMenuItem>
          )}
          {canManage && file.confidential && (
            <DropdownMenuItem onClick={() => setGrantsOpen(true)}>
              <Users className="size-4" />
              {t('grants.manage')}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4" />
            {t('common:actions.delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <MoveFileDialog
        projectId={projectId}
        file={file}
        open={moveOpen}
        onOpenChange={setMoveOpen}
      />
      <FileGrantsDialog
        projectId={projectId}
        fileId={file.id}
        open={grantsOpen}
        onOpenChange={setGrantsOpen}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t('deleteTitle')}
        description={t('deleteDesc', { name: file.name })}
        destructive
        confirmText={t('common:actions.delete')}
        loading={del.isPending}
        onConfirm={() =>
          del
            .mutateAsync(file.id)
            .then(() => {
              toast.success(t('deleted'))
              setDeleteOpen(false)
            })
            .catch(toastError)
        }
      />
    </div>
  )
}

/* ------------------------- 文件夹操作弹窗 ------------------------- */

function FolderOpDialogs({
  projectId,
  op,
  onClose,
}: {
  projectId: string
  op: FolderOp
  onClose: () => void
}) {
  const { t } = useTranslation('files')
  const create = useCreateFolder(projectId)
  const rename = useRenameFolder(projectId)
  const remove = useDeleteFolder(projectId)
  const toastError = useToastError()
  const [name, setName] = useState(op.kind === 'rename' ? op.name ?? '' : '')

  if (op.kind === 'delete') {
    const recursive = (op.totalCount ?? 0) > 0
    return (
      <ConfirmDialog
        open
        onOpenChange={(o) => !o && onClose()}
        title={t('folder.delete')}
        description={
          recursive
            ? t('folder.deleteRecursive', {
                name: op.name,
                count: op.totalCount,
              })
            : t('folder.deleteEmpty', { name: op.name })
        }
        destructive
        confirmText={t('folder.delete')}
        loading={remove.isPending}
        onConfirm={() =>
          remove
            .mutateAsync({
              category: op.category,
              path: op.path,
              recursive,
            })
            .then(() => {
              toast.success(t('folder.deleted'))
              onClose()
            })
            .catch(toastError)
        }
      />
    )
  }

  const isNew = op.kind === 'new'
  const submit = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    if (isNew) {
      const path = op.path ? `${op.path}/${trimmed}` : trimmed
      create
        .mutateAsync({ category: op.category, path })
        .then(() => {
          toast.success(t('folder.created'))
          onClose()
        })
        .catch(toastError)
    } else {
      // 重命名：同父路径下替换最后一段。
      const parent = op.path.includes('/')
        ? op.path.slice(0, op.path.lastIndexOf('/'))
        : ''
      const to = parent ? `${parent}/${trimmed}` : trimmed
      rename
        .mutateAsync({
          category: op.category,
          from_path: op.path,
          to_path: to,
        })
        .then(() => {
          toast.success(t('folder.renamed'))
          onClose()
        })
        .catch(toastError)
    }
  }

  const pending = create.isPending || rename.isPending

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>
            {isNew ? t('folder.new') : t('folder.renameTitle')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label className="text-[12.5px]">{t('folder.namePlaceholder')}</Label>
          <Input
            autoFocus
            placeholder={t('folder.namePlaceholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={!name.trim() || pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            {isNew ? t('folder.new') : t('folder.rename')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function MoveFileDialog({
  projectId,
  file,
  open,
  onOpenChange,
}: {
  projectId: string
  file: FileItem
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation('files')
  const folders = useFolders(projectId)
  const move = useMoveFile(projectId)
  const toastError = useToastError()
  const [target, setTarget] = useState<string>(file.folder)

  // 同分类下的所有文件夹（含根目录），扁平化为可选项。
  const options = useMemo(() => {
    const cat = folders.data?.categories.find(
      (c) => c.category === file.category,
    )
    const flat: { path: string; label: string }[] = [
      { path: '', label: t('folder.root') },
    ]
    const walk = (nodes: FolderNode[], depth: number) => {
      for (const n of nodes) {
        flat.push({ path: n.path, label: `${'　'.repeat(depth)}${n.name}` })
        walk(n.children, depth + 1)
      }
    }
    walk(cat?.folders ?? [], 0)
    return flat
  }, [folders.data, file.category, t])

  const submit = () =>
    move
      .mutateAsync({ fileId: file.id, folder: target })
      .then(() => {
        toast.success(t('folder.moved'))
        onOpenChange(false)
      })
      .catch(toastError)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{t('folder.moveTitle')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label className="text-[12.5px]">{t('folder.moveTo')}</Label>
          <Select
            value={target || ROOT}
            onValueChange={(v) => setTarget(v === ROOT ? '' : v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.path || ROOT} value={o.path || ROOT}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button
            onClick={submit}
            disabled={move.isPending || target === file.folder}
          >
            {move.isPending && <Loader2 className="size-4 animate-spin" />}
            {t('folder.move')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
