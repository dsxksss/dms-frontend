import { Badge } from '@/components/ui/badge'
import { shortId } from '@/lib/format'
import type { ComponentNode } from '@/api/registry'

/** 递归渲染组合树（嵌套 has_component 结构）。 */
export function ComponentTreeView({
  node,
  typeMap,
  depth = 0,
}: {
  node: ComponentNode
  typeMap: Record<string, string>
  depth?: number
}) {
  return (
    <div className={depth > 0 ? 'border-border/60 ml-3 border-l pl-3' : ''}>
      <div className="flex items-center gap-2 py-1">
        <span className="font-mono text-sm">{shortId(node.id)}</span>
        <Badge variant="secondary" className="text-xs">
          {typeMap[node.type_id] ?? shortId(node.type_id)}
        </Badge>
      </div>
      {node.children.map((c) => (
        <ComponentTreeView
          key={c.id}
          node={c}
          typeMap={typeMap}
          depth={depth + 1}
        />
      ))}
    </div>
  )
}
