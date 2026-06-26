/**
 * 把从操作系统文件浏览器拖拽进来的 `DataTransfer` 递归展开成「文件 + 相对文件夹」与
 * 「（空）文件夹」清单。支持拖入**整个文件夹**（经 `webkitGetAsEntry` 走 FileSystem 目录树）。
 * 浏览器不支持 entry API 时退回为扁平文件列表（无目录结构）。
 */

export interface DroppedFile {
  file: File
  /** 相对拖放根的文件夹路径（不含文件名）；顶层文件为 ''。 */
  folder: string
}

export interface DroppedItems {
  files: DroppedFile[]
  /** 拖放中出现过的所有文件夹路径（相对拖放根）。 */
  dirs: string[]
}

/** `DataTransfer.types` 是否包含文件（用于区分 OS 文件拖拽 vs 页面内文本拖拽）。 */
export function dndHasFiles(e: { dataTransfer: DataTransfer | null }): boolean {
  return Array.from(e.dataTransfer?.types ?? []).includes('Files')
}

function readEntries(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  // readEntries 每次最多返回一批，须反复调用直到返回空数组。
  return new Promise((resolve, reject) => {
    const acc: FileSystemEntry[] = []
    const pump = () =>
      reader.readEntries((batch) => {
        if (batch.length === 0) resolve(acc)
        else {
          acc.push(...batch)
          pump()
        }
      }, reject)
    pump()
  })
}

function entryFile(entry: FileSystemFileEntry): Promise<File> {
  return new Promise((resolve, reject) => entry.file(resolve, reject))
}

async function walk(
  entry: FileSystemEntry,
  parent: string,
  out: DroppedItems,
): Promise<void> {
  if (entry.isFile) {
    const file = await entryFile(entry as FileSystemFileEntry)
    out.files.push({ file, folder: parent })
    return
  }
  if (entry.isDirectory) {
    const dir = parent ? `${parent}/${entry.name}` : entry.name
    out.dirs.push(dir)
    const children = await readEntries(
      (entry as FileSystemDirectoryEntry).createReader(),
    )
    for (const child of children) await walk(child, dir, out)
  }
}

/**
 * 解析拖放数据为待上传清单。**注意**：`DataTransfer` 在首个 `await` 后即失效，故先同步快照
 * 所有 entry / file 再异步遍历。
 */
export async function collectDropped(dt: DataTransfer): Promise<DroppedItems> {
  const out: DroppedItems = { files: [], dirs: [] }
  // 同步快照（await 后 dt.items / dt.files 不可再访问）。
  const entries: FileSystemEntry[] = []
  for (const item of Array.from(dt.items)) {
    if (item.kind !== 'file') continue
    const entry = item.webkitGetAsEntry?.()
    if (entry) entries.push(entry)
  }
  const flat = Array.from(dt.files)

  if (entries.length > 0) {
    for (const e of entries) await walk(e, '', out)
  } else {
    for (const f of flat) out.files.push({ file: f, folder: '' })
  }
  return out
}

/** 限并发地依次处理（避免同时发起几十个上传请求）。 */
export async function runPool<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let i = 0
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (i < items.length) {
        const idx = i++
        await fn(items[idx])
      }
    },
  )
  await Promise.all(workers)
}
