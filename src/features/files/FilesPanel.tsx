import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ChevronDown,
  ChevronRight,
  Download,
  Folder,
  FolderInput,
  FolderPlus,
  Loader2,
  Lock,
  MoreHorizontal,
  Pencil,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/page-header'
import { EmptyState, ErrorState } from '@/components/states'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { FileGrantsDialog } from './FileGrantsDialog'
import { roleAtLeast } from '@/lib/roles'
import { formatBytes } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  ALLOWED_EXT,
  extOf,
  filesApi,
  type FileCategory,
  type FileItem,
  type FolderCategory,
  type FolderNode,
} from '@/api/files'

const CAT_TINT: Record<FileCategory, { bg: string; fg: string }> = {
  raw_data: { bg: '#EAF0FF', fg: '#2F6BFF' },
  structures: { bg: '#E7F6EC', fg: '#15803D' },
  sequences: { bg: '#FEF4E6', fg: '#B45309' },
  reports: { bg: '#F3EEFB', fg: '#7C3AED' },
  datasets: { bg: '#FBEAF2', fg: '#BE185D' },
  misc: { bg: '#EEF0F3', fg: '#64748B' },
}

type Sel = { category: FileCategory; folder: string }

interface TreeCtl {
  selKey: string
  expanded: Set<string>
  canWrite: boolean
  onSelect: (category: FileCategory, path: string) => void
  onToggle: (key: string) => void
  onNewSub: (category: FileCategory, parentPath: string) => void
  onRename: (category: FileCategory, node: FolderNode) => void
  onDelete: (category: FileCategory, node: FolderNode) => void
}

function folderKey(category: string, path: string) {
  return `${category}:${path}`
}

/** 收集某分类下所有文件夹路径（含缩进 label），用于「移动到」下拉。 */
function flattenFolders(cat: FolderCategory): { path: string; label: string }[] {
  const out: { path: string; label: string }[] = []
  const walk = (nodes: FolderNode[], depth: number) => {
    for (const n of nodes) {
      out.push({ path: n.path, label: `${' '.repeat(depth)}${n.name}` })
      walk(n.children, depth + 1)
    }
  }
  walk(cat.folders, 0)
  return out
}

function FolderRow({
  node,
  category,
  depth,
  ctl,
}: {
  node: FolderNode
  category: FileCategory
  depth: number
  ctl: TreeCtl
}) {
  const { t } = useTranslation('files')
  const key = folderKey(category, node.path)
  const selected = ctl.selKey === key
  const hasChildren = node.children.length > 0
  const expanded = ctl.expanded.has(key)

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => ctl.onSelect(category, node.path)}
        className={cn(
          'group flex cursor-pointer items-center gap-1 rounded-[7px] py-1.5 pr-1 text-[13px]',
          selected
            ? 'bg-accent text-accent-foreground font-semibold'
            : 'hover:bg-background text-foreground',
        )}
        style={{ paddingLeft: depth * 14 + 6 }}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              ctl.onToggle(key)
            }}
            className="text-muted-foreground flex size-4 shrink-0 items-center justify-center"
          >
            {expanded ? (
              <ChevronDown className="size-3.5" />
            ) : (
              <ChevronRight className="size-3.5" />
            )}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <Folder className="size-4 shrink-0 text-[#C77B16]" />
        <span className="flex-1 truncate">{node.name}</span>
        <span className="text-muted-foreground text-[11px] tabular-nums">
          {node.total_count}
        </span>
        {ctl.canWrite && (
          <span onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
                >
                  <MoreHorizontal className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => ctl.onNewSub(category, node.path)}>
                  <FolderPlus className="size-4" />
                  {t('folder.newSub')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => ctl.onRename(category, node)}>
                  <Pencil className="size-4" />
                  {t('folder.rename')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => ctl.onDelete(category, node)}
                >
                  <Trash2 className="size-4" />
                  {t('folder.delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </span>
        )}
      </div>
      {expanded &&
        node.children.map((c) => (
          <FolderRow
            key={c.path}
            node={c}
            category={category}
            depth={depth + 1}
            ctl={ctl}
          />
        ))}
    </div>
  )
}

