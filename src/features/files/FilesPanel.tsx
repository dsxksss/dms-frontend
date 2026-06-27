import {
  Fragment,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ChevronRight,
  Database,
  Download,
  Eye,
  File,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileType,
  FlaskConical,
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
import { Checkbox } from '@/components/ui/checkbox'
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
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/page-header'
import { EmptyState, ErrorState, TableSkeleton } from '@/components/states'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { cn } from '@/lib/utils'
import { formatBytes } from '@/lib/format'
import { roleAtLeast } from '@/lib/roles'
import { useProjectRole } from '@/hooks/use-projects'
import { useDatasets, useDeleteDataset } from '@/hooks/use-datasets'
import type { Dataset } from '@/api/datasets'
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
  ALLOWED_EXT,
  extOf,
  FILE_CATEGORIES,
  filesApi,
  foldersApi,
  type FileCategory,
  type FileItem,
  type FolderNode,
} from '@/api/files'
import { FileGrantsDialog } from './FileGrantsDialog'
import { collectDropped, dndHasFiles, runPool } from './drop-upload'
import { FilePreviewDialog, isPreviewable } from './FilePreviewDialog'

const ROOT = '__root__'

// 页面内文件拖拽（移动到其他文件夹）用的自定义 MIME，区别于 OS 文件拖入（types 含 'Files'）。
const DMS_FILE_MIME = 'application/x-dms-file-id'
const DMS_FOLDER_MIME = 'application/x-dms-file-folder'

/** 拖拽数据是否为页面内的文件（移动），而非 OS 文件（上传）。 */
function dndHasInternalFile(e: { dataTransfer: DataTransfer | null }): boolean {
  return Array.from(e.dataTransfer?.types ?? []).includes(DMS_FILE_MIME)
}

/** 按扩展名取文件图标元素（仅形状区分类型，颜色统一中性灰）。 */
function fileIcon(name: string): ReactNode {
  const ext = extOf(name)
  const c = 'size-4'
  if (['csv', 'tsv', 'xlsx', 'xls', 'parquet'].includes(ext))
    return <FileSpreadsheet className={c} />
  if (['pdf', 'doc', 'docx', 'txt', 'md', 'rtf'].includes(ext))
    return <FileText className={c} />
  if (['fasta', 'fa', 'fastq', 'fq', 'gb', 'gbk'].includes(ext))
    return <FileType className={c} />
  if (['sdf', 'mol', 'mol2', 'pdb', 'cif'].includes(ext))
    return <FlaskConical className={c} />
  if (['png', 'jpg', 'jpeg', 'svg', 'gif', 'webp', 'bmp'].includes(ext))
    return <FileImage className={c} />
  if (['json', 'xml', 'yaml', 'yml', 'toml'].includes(ext))
    return <FileCode className={c} />
  return <File className={c} />
}

/** 文件夹操作目标（新建子夹 / 重命名 / 删除）。 */
interface FolderOp {
  kind: 'new' | 'rename' | 'delete'
  category: FileCategory
  path: string
  name?: string
  totalCount?: number
}

/** 拖放区域事件处理器集合（由 FilesPanel.zone(path) 生成）。 */
interface DropZone {
  onDragEnter: (e: DragEvent) => void
  onDragOver: (e: DragEvent) => void
  onDragLeave: (e: DragEvent) => void
  onDrop: (e: DragEvent) => void
}

