/**
 * 侧栏导航的双语标签（中文主 + 英文注，对齐 design_handoff 原型：「我的项目 Projects」）。
 * en 仅在中文界面下传入；英文界面只显示本地化主标签。
 */
export function NavLabel({ zh, en }: { zh: string; en?: string }) {
  return (
    <span className="min-w-0 flex-1 truncate">
      {zh}
      {en && en !== zh && (
        <span className="ml-1.5 font-normal opacity-60">{en}</span>
      )}
    </span>
  )
}
