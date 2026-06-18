/**
 * 资源「彩色字母方块」——由名称派生短码 + 由稳定 seed(id) 派生 tint 配色。
 * 用于项目/组织/企业等卡片，复刻 design_handoff 原型的 Benchling 式图标块。
 */

const TINTS: ReadonlyArray<readonly [string, string]> = [
  ['#EAF0FF', '#2F6BFF'],
  ['#E7F6EC', '#15803D'],
  ['#F3EEFB', '#7C3AED'],
  ['#FEF1E7', '#C2741B'],
  ['#FBEAF2', '#BE185D'],
  ['#E6F6F8', '#0E9AB5'],
]

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

/** 由名称取 ~2 字短码：多词取首字母，单词/中文取前两字。 */
export function codeOf(name: string): string {
  const parts = name.trim().split(/[\s\-_/]+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return (name.trim().slice(0, 2) || '?').toUpperCase()
}

/** 由 seed（建议传 id，稳定）取一组 {bg,fg} tint。 */
export function tintOf(seed: string): { bg: string; fg: string } {
  const [bg, fg] = TINTS[hash(seed) % TINTS.length]
  return { bg, fg }
}