/** 通用一行：[选择框] + 图标 + 名称 + 右侧元信息/操作；整行可点；可作为拖放目标。 */
function Row({
  icon,
  name,
  badge,
  meta,
  actions,
  muted,
  onClick,
  dropActive,
  zone,
  draggable,
  onDragStart,
  lead,
  contextMenu,
}: {
  icon: ReactNode
  name: ReactNode
  badge?: ReactNode
  meta?: ReactNode
  actions?: ReactNode
  muted?: boolean
  onClick?: () => void
  dropActive?: boolean
  zone?: DropZone
  draggable?: boolean
  onDragStart?: (e: DragEvent) => void
  lead?: ReactNode
  /** 右键上下文菜单内容（ContextMenuItem 列表）；提供则整行支持右键。 */
  contextMenu?: ReactNode
}) {
  const row = (
    <div
      className={cn(
        'group relative flex min-h-[42px] items-center gap-2.5 border-b border-divider px-4 text-[13px] transition-colors last:border-b-0',
        onClick && 'cursor-pointer hover:bg-surface-2',
        muted && 'text-muted-foreground',
        dropActive && 'bg-brand/10',
      )}
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      {...zone}
    >
      {/* 拖放高亮：左侧圆角强调条 + 柔和底色，避免方正边框 */}
      {dropActive && (
        <span className="pointer-events-none absolute inset-y-1 left-0 w-1 rounded-full bg-brand" />
      )}
      {lead}
      <span className="flex size-4 shrink-0 items-center justify-center text-muted-foreground">
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate">{name}</span>
      {badge}
      {meta && (
        <span className="mono shrink-0 text-[11.5px] text-muted-foreground">
          {meta}
        </span>
      )}
      {actions && (
        <span
          className="shrink-0 opacity-0 group-hover:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          {actions}
        </span>
      )}
    </div>
  )
  if (!contextMenu) return row
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{row}</ContextMenuTrigger>
      <ContextMenuContent className="w-44">{contextMenu}</ContextMenuContent>
    </ContextMenu>
  )
}

/** 资源管理器树的一行（缩进 + 折叠箭头 + 文件夹图标），可作为拖放目标。 */
function TreeRow({
  label,
  icon,
  depth,
  selected,
  dropActive,
  hasChildren,
  open,
  onToggle,
  onSelect,
  zone,
  contextMenu,
}: {
  label: ReactNode
  icon: ReactNode
  depth: number
  selected: boolean
  dropActive: boolean
  hasChildren: boolean
  open: boolean
  onToggle: () => void
  onSelect: () => void
  zone: DropZone
  contextMenu?: ReactNode
}) {
  const row = (
    <div
      className={cn(
        'mx-1 flex h-7 cursor-pointer items-center gap-1 rounded-md pr-2 text-[13px] transition-colors',
        selected ? 'bg-accent font-semibold text-brand' : 'hover:bg-surface-2',
        dropActive && 'bg-brand/10 ring-1 ring-inset ring-brand/40',
      )}
      style={{ paddingLeft: depth * 12 + 6 }}
      onClick={onSelect}
      {...zone}
    >
      <button
        type="button"
        className="flex size-4 shrink-0 items-center justify-center text-muted-foreground"
        onClick={(e) => {
          e.stopPropagation()
          if (hasChildren) onToggle()
        }}
      >
        {hasChildren ? (
          <ChevronRight
            className={cn('size-3.5 transition-transform', open && 'rotate-90')}
          />
        ) : null}
      </button>
      <span className="flex size-4 shrink-0 items-center justify-center">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </div>
  )
  if (!contextMenu) return row
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{row}</ContextMenuTrigger>
      <ContextMenuContent className="w-44">{contextMenu}</ContextMenuContent>
    </ContextMenu>
  )
}

/** 递归文件夹树节点（VSCode 式资源管理器）。 */
function FolderTreeNode({
  node,
  depth,
  folder,
  expanded,
  dragPath,
  onToggle,
  onSelect,
  zone,
  menu,
}: {
  node: FolderNode
  depth: number
  folder: string
  expanded: Set<string>
  dragPath: string | null
  onToggle: (p: string) => void
  onSelect: (p: string) => void
  zone: (p: string) => DropZone
  menu: (node: FolderNode) => ReactNode
}) {
  const open = expanded.has(node.path)
  const hasChildren = node.children.length > 0
  return (
    <>
      <TreeRow
        label={node.name}
        icon={
          open && hasChildren ? (
            <FolderOpen className="size-4 text-brand" />
          ) : (
            <Folder className="size-4 text-brand" />
          )
        }
        depth={depth}
        selected={folder === node.path}
        dropActive={dragPath === node.path}
        hasChildren={hasChildren}
        open={open}
        onToggle={() => onToggle(node.path)}
        onSelect={() => onSelect(node.path)}
        zone={zone(node.path)}
        contextMenu={menu(node)}
      />
      {open &&
        node.children.map((c) => (
          <FolderTreeNode
            key={c.path}
            node={c}
            depth={depth + 1}
            folder={folder}
            expanded={expanded}
            dragPath={dragPath}
            onToggle={onToggle}
            onSelect={onSelect}
            zone={zone}
            menu={menu}
          />
        ))}
    </>
  )
}