function CategoryRow({ cat, ctl }: { cat: FolderCategory; ctl: TreeCtl }) {
  const { t } = useTranslation('files')
  const key = folderKey(cat.category, '')
  const selected = ctl.selKey === key
  const hasChildren = cat.folders.length > 0
  const expanded = ctl.expanded.has(key)
  const tint = CAT_TINT[cat.category]

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => ctl.onSelect(cat.category, '')}
        className={cn(
          'group flex cursor-pointer items-center gap-1.5 rounded-[7px] py-1.5 pr-1 text-[13px]',
          selected
            ? 'bg-accent text-accent-foreground font-bold'
            : 'hover:bg-background',
        )}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              ctl.onToggle(key)
            }}
            className="text-muted-foreground flex size-4 shrink-0 items-center justify-center"
          >
            {expanded ? (
              <ChevronDown className="size-3.5" />
            ) : (
              <ChevronRight className="size-3.5" />
            )}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <span
          className="flex size-6 shrink-0 items-center justify-center rounded-[7px]"
          style={{ background: tint.bg, color: tint.fg }}
        >
          <Folder className="size-3.5" />
        </span>
        <span className="flex-1 truncate font-semibold">
          {t(`category.${cat.category}`)}
        </span>
        <span className="text-muted-foreground text-[11px] tabular-nums">
          {cat.total_count}
        </span>
        {ctl.canWrite && (
          <span onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon-xs"
              className="opacity-0 group-hover:opacity-100"
              aria-label={t('folder.new')}
              onClick={() => ctl.onNewSub(cat.category, '')}
            >
              <FolderPlus className="size-3.5" />
            </Button>
          </span>
        )}
      </div>
      {expanded &&
        cat.folders.map((node) => (
          <FolderRow
            key={node.path}
            node={node}
            category={cat.category}
            depth={1}
            ctl={ctl}
          />
        ))}
    </div>
  )
}

