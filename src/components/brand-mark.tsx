/** 品牌标记：渐变圆角方块 + 白色烧瓶图标（原型 logo）。 */
export function BrandMark({ size = 30 }: { size?: number }) {
  const inner = Math.round(size * 0.57)
  return (
    <div
      className="flex items-center justify-center"
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.27),
        background: 'linear-gradient(135deg,#2F6BFF,#5B8DEF)',
      }}
    >
      <svg
        width={inner}
        height={inner}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinecap="round"
      >
        <path d="M9 3h6M9 3v5l-4.5 8A2.5 2.5 0 0 0 6.8 20h10.4a2.5 2.5 0 0 0 2.3-3.6L15 8V3" />
        <path d="M7.5 14h9" />
      </svg>
    </div>
  )
}

/** 平台控制台标记：紫色渐变 + 盾牌图标（深色侧栏）。 */
export function PlatformMark({ size = 30 }: { size?: number }) {
  const inner = Math.round(size * 0.53)
  return (
    <div
      className="flex items-center justify-center"
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.27),
        background: 'linear-gradient(135deg,#6D5BD0,#8E7DE8)',
      }}
    >
      <svg
        width={inner}
        height={inner}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#fff"
        strokeWidth="2.1"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    </div>
  )
}