/**
 * 文件浏览器（参考 VSCode 左侧资源管理器）：左为可折叠文件夹树 + 拖放目标，右为当前文件夹内容
 * （子文件夹 / 数据集 / 文件）。支持从操作系统文件浏览器直接拖入文件或**整个文件夹**上传到指定位置。
 */
export function FilesPanel({ projectId }: { projectId: string }) {
  const { t } = useTranslation(['files', 'common'])
  const navigate = useNavigate()
  const qc = useQueryClient()
  const myRole = useProjectRole(projectId)
  const canManage = roleAtLeast(myRole, 'manager')
  const canWrite = roleAtLeast(myRole, 'contributor')

  // 当前只有「数据集」一个分类，整页即在该分类内浏览。
  const category = FILE_CATEGORIES[0]
  const [folder, setFolder] = useState('')
  const [folderOp, setFolderOp] = useState<FolderOp | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  const [dragPath, setDragPath] = useState<string | null>(null)
  const [dragMode, setDragMode] = useState<'upload' | 'move'>('upload')
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [uploadProg, setUploadProg] = useState<{ done: number; total: number } | null>(
    null,
  )
  const fileRef = useRef<HTMLInputElement>(null)

  const folders = useFolders(projectId)
  const files = useFiles(projectId, { category, folder })
  const datasets = useDatasets(projectId)
  const upload = useUploadFile(projectId)
  const move = useMoveFile(projectId)
  const delDataset = useDeleteDataset(projectId)
  const toastError = useToastError()

  const [delDsTarget, setDelDsTarget] = useState<Dataset | null>(null)
  const onDeleteDataset = () => {
    if (!delDsTarget) return
    delDataset
      .mutateAsync({ id: delDsTarget.id, version: delDsTarget.version })
      .then(() => {
        toast.success(t('browser.datasetDeleted'))
        setDelDsTarget(null)
      })
      .catch(toastError)
  }

  const cat = folders.data?.categories.find((c) => c.category === category)
  const byPath = useMemo(() => {
    const m = new Map<string, FolderNode>()
    const walk = (ns: FolderNode[]) =>
      ns.forEach((n) => {
        m.set(n.path, n)
        walk(n.children)
      })
    walk(cat?.folders ?? [])
    return m
  }, [cat])

  const subfolders = folder ? (byPath.get(folder)?.children ?? []) : (cat?.folders ?? [])
  const fileRows = files.data?.items ?? []
  const datasetRows = folder === '' ? (datasets.data ?? []) : []
  const segments = folder ? folder.split('/') : []

  const onUpload = (file?: File) => {
    if (!file) return
    upload
      .mutateAsync({ file, category, folder: folder || undefined })
      .then(() => toast.success(t('uploaded')))
      .catch(toastError)
  }

  const toggle = (path: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })

  // 进入某文件夹时顺带展开其所有祖先，保证树与内容区一致；切换目录清空多选。
  const goTo = (path: string) => {
    setFolder(path)
    setSelected(new Set())
    if (path)
      setExpanded((prev) => {
        const next = new Set(prev)
        const segs = path.split('/')
        for (let i = 1; i <= segs.length; i++) next.add(segs.slice(0, i).join('/'))
        return next
      })
  }

  const toggleSel = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  // 多选批量删除：逐个删 + 汇总 + 刷新。
  const bulkDelete = async () => {
    setBulkDeleting(true)
    let failed = 0
    for (const id of selected) {
      try {
        await filesApi.remove(projectId, id)
      } catch {
        failed++
      }
    }
    setBulkDeleting(false)
    setBulkDeleteOpen(false)
    const ok = selected.size - failed
    setSelected(new Set())
    qc.invalidateQueries({ queryKey: ['files', projectId] })
    if (ok > 0) toast.success(t('deleted'))
    if (failed > 0) toast.error(t('browser.bulkDeleteFailed', { count: failed }))
  }

  const join = (a: string, b: string) => [a, b].filter(Boolean).join('/')

  // 拖放上传：递归展开文件/文件夹 → 建空夹 → 限并发上传 → 失效刷新。
  const uploadDropped = async (dt: DataTransfer, base: string) => {
    if (!canWrite) {
      toast.error(t('common:error.forbidden'))
      return
    }
    let collected
    try {
      collected = await collectDropped(dt)
    } catch (e) {
      toastError(e)
      return
    }
    const allowed = new Set(ALLOWED_EXT[category])
    const all = collected.files.map((f) => ({
      file: f.file,
      folder: join(base, f.folder),
    }))
    const valid = all.filter((f) => allowed.has(extOf(f.file.name)))
    const skipped = all.length - valid.length

    // 仅显式建「空文件夹」（含文件的夹由后端按文件路径自动派生）。
    const fileFolders = new Set(valid.map((f) => f.folder))
    const emptyDirs = collected.dirs
      .map((d) => join(base, d))
      .filter(
        (abs) => ![...fileFolders].some((ff) => ff === abs || ff.startsWith(`${abs}/`)),
      )

    if (valid.length === 0 && emptyDirs.length === 0) {
      if (skipped > 0) toast.error(t('browser.uploadSkipped', { count: skipped }))
      return
    }

    setUploadProg({ done: 0, total: valid.length })
    for (const d of emptyDirs) {
      try {
        await foldersApi.create(projectId, { category, path: d })
      } catch {
        /* 幂等：已存在则忽略 */
      }
    }
    let failed = 0
    await runPool(valid, 4, async (f) => {
      try {
        await filesApi.upload(projectId, f.file, {
          category,
          folder: f.folder || undefined,
        })
      } catch {
        failed++
      }
      setUploadProg((p) => (p ? { ...p, done: p.done + 1 } : p))
    })
    setUploadProg(null)
    qc.invalidateQueries({ queryKey: ['files', projectId] })

    const ok = valid.length - failed
    if (ok > 0) toast.success(t('browser.uploadDone', { count: ok }))
    if (failed > 0) toast.error(t('browser.uploadFailed', { count: failed }))
    if (skipped > 0) toast.message(t('browser.uploadSkipped', { count: skipped }))
  }

  // 页面内移动：把拖拽的文件移到目标文件夹（同夹则跳过）。
  const moveDropped = async (dt: DataTransfer, target: string) => {
    const fileId = dt.getData(DMS_FILE_MIME)
    const from = dt.getData(DMS_FOLDER_MIME)
    if (!fileId || from === target) return
    try {
      await move.mutateAsync({ fileId, folder: target })
      toast.success(t('folder.moved'))
    } catch (e) {
      toastError(e)
    }
  }

  // 拖放区域属性工厂：path = 落点 base 文件夹。支持 OS 文件拖入（上传）与页面内文件拖拽（移动）。
  const detectDrag = (e: DragEvent): 'upload' | 'move' | null =>
    dndHasFiles(e) ? 'upload' : dndHasInternalFile(e) ? 'move' : null
  const zone = (path: string): DropZone => ({
    onDragEnter: (e) => {
      if (!canWrite) return
      const mode = detectDrag(e)
      if (!mode) return
      e.preventDefault()
      e.stopPropagation()
      setDragPath(path)
      setDragMode(mode)
    },
    onDragOver: (e) => {
      if (!canWrite) return
      const mode = detectDrag(e)
      if (!mode) return
      e.preventDefault()
      e.stopPropagation()
      e.dataTransfer.dropEffect = mode === 'upload' ? 'copy' : 'move'
      // 关键：dragover 持续触发，在此维持高亮——避免指针移到行内子元素时被其 dragleave 清掉
      // （同值 setState 在 React 中是 no-op，不会反复重渲染）。
      setDragPath(path)
      setDragMode(mode)
    },
    onDragLeave: (e) => {
      e.stopPropagation()
      setDragPath((p) => (p === path ? null : p))
    },
    onDrop: (e) => {
      if (dndHasFiles(e)) {
        e.preventDefault()
        e.stopPropagation()
        setDragPath(null)
        void uploadDropped(e.dataTransfer, path)
      } else if (dndHasInternalFile(e)) {
        e.preventDefault()
        e.stopPropagation()
        setDragPath(null)
        void moveDropped(e.dataTransfer, path)
      }
    },
  })

  // 文件夹右键菜单（树节点 / 内容区文件夹行共用）。root=true 时只给「新建文件夹/上传到此处」。
  const folderMenu = (path: string, name: string, totalCount: number, root = false) =>
    canWrite ? (
      <>
        <ContextMenuItem onClick={() => setFolderOp({ kind: 'new', category, path })}>
          <FolderPlus className="size-4" />
          {t('browser.newFolder')}
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => {
            setFolder(path)
            fileRef.current?.click()
          }}
        >
          <Upload className="size-4" />
          {t('folder.uploadHere')}
        </ContextMenuItem>
        {!root && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem
              onClick={() => setFolderOp({ kind: 'rename', category, path, name })}
            >
              <Pencil className="size-4" />
              {t('folder.rename')}
            </ContextMenuItem>
            <ContextMenuItem
              variant="destructive"
              onClick={() =>
                setFolderOp({ kind: 'delete', category, path, name, totalCount })
              }
            >
              <Trash2 className="size-4" />
              {t('folder.delete')}
            </ContextMenuItem>
          </>
        )}
      </>
    ) : undefined

  const empty =
    subfolders.length === 0 && datasetRows.length === 0 && fileRows.length === 0

  return (
    <div className="flex h-full min-h-0 flex-col px-[26px] py-[22px]">
      <PageHeader
        title={t('title')}
        titleEn="Files"
        description={t('subtitle')}
        actions={
          canWrite && (
            <>
              <Button
                variant="outline"
                onClick={() => setFolderOp({ kind: 'new', category, path: folder })}
              >
                <FolderPlus className="size-4" />
                {t('browser.newFolder')}
              </Button>
              <Button onClick={() => fileRef.current?.click()} disabled={upload.isPending}>
                {upload.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                {t('upload')}
              </Button>
            </>
          )
        }
      />

      {folders.isLoading ? (
        <TableSkeleton rows={6} />
      ) : folders.isError ? (
        <ErrorState error={folders.error} onRetry={() => folders.refetch()} />
      ) : (
        <div className="flex min-h-[440px] flex-1 overflow-hidden rounded-lg border border-divider">
          {/* 左：资源管理器（文件夹树 + 拖放目标） */}
          <aside className="w-[252px] shrink-0 overflow-auto border-r border-divider bg-surface-1 py-1.5">
            <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t('folder.tree')}
            </div>
            <TreeRow
              label={t('browser.root')}
              icon={
                folder === '' ? (
                  <FolderOpen className="size-4 text-brand" />
                ) : (
                  <Folder className="size-4 text-brand" />
                )
              }
              depth={0}
              selected={folder === ''}
              dropActive={dragPath === ''}
              hasChildren={(cat?.folders.length ?? 0) > 0}
              open
              onToggle={() => {}}
              onSelect={() => goTo('')}
              zone={zone('')}
              contextMenu={folderMenu('', '', 0, true)}
            />
            {(cat?.folders ?? []).map((n) => (
              <FolderTreeNode
                key={n.path}
                node={n}
                depth={1}
                folder={folder}
                expanded={expanded}
                dragPath={dragPath}
                onToggle={toggle}
                onSelect={goTo}
                zone={zone}
                menu={(nd) => folderMenu(nd.path, nd.name, nd.total_count)}
              />
            ))}
          </aside>

          {/* 右：当前文件夹内容（整体可作为拖放目标 → 当前文件夹） */}
          <section
            className={cn(
              'relative flex min-w-0 flex-1 flex-col transition-colors',
              dragPath === folder && 'bg-brand/[0.04] ring-2 ring-inset ring-brand/30',
            )}
            {...zone(folder)}
          >
            {/* 面包屑 */}
            <div className="flex flex-wrap items-center gap-1 border-b border-divider px-4 py-2.5 text-[13px]">
              <button
                type="button"
                onClick={() => goTo('')}
                className={cn(
                  'font-semibold transition hover:text-brand',
                  folder ? 'text-muted-foreground' : 'text-foreground',
                )}
              >
                {t('browser.root')}
              </button>
              {segments.map((s, i) => (
                <Fragment key={i}>
                  <ChevronRight className="size-3.5 text-muted-foreground" />
                  <button
                    type="button"
                    onClick={() => goTo(segments.slice(0, i + 1).join('/'))}
                    className={cn(
                      'transition hover:text-brand',
                      i === segments.length - 1
                        ? 'font-semibold text-foreground'
                        : 'text-muted-foreground',
                    )}
                  >
                    {s}
                  </button>
                </Fragment>
              ))}
            </div>

            {/* 多选工具条 */}
            {canWrite && selected.size > 0 && (
              <div className="flex items-center gap-2 border-b border-divider bg-accent/40 px-4 py-2 text-[13px]">
                <span className="font-semibold">
                  {t('browser.selectedCount', { count: selected.size })}
                </span>
                <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
                  {t('browser.clearSel')}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="ml-auto"
                  onClick={() => setBulkDeleteOpen(true)}
                >
                  <Trash2 className="size-4" />
                  {t('common:actions.delete')}
                </Button>
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-auto">
              {/* 文件夹 */}
              {subfolders.map((f) => (
                <Row
                  key={`d:${f.path}`}
                  icon={<Folder className="size-4 text-brand" />}
                  name={<span className="font-semibold">{f.name}</span>}
                  meta={f.total_count > 0 ? f.total_count : undefined}
                  onClick={() => goTo(f.path)}
                  dropActive={dragPath === f.path}
                  zone={zone(f.path)}
                  contextMenu={folderMenu(f.path, f.name, f.total_count)}
                  actions={
                    canWrite && (
                      <FolderMenu
                        onRename={() =>
                          setFolderOp({
                            kind: 'rename',
                            category,
                            path: f.path,
                            name: f.name,
                          })
                        }
                        onDelete={() =>
                          setFolderOp({
                            kind: 'delete',
                            category,
                            path: f.path,
                            name: f.name,
                            totalCount: f.total_count,
                          })
                        }
                        canDelete={f.total_count === 0 || canManage}
                      />
                    )
                  }
                />
              ))}

              {/* 数据集（仅根目录展示——与项目「数据集」页面同源） */}
              {datasetRows.map((d) => (
                <Row
                  key={`ds:${d.id}`}
                  icon={<Database className="size-4 text-brand" />}
                  name={d.name}
                  badge={
                    <Badge variant="info" className="shrink-0">
                      {t('browser.datasetBadge')}
                    </Badge>
                  }
                  onClick={() => navigate(`/projects/${projectId}/datasets/${d.id}`)}
                  actions={
                    canWrite && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-xs">
                            <MoreHorizontal className="size-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              navigate(`/projects/${projectId}/datasets/${d.id}`)
                            }
                          >
                            <Database className="size-4" />
                            {t('browser.openDataset')}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDelDsTarget(d)}
                          >
                            <Trash2 className="size-4" />
                            {t('common:actions.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )
                  }
                  contextMenu={
                    <>
                      <ContextMenuItem
                        onClick={() => navigate(`/projects/${projectId}/datasets/${d.id}`)}
                      >
                        <Database className="size-4" />
                        {t('browser.openDataset')}
                      </ContextMenuItem>
                      {canWrite && (
                        <>
                          <ContextMenuSeparator />
                          <ContextMenuItem
                            variant="destructive"
                            onClick={() => setDelDsTarget(d)}
                          >
                            <Trash2 className="size-4" />
                            {t('common:actions.delete')}
                          </ContextMenuItem>
                        </>
                      )}
                    </>
                  }
                />
              ))}

              {/* 文件 */}
              {fileRows.map((f) => (
                <FileRow
                  key={`f:${f.id}`}
                  projectId={projectId}
                  file={f}
                  canWrite={canWrite}
                  canManage={canManage}
                  onPreview={() => setPreviewFile(f)}
                  selected={selected.has(f.id)}
                  onToggleSelect={() => toggleSel(f.id)}
                />
              ))}

              {empty && (
                <div className="px-4 py-12">
                  <EmptyState title={t('browser.empty')} hint={t('browser.dragHint')} />
                </div>
              )}
            </div>

            {/* 拖放遮罩提示（上传到当前夹 / 移动到当前夹） */}
            {dragPath === folder && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-accent/30">
                <span className="rounded-md bg-brand px-3 py-1.5 text-[13px] font-semibold text-white shadow">
                  {dragMode === 'move'
                    ? t('browser.moveHere')
                    : folder
                      ? t('browser.dropTo', { folder: segments[segments.length - 1] })
                      : t('browser.dropRoot')}
                </span>
              </div>
            )}
          </section>
        </div>
      )}

      {/* 上传进度 */}
      {uploadProg && (
        <div className="mt-3 flex items-center gap-2 text-[12.5px] text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          {t('browser.uploading', { done: uploadProg.done, total: uploadProg.total })}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          onUpload(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      {folderOp && (
        <FolderOpDialogs
          projectId={projectId}
          op={folderOp}
          onClose={() => setFolderOp(null)}
        />
      )}
      <FilePreviewDialog
        projectId={projectId}
        file={previewFile}
        onClose={() => setPreviewFile(null)}
      />
      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title={t('browser.bulkDeleteTitle')}
        description={t('browser.bulkDeleteDesc', { count: selected.size })}
        destructive
        confirmText={t('common:actions.delete')}
        loading={bulkDeleting}
        onConfirm={bulkDelete}
      />
      <ConfirmDialog
        open={!!delDsTarget}
        onOpenChange={(o) => !o && setDelDsTarget(null)}
        title={t('browser.deleteDatasetTitle')}
        description={t('browser.deleteDatasetDesc', { name: delDsTarget?.name })}
        destructive
        confirmText={t('common:actions.delete')}
        loading={delDataset.isPending}
        onConfirm={onDeleteDataset}
      />
    </div>
  )
}

