/** UUID 短显示（表格中省空间，hover/复制看全量）。 */
export function shortId(id: string | null | undefined): string {
  if (!id) return '-'
  return id.length > 8 ? id.slice(0, 8) : id
}

/** ISO/可解析时间 → 本地化字符串。无法解析则原样返回。 */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString()
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let v = bytes / 1024
  let i = 0
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${v.toFixed(1)} ${units[i]}`
}
