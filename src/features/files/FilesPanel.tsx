import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  ChevronRight,
  ChevronsDownUp,
  Download,
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
  RefreshCw,
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
import { ErrorState, TableSkeleton } from '@/components/states'
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
  extOf,
  FILE_CATEGORIES,
  filesApi,
  type FileCategory,
  type FileItem,
  type FolderCategory,
  type FolderNode,
} from '@/api/files'
import { FileGrantsDialog } from './FileGrantsDialog'

const ROOT = '__root__'
const INDENT = 16
const BASE_PAD = 10

/**
 * 按扩展名取文件图标（仅形状区分类型，颜色统一中性——对齐「中性灰 + 单一强调色」主题）。
 */
function fileIcon(name: string): { Icon: typeof File } {
  const ext = extOf(name)
  if (['csv', 'tsv', 'xlsx', 'xls', 'parquet'].includes(ext))
    return { Icon: FileSpreadsheet }
  if (ext === 'pdf') return { Icon: FileText }
  if (['doc', 'docx', 'txt', 'md', 'rtf'].includes(ext)) return { Icon: FileText }
  if (['fasta', 'fa', 'fastq', 'fq', 'gb', 'gbk'].includes(ext))
    return { Icon: FileType }
  if (['sdf', 'mol', 'mol2', 'pdb', 'cif'].includes(ext))
    return { Icon: FlaskConical }
  if (['png', 'jpg', 'jpeg', 'svg', 'gif', 'webp', 'bmp'].includes(ext))
    return { Icon: FileImage }
  if (['json', 'xml', 'yaml', 'yml', 'toml'].includes(ext))
    return { Icon: FileCode }
  return { Icon: File }
}

/** 文件夹操作目标（新建子夹 / 重命名 / 删除）。 */
interface FolderOp {
  kind: 'new' | 'rename' | 'delete'
  category: FileCategory
  path: string
  name?: string
  totalCount?: number
}

/** 缩进引导竖线（每个祖先层一条）。 */
function IndentGuides({ depth }: { depth: number }) {
  if (depth <= 0) return null
  return (
    <>
      {Array.from({ length: depth }).map((_, i) => (
        <span
          key={i}
          className="pointer-events-none absolute top-0 bottom-0 w-px bg-border"
          style={{ left: BASE_PAD + i * INDENT + 7 }}
        />
      ))}
    </>
  )
}