function FolderMenu({
  onRename,
  onDelete,
  canDelete,
}: {
  onRename: () => void
  onDelete: () => void
  canDelete: boolean
}) {
  const { t } = useTranslation('files')
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-xs">
          <MoreHorizontal className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onRename}>
          <Pencil className="size-4" />
          {t('folder.rename')}
        </DropdownMenuItem>
        {canDelete && (
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

function FileRow({
  projectId,
  file,
  canWrite,
  canManage,
  onPreview,
  selected,
  onToggleSelect,
}: {
  projectId: string
  file: FileItem
  canWrite: boolean
  canManage: boolean
  onPreview: () => void
  selected: boolean
  onToggleSelect: () => void
}) {
  const { t } = useTranslation(['files', 'common'])
  const setConfidential = useSetFileConfidential(projectId)
  const del = useDeleteFile(projectId)
  const toastError = useToastError()
  const [moveOpen, setMoveOpen] = useState(false)
  const [grantsOpen, setGrantsOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const canPreview = isPreviewable(file.name)
  const download = () => filesApi.download(projectId, file.id, file.name)
  const toggleConfidential = () =>
    setConfidential
      .mutateAsync({ id: file.id, confidential: !file.confidential })
      .then(() => toast.success(t('confidentialChanged')))
      .catch(toastError)

  return (
    <>
      <Row
        lead={
          canWrite ? (
            <span
              className={cn(
                'flex shrink-0 items-center',
                !selected && 'opacity-0 group-hover:opacity-100',
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <Checkbox
                checked={selected}
                onCheckedChange={onToggleSelect}
                aria-label={t('browser.select')}
              />
            </span>
          ) : undefined
        }
        icon={fileIcon(file.name)}
        name={file.name}
        badge={
          file.confidential ? (
            <Lock className="size-3 shrink-0 text-[#E0492C]" aria-label={t('badge')} />
          ) : undefined
        }
        meta={formatBytes(file.size)}
        // 可预览 → 点击在线预览；否则点击下载。
        onClick={canPreview ? onPreview : download}
        draggable={canWrite}
        onDragStart={(e) => {
          // 页面内拖拽 = 移动到其他文件夹（自定义 MIME，区别于 OS 文件拖入）。
          e.dataTransfer.setData(DMS_FILE_MIME, file.id)
          e.dataTransfer.setData(DMS_FOLDER_MIME, file.folder)
          e.dataTransfer.effectAllowed = 'move'
        }}
        contextMenu={
          <>
            {canPreview && (
              <ContextMenuItem onClick={onPreview}>
                <Eye className="size-4" />
                {t('browser.preview')}
              </ContextMenuItem>
            )}
            <ContextMenuItem onClick={download}>
              <Download className="size-4" />
              {t('common:actions.download')}
            </ContextMenuItem>
            {canWrite && (
              <ContextMenuItem onClick={() => setMoveOpen(true)}>
                <FolderPlus className="size-4" />
                {t('folder.move')}
              </ContextMenuItem>
            )}
            {canManage && (
              <ContextMenuItem onClick={toggleConfidential}>
                {file.confidential ? (
                  <Unlock className="size-4" />
                ) : (
                  <Lock className="size-4" />
                )}
                {file.confidential ? t('unsetConfidential') : t('setConfidential')}
              </ContextMenuItem>
            )}
            {canManage && file.confidential && (
              <ContextMenuItem onClick={() => setGrantsOpen(true)}>
                <Users className="size-4" />
                {t('grants.manage')}
              </ContextMenuItem>
            )}
            {canWrite && (
              <>
                <ContextMenuSeparator />
                <ContextMenuItem
                  variant="destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="size-4" />
                  {t('common:actions.delete')}
                </ContextMenuItem>
              </>
            )}
          </>
        }
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-xs">
                <MoreHorizontal className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canPreview && (
                <DropdownMenuItem onClick={onPreview}>
                  <Eye className="size-4" />
                  {t('browser.preview')}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={download}>
                <Download className="size-4" />
                {t('common:actions.download')}
              </DropdownMenuItem>
              {canWrite && (
                <DropdownMenuItem onClick={() => setMoveOpen(true)}>
                  <FolderPlus className="size-4" />
                  {t('folder.move')}
                </DropdownMenuItem>
              )}
              {canManage && (
                <DropdownMenuItem onClick={toggleConfidential}>
                  {file.confidential ? (
                    <Unlock className="size-4" />
                  ) : (
                    <Lock className="size-4" />
                  )}
                  {file.confidential ? t('unsetConfidential') : t('setConfidential')}
                </DropdownMenuItem>
              )}
              {canManage && file.confidential && (
                <DropdownMenuItem onClick={() => setGrantsOpen(true)}>
                  <Users className="size-4" />
                  {t('grants.manage')}
                </DropdownMenuItem>
              )}
              {canWrite && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setDeleteOpen(true)}
                  >
                    <Trash2 className="size-4" />
                    {t('common:actions.delete')}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

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
    </>
  )
}

/* ------------------------- 文件夹操作弹窗（沿用） ------------------------- */

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
  const [name, setName] = useState(op.kind === 'rename' ? (op.name ?? '') : '')

  if (op.kind === 'delete') {
    const recursive = (op.totalCount ?? 0) > 0
    return (
      <ConfirmDialog
        open
        onOpenChange={(o) => !o && onClose()}
        title={t('folder.delete')}
        description={
          recursive
            ? t('folder.deleteRecursive', { name: op.name, count: op.totalCount })
            : t('folder.deleteEmpty', { name: op.name })
        }
        destructive
        confirmText={t('folder.delete')}
        loading={remove.isPending}
        onConfirm={() =>
          remove
            .mutateAsync({ category: op.category, path: op.path, recursive })
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
      const parent = op.path.includes('/')
        ? op.path.slice(0, op.path.lastIndexOf('/'))
        : ''
      const to = parent ? `${parent}/${trimmed}` : trimmed
      rename
        .mutateAsync({ category: op.category, from_path: op.path, to_path: to })
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
          <DialogTitle>{isNew ? t('folder.new') : t('folder.renameTitle')}</DialogTitle>
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

  const options = useMemo(() => {
    const cat = folders.data?.categories.find((c) => c.category === file.category)
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
          <Button onClick={submit} disabled={move.isPending || target === file.folder}>
            {move.isPending && <Loader2 className="size-4 animate-spin" />}
            {t('folder.move')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
