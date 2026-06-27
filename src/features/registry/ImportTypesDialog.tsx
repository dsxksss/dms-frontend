import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Boxes, FlaskConical, Loader2, Sparkles } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { useDrugRdCatalog, useEntityTypes } from '@/hooks/use-registry'
import { useToastError } from '@/hooks/use-toast-error'
import { registryApi } from '@/api/registry'
import type { EntityType, FieldDef, FieldDefInput } from '@/api/registry'

const toInput = (f: FieldDef): FieldDefInput => ({
  name: f.name,
  type: f.type,
  required: f.required,
  unique: f.unique,
  sensitive: f.sensitive,
  options: f.options,
  ...(f.ref_type ? { ref_type: f.ref_type } : {}),
})

/** 选择性导入内置类型：左=系统自带目录（选择性 seed）、右=组织自带类型（复制成项目类型）。 */
export function ImportTypesDialog({
  projectId,
  open,
  onOpenChange,
}: {
  projectId: string
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const { t } = useTranslation('registry')
  const qc = useQueryClient()
  const toastError = useToastError()
  const catalog = useDrugRdCatalog(projectId, open)
  const types = useEntityTypes(projectId)

  const [sysSel, setSysSel] = useState<Set<string>>(() => new Set())
  const [orgSel, setOrgSel] = useState<Set<string>>(() => new Set())
  const [busy, setBusy] = useState(false)

  // 项目自有（project 作用域）类型的 key——据此判断目录项是否已导入、组织类型是否已复制。
  const projectKeys = useMemo(
    () =>
      new Set(
        (types.data ?? []).filter((ty) => ty.scope === 'project').map((ty) => ty.key),
      ),
    [types.data],
  )
  // 组织自带类型（自动并入项目可见，scope=organization）。
  const orgTypes = useMemo(
    () => (types.data ?? []).filter((ty) => ty.scope === 'organization'),
    [types.data],
  )

  const toggle = (set: Set<string>, setSet: (s: Set<string>) => void, id: string) => {
    const next = new Set(set)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSet(next)
  }

  const total = sysSel.size + orgSel.size

  const onImport = async () => {
    setBusy(true)
    let copiedOrg = 0
    let failedOrg = 0
    try {
      if (sysSel.size > 0) {
        await registryApi.seedDrugRd(projectId, [...sysSel])
      }
      for (const id of orgSel) {
        const ty = orgTypes.find((o) => o.id === id)
        if (!ty) continue
        try {
          await registryApi.createType(projectId, ty.kind, {
            key: ty.key,
            name: ty.name,
            fields: ty.fields.map(toInput),
            ...(ty.bound_asset_type_id
              ? { bound_asset_type_id: ty.bound_asset_type_id }
              : {}),
          })
          copiedOrg++
        } catch {
          failedOrg++ // 多为同 key 已存在，跳过。
        }
      }
      await qc.invalidateQueries({ queryKey: ['registry', projectId] })
      toast.success(
        t('types.importDone', { system: sysSel.size, org: copiedOrg }),
      )
      if (failedOrg > 0) toast.message(t('types.importSkipped', { count: failedOrg }))
      setSysSel(new Set())
      setOrgSel(new Set())
      onOpenChange(false)
    } catch (e) {
      toastError(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="flex max-h-[82vh] flex-col gap-3 sm:max-w-[760px]">
        <DialogHeader>
          <DialogTitle>{t('types.importTitle')}</DialogTitle>
          <DialogDescription>{t('types.importDesc')}</DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 gap-3 sm:grid-cols-2">
          {/* 系统自带 */}
          <Column
            icon={<Sparkles className="size-4 text-brand" />}
            title={t('types.sourceSystem')}
            count={catalog.data?.length ?? 0}
            loading={catalog.isLoading}
          >
            {(catalog.data ?? []).map((c) => {
              const imported = projectKeys.has(c.key)
              return (
                <ImportRow
                  key={c.key}
                  checked={sysSel.has(c.key) || imported}
                  disabled={imported}
                  onToggle={() => toggle(sysSel, setSysSel, c.key)}
                  icon={
                    c.kind === 'asset' ? (
                      <FlaskConical className="size-3.5" />
                    ) : (
                      <Boxes className="size-3.5" />
                    )
                  }
                  name={c.name}
                  subtitle={c.key}
                  meta={
                    imported
                      ? t('types.imported')
                      : t('types.fieldCount', { count: c.field_count })
                  }
                />
              )
            })}
          </Column>

          {/* 组织自带 */}
          <Column
            icon={<Boxes className="size-4 text-muted-foreground" />}
            title={t('types.sourceOrg')}
            count={orgTypes.length}
            loading={types.isLoading}
            empty={t('types.orgEmpty')}
          >
            {orgTypes.map((o: EntityType) => {
              const copied = projectKeys.has(o.key)
              return (
                <ImportRow
                  key={o.id}
                  checked={orgSel.has(o.id) || copied}
                  disabled={copied}
                  onToggle={() => toggle(orgSel, setOrgSel, o.id)}
                  icon={
                    o.kind === 'asset' ? (
                      <FlaskConical className="size-3.5" />
                    ) : (
                      <Boxes className="size-3.5" />
                    )
                  }
                  name={o.name}
                  subtitle={o.key}
                  meta={
                    copied
                      ? t('types.imported')
                      : t('types.fieldCount', { count: o.fields.length })
                  }
                />
              )
            })}
          </Column>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            {t('actions.cancel', { ns: 'common', defaultValue: '取消' })}
          </Button>
          <Button onClick={onImport} disabled={busy || total === 0}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            {t('types.importSelected', { count: total })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Column({
  icon,
  title,
  count,
  loading,
  empty,
  children,
}: {
  icon: React.ReactNode
  title: string
  count: number
  loading?: boolean
  empty?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-0 flex-col rounded-lg border border-divider">
      <div className="flex items-center gap-2 border-b border-divider px-3 py-2 text-[12.5px] font-semibold">
        {icon}
        {title}
        <span className="ml-auto rounded-full bg-surface-2 px-1.5 py-px text-[11px] text-muted-foreground">
          {count}
        </span>
      </div>
      <div className="min-h-[220px] flex-1 space-y-0.5 overflow-auto p-1.5">
        {loading ? (
          <div className="flex h-[200px] items-center justify-center text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
          </div>
        ) : count === 0 ? (
          <div className="flex h-[200px] items-center justify-center px-4 text-center text-[12.5px] text-muted-foreground">
            {empty ?? '—'}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}

function ImportRow({
  checked,
  disabled,
  onToggle,
  icon,
  name,
  subtitle,
  meta,
}: {
  checked: boolean
  disabled?: boolean
  onToggle: () => void
  icon: React.ReactNode
  name: string
  subtitle: string
  meta: string
}) {
  return (
    <label
      className={cn(
        'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px]',
        disabled ? 'opacity-55' : 'cursor-pointer hover:bg-surface-2',
      )}
    >
      <Checkbox checked={checked} disabled={disabled} onCheckedChange={onToggle} />
      <span className="flex size-4 shrink-0 items-center justify-center text-muted-foreground">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{name}</span>
        <span className="mono block truncate text-[11px] text-muted-foreground">
          {subtitle}
        </span>
      </span>
      <span className="shrink-0 text-[11px] text-muted-foreground">{meta}</span>
    </label>
  )
}
