import { cn } from '@/lib/utils'

/** 品牌方块底/字配色（原型项目/组织/企业卡片的彩色缩写块）。 */
const TINTS: ReadonlyArray<readonly [string, string]> = [
  ['#EAF0FF', '#2F6BFF'],
  ['#E7F6EC', '#15803D'],
  ['#F3EEFB', '#7C3AED'],
  ['#FEF1E7', '#C2741B'],
  ['#FBEAF2', '#BE185D'],
  ['#FEF4E6', '#B45309'],
]

/** 由种子稳定取一组配色。 */
export function tintOf(seed: string): readonly [string, string] {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return TINTS[h % TINTS.length]
}

/** 由名称派生 2 字缩写（取首词前两字）。 */
export function codeOf(name: string): string {
  const t = (name ?? '').trim()
  if (!t) return '—'
  const first = t.split(/[\s\-_/]+/).filter(Boolean)[0] ?? t
  return first.slice(0, 2).toUpperCase()
}

/** 彩色缩写方块。code 缺省由 name 派生；配色由 seed(缺省 name) 稳定取。 */
export function BrandTile({
  name,
  code,
  seed,
  size = 38,
  className,
}: {
  name: string
  code?: string
  seed?: string
  size?: number
  className?: string
}) {
  const [bg, fg] = tintOf(seed ?? name)
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center font-extrabold',
        className,
      )}
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.26),
        background: bg,
        color: fg,
        fontSize: Math.round(size * 0.34),
      }}
    >
      {code ?? codeOf(name)}
    </div>
  )
}
