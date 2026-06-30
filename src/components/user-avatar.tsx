import { cn } from '@/lib/utils'

/** 头像调色板（原型强调点缀色）。由 seed 稳定取色，保证同一用户颜色一致。 */
const PALETTE = [
  '#2F6BFF',
  '#16A34A',
  '#C77B16',
  '#7C3AED',
  '#0E9AB5',
  '#DB2777',
  '#B45309',
  '#15803D',
]

function colorFor(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}

/** 取首字母：ASCII 名取词首字母（最多 2），中文名取前两字。 */
export function initialsOf(name: string): string {
  const t = (name ?? '').trim()
  if (!t) return '?'
  if (/^[\x20-\x7f]+$/.test(t)) {
    const parts = t.split(/\s+/).filter(Boolean)
    const s = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : t.slice(0, 2)
    return s.toUpperCase()
  }
  return t.slice(0, 2)
}

/** 彩色首字母头像（原型 .av）。color 缺省时由 name/id 稳定取色。 */
export function UserAvatar({
  name,
  seed,
  size = 24,
  color,
  className,
  ring,
}: {
  name: string
  /** 取色种子（缺省用 name）；同一用户传相同 seed 颜色稳定。 */
  seed?: string
  size?: number
  color?: string
  className?: string
  /** 叠放头像组的白描边。 */
  ring?: boolean
}) {
  return (
    <div
      className={cn('av', className)}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(9, Math.round(size * 0.42)),
        background: color ?? colorFor(seed ?? name),
        boxShadow: ring ? '0 0 0 2px #fff' : undefined,
      }}
      title={name}
    >
      {initialsOf(name)}
    </div>
  )
}