export function FilesPanel({ projectId }: { projectId: string }) {
  const { t } = useTranslation('files')
  const role = useProjectRole(projectId)
  const canWrite = roleAtLeast(role, 'contributor')
  const canManage = roleAtLeast(role, 'manager')
  const toastError = useToastError()
  const fileRef = useRef<HTMLInputElement>(null)

  const tree = useFolders(projectId)
  const [sel, setSel] = useState<Sel>({ category: 'raw_data', folder: '' })
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [uploadConfidential, setUploadConfidential] = useState(false)
  const [page, setPage] = useState({ limit: 50, offset: 0 })
  const filesQuery = useFiles(projectId, {
    category: sel.category,
    folder: sel.folder,
    ...page,
  })

  const upload = useUploadFile(projectId)
  const del = useDeleteFile(projectId)
  const setConf = useSetFileConfidential(projectId)
  const createFolder = useCreateFolder(projectId)
  const renameFolder = useRenameFolder(projectId)
  const deleteFolder = useDeleteFolder(projectId)
  const moveFile = useMoveFile(projectId)

  const [delTarget, setDelTarget] = useState<FileItem | null>(null)
  const [grantsTarget, setGrantsTarget] = useState<FileItem | null>(null)
  const [moveTarget, setMoveTarget] = useState<FileItem | null>(null)
  const [newFolder, setNewFolder] = useState<{
    category: FileCategory
    parent: string
  } | null>(null)
  const [renameTarget, setRenameTarget] = useState<{
    category: FileCategory
    node: FolderNode
  } | null>(null)
  const [delFolderTarget, setDelFolderTarget] = useState<{
    category: FileCategory
    node: FolderNode
  } | null>(null)

  const select = (category: FileCategory, folder: string) => {
    setSel({ category, folder })
    setPage((p) => ({ ...p, offset: 0 }))
  }
  const toggle = (key: string) =>
    setExpanded((s) => {
      const n = new Set(s)
      if (n.has(key)) n.delete(key)
      else n.add(key)
      return n
    })

  const ctl: TreeCtl = {
    selKey: folderKey(sel.category, sel.folder),
    expanded,
    canWrite,
    onSelect: select,
    onToggle: toggle,
    onNewSub: (category, parent) => setNewFolder({ category, parent }),
    onRename: (category, node) => setRenameTarget({ category, node }),
    onDelete: (category, node) => setDelFolderTarget({ category, node }),
  }

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const ext = extOf(file.name)
    if (!ALLOWED_EXT[sel.category].includes(ext)) {
      toast.error(t('invalidExt', { ext, category: t(`category.${sel.category}`) }))
      return
    }
    try {
      await upload.mutateAsync({
        file,
        category: sel.category,
        folder: sel.folder || undefined,
        confidential: uploadConfidential,
      })
      toast.success(t('uploaded'))
    } catch (err) {
      toastError(err)
    }
  }

  const items = filesQuery.data?.items ?? []
  const total = filesQuery.data?.total ?? 0
  const hasMore = page.offset + items.length < total
  const crumbs = sel.folder ? sel.folder.split('/') : []

  return (
    <div className="mx-auto max-w-[1200px] space-y-5">
      <PageHeader
        title={t('title')}
        titleI18n={{ key: 'title', ns: 'files' }}
        description={t('subtitle')}
        actions={
          canWrite && (
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-secondary-foreground flex items-center gap-1.5 text-[12.5px] font-medium">
                <Switch
                  checked={uploadConfidential}
                  onCheckedChange={setUploadConfidential}
                />
                <Lock className="text-muted-foreground size-3.5" />
                {t('confidential')}
              </label>
              <input ref={fileRef} type="file" className="hidden" onChange={onFile} />
              <Button
                onClick={() => fileRef.current?.click()}
                disabled={upload.isPending}
              >
                {upload.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                {t('folder.uploadHere')}
              </Button>
            </div>
          )
        }
      />

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        {/* —— 文件夹树 —— */}
        <Card className="gap-0 self-start p-2">
          <div className="text-muted-foreground px-1.5 pt-1 pb-1.5 text-[10.5px] font-bold tracking-[0.05em] uppercase">
            {t('folder.tree')}
          </div>
          {tree.isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="text-muted-foreground size-5 animate-spin" />
            </div>
          ) : tree.isError ? (
            <ErrorState error={tree.error} onRetry={() => tree.refetch()} />
          ) : (
            (tree.data?.categories ?? []).map((cat) => (
              <CategoryRow key={cat.category} cat={cat} ctl={ctl} />
            ))
          )}
        </Card>

        {/* —— 文件列表 —— */}
        <div className="min-w-0 space-y-3">
          <div className="flex items-center gap-1.5 text-[13px]">
            <span
              className="hover:text-foreground text-muted-foreground cursor-pointer font-semibold"
              onClick={() => select(sel.category, '')}
            >
              {t(`category.${sel.category}`)}
            </span>
            {crumbs.map((seg, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <span className="text-muted-foreground/40">/</span>
                <span
                  className="hover:text-foreground cursor-pointer"
                  onClick={() => select(sel.category, crumbs.slice(0, i + 1).join('/'))}
                >
                  {seg}
                </span>
              </span>
            ))}
          </div>

          {filesQuery.isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="text-muted-foreground size-6 animate-spin" />
            </div>
          ) : filesQuery.isError ? (
            <ErrorState
              error={filesQuery.error}
              onRetry={() => filesQuery.refetch()}
            />
          ) : items.length === 0 ? (
            <EmptyState title={t('folder.emptyHere')} />
          ) : (
            <Card className="gap-0 py-0">
              {items.map((f) => (
                <div
                  key={f.id}
                  className="border-divider flex items-center gap-3 border-b px-4 py-3 text-[13px] last:border-b-0"
                >
                  <span className="flex min-w-0 flex-1 items-center gap-1.5">
                    <span className="truncate font-semibold">{f.name}</span>
                    {f.confidential && (
                      <Badge variant="lock" className="rounded-[7px]">
                        <Lock className="size-3" />
                        {t('badge')}
                      </Badge>
                    )}
                  </span>
                  <span className="text-muted-foreground hidden w-24 shrink-0 text-right font-mono text-[11px] tabular-nums sm:block">
                    {formatBytes(f.size)}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() =>
                          filesApi.download(projectId, f.id, f.name).catch(toastError)
                        }
                      >
                        <Download className="size-4" />
                        {t('actions.download', { ns: 'common' })}
                      </DropdownMenuItem>
                      {canWrite && (
                        <DropdownMenuItem onClick={() => setMoveTarget(f)}>
                          <FolderInput className="size-4" />
                          {t('folder.move')}
                        </DropdownMenuItem>
                      )}
                      {canManage && (
                        <DropdownMenuItem
                          onClick={async () => {
                            try {
                              await setConf.mutateAsync({
                                id: f.id,
                                confidential: !f.confidential,
                              })
                              toast.success(t('confidentialChanged'))
                            } catch (e) {
                              toastError(e)
                            }
                          }}
                        >
                          <ShieldCheck className="size-4" />
                          {f.confidential ? t('unsetConfidential') : t('setConfidential')}
                        </DropdownMenuItem>
                      )}
                      {canManage && f.confidential && (
                        <DropdownMenuItem onClick={() => setGrantsTarget(f)}>
                          <Lock className="size-4" />
                          {t('grants.manage')}
                        </DropdownMenuItem>
                      )}
                      {canWrite && (
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDelTarget(f)}
                        >
                          <Trash2 className="size-4" />
                          {t('actions.delete', { ns: 'common' })}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </Card>
          )}

          {(page.offset > 0 || hasMore) && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page.offset === 0}
                onClick={() =>
                  setPage((p) => ({ ...p, offset: Math.max(0, p.offset - p.limit) }))
                }
              >
                {t('table.prev', { ns: 'common' })}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!hasMore}
                onClick={() => setPage((p) => ({ ...p, offset: p.offset + p.limit }))}
              >
                {t('table.next', { ns: 'common' })}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* —— 文件删除 —— */}
      <ConfirmDialog
        open={!!delTarget}
        onOpenChange={(o) => !o && setDelTarget(null)}
        title={t('deleteTitle')}
        description={t('deleteDesc', { name: delTarget?.name })}
        destructive
        loading={del.isPending}
        onConfirm={async () => {
          if (!delTarget) return
          try {
            await del.mutateAsync(delTarget.id)
            toast.success(t('deleted'))
            setDelTarget(null)
          } catch (e) {
            toastError(e)
          }
        }}
      />

      {/* —— 删文件夹（非空需级联） —— */}
      <ConfirmDialog
        open={!!delFolderTarget}
        onOpenChange={(o) => !o && setDelFolderTarget(null)}
        title={t('folder.delete')}
        description={
          delFolderTarget &&
          (delFolderTarget.node.total_count > 0
            ? t('folder.deleteRecursive', {
                name: delFolderTarget.node.name,
                count: delFolderTarget.node.total_count,
              })
            : t('folder.deleteEmpty', { name: delFolderTarget.node.name }))
        }
        destructive
        loading={deleteFolder.isPending}
        onConfirm={async () => {
          if (!delFolderTarget) return
          try {
            await deleteFolder.mutateAsync({
              category: delFolderTarget.category,
              path: delFolderTarget.node.path,
              recursive: delFolderTarget.node.total_count > 0,
            })
            toast.success(t('folder.deleted'))
            if (sel.folder.startsWith(delFolderTarget.node.path))
              select(delFolderTarget.category, '')
            setDelFolderTarget(null)
          } catch (e) {
            toastError(e)
          }
        }}
      />

      {grantsTarget && (
        <FileGrantsDialog
          projectId={projectId}
          file={grantsTarget}
          open={!!grantsTarget}
          onOpenChange={(o) => !o && setGrantsTarget(null)}
        />
      )}

      <NewFolderDialog
        target={newFolder}
        onClose={() => setNewFolder(null)}
        pending={createFolder.isPending}
        onSubmit={async (name) => {
          if (!newFolder) return
          const path = newFolder.parent ? `${newFolder.parent}/${name}` : name
          try {
            await createFolder.mutateAsync({ category: newFolder.category, path })
            toast.success(t('folder.created'))
            setExpanded((s) =>
              new Set(s).add(folderKey(newFolder.category, newFolder.parent)),
            )
            setNewFolder(null)
          } catch (e) {
            toastError(e)
          }
        }}
      />

      <RenameFolderDialog
        target={renameTarget}
        onClose={() => setRenameTarget(null)}
        pending={renameFolder.isPending}
        onSubmit={async (name) => {
          if (!renameTarget) return
          const parts = renameTarget.node.path.split('/')
          parts[parts.length - 1] = name
          try {
            await renameFolder.mutateAsync({
              category: renameTarget.category,
              from_path: renameTarget.node.path,
              to_path: parts.join('/'),
            })
            toast.success(t('folder.renamed'))
            setRenameTarget(null)
          } catch (e) {
            toastError(e)
          }
        }}
      />

      <MoveFileDialog
        file={moveTarget}
        tree={tree.data?.categories ?? []}
        onClose={() => setMoveTarget(null)}
        pending={moveFile.isPending}
        onSubmit={async (folder) => {
          if (!moveTarget) return
          try {
            await moveFile.mutateAsync({ fileId: moveTarget.id, folder })
            toast.success(t('folder.moved'))
            setMoveTarget(null)
          } catch (e) {
            toastError(e)
          }
        }}
      />
    </div>
  )
}