/** VS Code 资源管理器式单棵文件树：文件夹 + 文件同树、整行高亮、缩进引导、悬浮操作。 */
export function FilesPanel({ projectId }: { projectId: string }) {
  const { t } = useTranslation('files')
  const folders = useFolders(projectId)
  const myRole = useProjectRole(projectId)
  const canManage = roleAtLeast(myRole, 'manager')

  const [expanded, setExpanded] = useState<Set<string>>(new Set(['raw_data']))
  const [selected, setSelected] = useState<string | null>(null)
  const [folderOp, setFolderOp] = useState<FolderOp | null>(null)

  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  // 后端只返回有内容的分类；6 类全作为根展示。
  const allCats: FolderCategory[] = FILE_CATEGORIES.map(
    (cat) =>
      folders.data?.categories.find((c) => c.category === cat) ?? {
        category: cat,
        file_count: 0,
        total_count: 0,
        folders: [],
      },
  )

  const tree = (
    <TableCard>
      <div className="py-2">
        {allCats.map((cat) => (
          <TreeFolder
            key={cat.category}
            projectId={projectId}
            category={cat.category}
            path=""
            label={t(`category.${cat.category}`)}
            node={{
              name: cat.category,
              path: '',
              file_count: cat.file_count,
              total_count: cat.total_count,
              children: cat.folders,
            }}
            depth={0}
            isCategory
            canManage={canManage}
            expanded={expanded}
            selected={selected}
            onToggle={toggle}
            onSelect={setSelected}
            onFolderOp={setFolderOp}
          />
        ))}
      </div>
    </TableCard>
  )

  return (
    <div className="max-w-[920px] px-[26px] py-[22px]">
      <PageHeader
        title={t('title')}
        titleEn="Files"
        description={t('subtitle')}
        actions={
          <>
            <Button
              variant="outline"
              size="icon"
              title={t('actions.refresh', { ns: 'common', defaultValue: '刷新' })}
              onClick={() => folders.refetch()}
            >
              <RefreshCw
                className={cn('size-4', folders.isFetching && 'animate-spin')}
              />
            </Button>
            <Button
              variant="outline"
              size="icon"
              title={t('folder.collapseAll', { defaultValue: '全部折叠' })}
              onClick={() => setExpanded(new Set())}
            >
              <ChevronsDownUp className="size-4" />
            </Button>
          </>
        }
      />
      {folders.isLoading ? (
        <TableSkeleton rows={6} />
      ) : folders.isError ? (
        <ErrorState error={folders.error} onRetry={() => folders.refetch()} />
      ) : (
        tree
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

/* ------------------------- 文件夹节点（含分类根） ------------------------- */

interface TreeProps {
  projectId: string
  category: FileCategory
  canManage: boolean
  expanded: Set<string>
  selected: string | null
  onToggle: (key: string) => void
  onSelect: (key: string) => void
  onFolderOp: (op: FolderOp) => void
}

function TreeFolder({
  node,
  path,
  label,
  depth,
  isCategory,
  ...p
}: TreeProps & {
  node: FolderNode
  path: string
  label?: string
  depth: number
  isCategory?: boolean
}) {
  const { t } = useTranslation('files')
  const key = isCategory ? p.category : `${p.category}:${path}`
  const open = p.expanded.has(key)
  const isSelected = p.selected === key
  const upload = useUploadFile(p.projectId)
  const fileRef = useRef<HTMLInputElement>(null)
  const toastError = useToastError()

  const onUpload = (file?: File) => {
    if (!file) return
    upload
      .mutateAsync({ file, category: p.category, folder: path || undefined })
      .then(() => toast.success(t('uploaded')))
      .catch(toastError)
  }

  const FolderIcon = open ? FolderOpen : Folder
  const stop = (e: { stopPropagation: () => void }) => e.stopPropagation()

  return (
    <>
      <div
        className={cn(
          'group relative flex min-h-[30px] cursor-pointer items-center gap-1.5 pr-2 text-[13px] select-none',
          isSelected ? 'bg-accent' : 'hover:bg-surface-2',
        )}
        style={{ paddingLeft: BASE_PAD + depth * INDENT }}
        onClick={() => {
          p.onSelect(key)
          p.onToggle(key)
        }}
      >
        <IndentGuides depth={depth} />
        <ChevronRight
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-90',
          )}
        />
        <FolderIcon
          className={cn(
            'size-4 shrink-0',
            isCategory ? 'text-brand' : 'text-muted-foreground',
          )}
          fill={isCategory ? 'var(--accent)' : 'none'}
        />
        <span
          className={cn(
            'truncate',
            isCategory ? 'font-semibold' : 'font-medium',
            isSelected && 'text-brand',
          )}
        >
          {label ?? node.name}
        </span>

        {/* 右侧：默认计数，悬浮换成操作 */}
        {node.total_count > 0 && (
          <span className="mono ml-auto pl-2 text-[10.5px] text-muted-foreground group-hover:hidden">
            {node.total_count}
          </span>
        )}
        <div
          className="ml-auto hidden items-center group-hover:flex"
          onClick={stop}
        >
          {p.canManage && (
            <>
              <Button
                variant="ghost"
                size="icon-xs"
                title={t('folder.uploadHere')}
                disabled={upload.isPending}
                onClick={() => fileRef.current?.click()}
              >
                {upload.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Upload className="size-3.5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                title={t('folder.newSub')}
                onClick={() =>
                  p.onFolderOp({ kind: 'new', category: p.category, path })
                }
              >
                <FolderPlus className="size-3.5" />
              </Button>
            </>
          )}
          {!isCategory && p.canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-xs">
                  <MoreHorizontal className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() =>
                    p.onFolderOp({
                      kind: 'rename',
                      category: p.category,
                      path,
                      name: node.name,
                    })
                  }
                >
                  <Pencil className="size-4" />
                  {t('folder.rename')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() =>
                    p.onFolderOp({
                      kind: 'delete',
                      category: p.category,
                      path,
                      name: node.name,
                      totalCount: node.total_count,
                    })
                  }
                >
                  <Trash2 className="size-4" />
                  {t('folder.delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            onUpload(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </div>

      {open && (
        <FolderChildren
          {...p}
          path={path}
          childFolders={node.children}
          depth={depth + 1}
          empty={node.total_count === 0 && node.children.length === 0}
        />
      )}
    </>
  )
}

/** 展开后的子内容：子文件夹 + 本夹文件（仅展开时挂载 → 懒加载文件）。 */
function FolderChildren({
  childFolders,
  path,
  depth,
  empty,
  ...p
}: TreeProps & {
  childFolders: FolderNode[]
  path: string
  depth: number
  empty: boolean
}) {
  const { t } = useTranslation('files')
  const files = useFiles(p.projectId, { category: p.category, folder: path })
  const rows = files.data?.items ?? []

  return (
    <>
      {childFolders.map((c) => (
        <TreeFolder
          key={c.path}
          {...p}
          node={c}
          path={c.path}
          depth={depth}
        />
      ))}
      {files.isLoading ? (
        <div
          className="flex min-h-[30px] items-center gap-1.5 text-[12px] text-muted-foreground"
          style={{ paddingLeft: BASE_PAD + depth * INDENT + 20 }}
        >
          <Loader2 className="size-3.5 animate-spin" />
        </div>
      ) : (
        rows.map((f) => (
          <FileRow
            key={f.id}
            {...p}
            file={f}
            depth={depth}
          />
        ))
      )}
      {empty && rows.length === 0 && !files.isLoading && (
        <div
          className="min-h-[30px] py-1 text-[12px] text-muted-foreground italic"
          style={{ paddingLeft: BASE_PAD + depth * INDENT + 20 }}
        >
          {t('folder.emptyHere')}
        </div>
      )}
    </>
  )
}

/* ------------------------- 文件行 ------------------------- */

function FileRow({
  file,
  depth,
  ...p
}: TreeProps & { file: FileItem; depth: number }) {
  const { t } = useTranslation(['files', 'common'])
  const setConfidential = useSetFileConfidential(p.projectId)
  const del = useDeleteFile(p.projectId)
  const toastError = useToastError()
  const [moveOpen, setMoveOpen] = useState(false)
  const [grantsOpen, setGrantsOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const key = `file:${file.id}`
  const isSelected = p.selected === key
  const { Icon } = fileIcon(file.name)
  const stop = (e: { stopPropagation: () => void }) => e.stopPropagation()

  const toggleConfidential = () =>
    setConfidential
      .mutateAsync({ id: file.id, confidential: !file.confidential })
      .then(() => toast.success(t('confidentialChanged')))
      .catch(toastError)

  return (
    <div
      className={cn(
        'group relative flex min-h-[30px] cursor-pointer items-center gap-1.5 pr-2 text-[13px] select-none',
        isSelected ? 'bg-accent' : 'hover:bg-surface-2',
      )}
      style={{ paddingLeft: BASE_PAD + depth * INDENT }}
      onClick={() => p.onSelect(key)}
      onDoubleClick={() => filesApi.download(p.projectId, file.id, file.name)}
    >
      <IndentGuides depth={depth} />
      {/* 文件无 twistie：占位对齐 */}
      <span className="size-4 shrink-0" />
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className={cn('truncate', isSelected && 'text-brand')}>
        {file.name}
      </span>
      {file.confidential && (
        <Lock
          className="size-3 shrink-0 text-[#E0492C]"
          aria-label={t('badge')}
        />
      )}

      <span className="mono ml-auto pl-2 text-[10.5px] text-muted-foreground group-hover:hidden">
        {formatBytes(file.size)}
      </span>
      <div className="ml-auto hidden items-center group-hover:flex" onClick={stop}>
        <Button
          variant="ghost"
          size="icon-xs"
          title={t('common:actions.download')}
          onClick={() => filesApi.download(p.projectId, file.id, file.name)}
        >
          <Download className="size-3.5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-xs">
              <MoreHorizontal className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setMoveOpen(true)}>
              <FolderPlus className="size-4" />
              {t('folder.move')}
            </DropdownMenuItem>
            {p.canManage && (
              <DropdownMenuItem onClick={toggleConfidential}>
                {file.confidential ? (
                  <Unlock className="size-4" />
                ) : (
                  <Lock className="size-4" />
                )}
                {file.confidential ? t('unsetConfidential') : t('setConfidential')}
              </DropdownMenuItem>
            )}
            {p.canManage && file.confidential && (
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
      </div>

      <MoveFileDialog
        projectId={p.projectId}
        file={file}
        open={moveOpen}
        onOpenChange={setMoveOpen}
      />
      <FileGrantsDialog
        projectId={p.projectId}
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
