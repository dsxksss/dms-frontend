import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { useComponentTree, useEntityTypes, useLineage } from '@/hooks/use-registry'
import { shortId } from '@/lib/format'
import { tintOf } from '@/components/brand-tile'
import type { ComponentNode } from '@/api/registry'

/** 谱系 + 组合树（抽屉「谱系」Tab）。derived_from 上游 + has_component 嵌套。 */
export function ComponentTreeView({
  projectId,
  assetId,
}: {
  projectId: string
  assetId: string
}) {
  const { t } = useTranslation('registry')
  const types = useEntityTypes(projectId)
  const typeName = (id: string) =>
    types.data?.find((ty) => ty.id === id)?.name ?? id.slice(0, 6)

  const lineage = useLineage(projectId, assetId)
  const tree = useComponentTree(projectId, assetId)

  const upstream = (lineage.data ?? []).filter((n) => n.id !== assetId)
  const root = tree.data
  const hasChildren = root?.children && root.children.length > 0

  if (upstream.length === 0 && !hasChildren) {
    return (
      <p className="py-8 text-center text-[12.5px] text-muted-foreground">
        {t('drawer.noLineage')}
      </p>
    )
  }

  return (
    <div className="space-y-5">
      {upstream.length > 0 && (
        <section>
          <div className="mb-2 text-[12px] font-bold">{t('lineage.title')}</div>
          <div className="mb-1 text-[11.5px] text-muted-foreground">
            {t('lineage.desc')}
          </div>
          <div className="space-y-2">
            {upstream.map((n) => {
              const [bg, fg] = tintOf(n.id)
              return (
                <div
                  key={n.id}
                  className="flex items-center gap-2.5 rounded-[11px] border bg-surface-2 px-3 py-2.5"
                >
                  <div
                    className="flex size-[30px] items-center justify-center rounded-lg text-[10px] font-extrabold"
                    style={{ background: bg, color: fg }}
                  >
                    {shortId(n.id).slice(0, 3)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mono truncate text-[11px] text-muted-foreground">
                      {shortId(n.id)} · {typeName(n.type_id)}
                    </div>
                  </div>
                  <Badge variant="info" className="text-[10px]">
                    {t('relations.derived_from')}
                  </Badge>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {hasChildren && (
        <section>
          <div className="mb-2 text-[12px] font-bold">{t('tree.title')}</div>
          <div className="mb-1 text-[11.5px] text-muted-foreground">
            {t('tree.desc')}
          </div>
          <TreeNode node={root!} depth={0} typeName={typeName} isRoot />
        </section>
      )}
    </div>
  )
}

function TreeNode({
  node,
  depth,
  typeName,
  isRoot,
}: {
  node: ComponentNode
  depth: number
  typeName: (id: string) => string
  isRoot?: boolean
}) {
  const { t } = useTranslation('registry')
  const [bg, fg] = tintOf(node.id)
  return (
    <div style={{ paddingLeft: depth * 22 }}>
      <div
        className="mb-2 flex items-center gap-2.5 rounded-[11px] border px-3 py-2.5"
        style={isRoot ? { borderColor: '#2F6BFF' } : undefined}
      >
        <div
          className="flex size-[30px] items-center justify-center rounded-lg text-[10px] font-extrabold"
          style={{ background: bg, color: fg }}
        >
          {shortId(node.id).slice(0, 3)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mono truncate text-[11px] text-muted-foreground">
            {shortId(node.id)} · {typeName(node.type_id)}
          </div>
        </div>
        {!isRoot && (
          <Badge variant="warning" className="text-[10px]">
            {t('relations.has_component')}
          </Badge>
        )}
      </div>
      {node.children?.map((c) => (
        <TreeNode key={c.id} node={c} depth={depth + 1} typeName={typeName} />
      ))}
    </div>
  )
}