function NewFolderDialog({
  target,
  onClose,
  onSubmit,
  pending,
}: {
  target: { category: FileCategory; parent: string } | null
  onClose: () => void
  onSubmit: (name: string) => void
  pending: boolean
}) {
  const { t } = useTranslation('files')
  const [name, setName] = useState('')
  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('folder.new')}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (name.trim()) onSubmit(name.trim())
          }}
          className="space-y-3"
        >
          <Input
            autoFocus
            placeholder={t('folder.namePlaceholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <DialogFooter>
            <Button type="submit" disabled={!name.trim() || pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              {t('folder.new')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function RenameFolderDialog({
  target,
  onClose,
  onSubmit,
  pending,
}: {
  target: { category: FileCategory; node: FolderNode } | null
  onClose: () => void
  onSubmit: (name: string) => void
  pending: boolean
}) {
  const { t } = useTranslation('files')
  const [name, setName] = useState('')
  return (
    <Dialog
      open={!!target}
      onOpenChange={(o) => {
        if (!o) onClose()
        else setName(target?.node.name ?? '')
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('folder.renameTitle')}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (name.trim()) onSubmit(name.trim())
          }}
          className="space-y-3"
        >
          <Input
            autoFocus
            placeholder={t('folder.namePlaceholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <DialogFooter>
            <Button type="submit" disabled={!name.trim() || pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              {t('folder.rename')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function MoveFileDialog({
  file,
  tree,
  onClose,
  onSubmit,
  pending,
}: {
  file: FileItem | null
  tree: FolderCategory[]
  onClose: () => void
  onSubmit: (folder: string) => void
  pending: boolean
}) {
  const { t } = useTranslation('files')
  const [folder, setFolder] = useState('')
  const cat = file ? tree.find((c) => c.category === file.category) : undefined
  const options = cat ? flattenFolders(cat) : []

  return (
    <Dialog
      open={!!file}
      onOpenChange={(o) => {
        if (!o) onClose()
        else setFolder(file?.folder ?? '')
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('folder.moveTitle')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>{t('folder.moveTo')}</Label>
            <Select value={folder || '__root'} onValueChange={(v) => setFolder(v === '__root' ? '' : v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__root">{t('folder.root')}</SelectItem>
                {options.map((o) => (
                  <SelectItem key={o.path} value={o.path}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button onClick={() => onSubmit(folder)} disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              {t('folder.move')}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
