import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Loader2, Lock } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useDatasetFromRegistry } from '@/hooks/use-datasets'
import { useSign } from '@/hooks/use-signatures'
import { useToastError } from '@/hooks/use-toast-error'
import { AppError } from '@/lib/errors'
import { isWemol } from '@/lib/edition'
import { sha256Hex } from '@/lib/sha256'
import { InfoHint } from '@/components/info-hint'
import type { EntityType } from '@/api/registry'
import {
  DatasetMetaFields,
  emptyMeta,
  normalizeMeta,
  type DatasetMetaValue,
} from './DatasetMetaFields'

/**
 * 数据转数据集：从某资产类型/数据模版的项目记录选字段 → 脱敏 → 生成数据集 + 溯源。
 * 取消脱敏(导出原始敏感字段)仅 Manager+ 可选，且须先对该类型 approved 电子签名(FR-PERM-04)。
 */
export function FromRegistryDialog({
  projectId,
  type,
  canManage,
  open,
  onOpenChange,
}: {
  projectId: string
  type: EntityType
  canManage: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation('datasets')
  const navigate = useNavigate()
  const toastError = useToastError()
  const convert = useDatasetFromRegistry(projectId)
  const sign = useSign(projectId)

  const [name, setName] = useState('')
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [maskSensitive, setMaskSensitive] = useState(true)
  const [refMode, setRefMode] = useState<'name' | 'content' | 'id' | 'raw'>('name')
  const [password, setPassword] = useState('')
  const [loginName, setLoginName] = useState('')
  const [meta, setMeta] = useState<DatasetMetaValue>(emptyMeta())

  const hasRefs = type.fields.some((f) => f.type === 'reference')

  useEffect(() => {
    if (open) {
      setName(`${type.name} dataset`)
      // 默认勾选非敏感字段（敏感默认排除/脱敏）。
      setPicked(new Set(type.fields.filter((f) => !f.sensitive).map((f) => f.name)))
      setMaskSensitive(true)
      setRefMode('name')
      setPassword('')
      setLoginName('')
      setMeta(emptyMeta())
    }
  }, [open, type])

  const toggle = (field: string) =>
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(field)) next.delete(field)
      else next.add(field)
      return next
    })

  const rawSensitive = !maskSensitive
  const pending = convert.isPending || sign.isPending
  const canSubmit =
    !!name.trim() && picked.size > 0 && (!rawSensitive || !!password) && !pending

  const submit = async () => {
    if (!canSubmit) return
    try {
      // 导出原始敏感字段：先对该资产类型 approved 电子签名（合规门，21 CFR Part 11）。
      // content_hash 口径 `kind:id:name`，便于事后核对。
      if (rawSensitive) {
        await sign.mutateAsync({
          target_kind: 'asset_type',
          target_id: type.id,
          meaning: 'approved',
          reason: 'export raw sensitive fields to dataset',
          content_hash: await sha256Hex(`asset_type:${type.id}:${type.name}`),
          password,
          // WeMol SSO 用户用 WeMol 登录名+密码再认证；留空则后端回退到显示名。
          ...(isWemol && loginName.trim() ? { login_name: loginName.trim() } : {}),
        })
      }
      const dataset = await convert.mutateAsync({
        name: name.trim(),
        type_id: type.id,
        fields: Array.from(picked),
        mask_sensitive: maskSensitive,
        reference_mode: refMode,
        ...normalizeMeta(meta),
      })
      toast.success(t('fromRegistry.done'))
      onOpenChange(false)
      navigate(`/projects/${projectId}/datasets/${dataset.id}`)
    } catch (e) {
      // 后端在缺有效 approved 电子签名时对 from-registry 返回 422（FR-PERM-04）：明确提示去签名。
      if (rawSensitive && e instanceof AppError && e.status === 422) {
        toast.error(t('fromRegistry.needEsign'))
      } else {
        toastError(e)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{t('fromRegistry.title')}</DialogTitle>
          <DialogDescription>
            {t('fromRegistry.subtitle', { type: type.name })}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-4 overflow-auto px-0.5">
          <div className="space-y-1.5">
            <Label htmlFor="fr-name">{t('create.name')}</Label>
            <Input
              id="fr-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t('fromRegistry.fields')}</Label>
            <div className="space-y-1 rounded-[8px] border p-2">
              {type.fields.map((f) => {
                const locked = f.sensitive && maskSensitive
                return (
                  <label
                    key={f.name}
                    className="flex items-center gap-2 rounded px-1.5 py-1 text-[13px] hover:bg-accent/50"
                  >
                    <Checkbox
                      checked={picked.has(f.name)}
                      disabled={locked}
                      onCheckedChange={() => toggle(f.name)}
                    />
                    <span className={locked ? 'text-muted-foreground' : ''}>
                      {f.name}
                    </span>
                    {f.sensitive && <Lock className="size-3 text-[#E0492C]" />}
                  </label>
                )
              })}
            </div>
            {maskSensitive && type.fields.some((f) => f.sensitive) && (
              <p className="text-[11px] text-muted-foreground">
                {t('fromRegistry.maskedHint')}
              </p>
            )}
          </div>

          {canManage && (
            <div className="flex items-center justify-between rounded-[8px] border px-3 py-2.5">
              <div className="pr-3">
                <div className="flex items-center gap-1.5 text-[13px] font-semibold">
                  {t('fromRegistry.rawSensitive')}
                  <InfoHint>{t('fromRegistry.rawSensitiveTip')}</InfoHint>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {t('fromRegistry.rawSensitiveHint')}
                </div>
              </div>
              <Switch
                checked={rawSensitive}
                onCheckedChange={(c) => setMaskSensitive(!c)}
              />
            </div>
          )}

          {/* 引用列导出形态：仅当类型含 reference 字段时显示。 */}
          {hasRefs && (
            <div className="space-y-1.5 rounded-[8px] border px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-[13px] font-semibold">
                {t('fromRegistry.refMode')}
                <InfoHint>{t('fromRegistry.refModeTip')}</InfoHint>
              </div>
              <Select
                value={refMode}
                onValueChange={(v) => setRefMode(v as typeof refMode)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">{t('fromRegistry.refModeName')}</SelectItem>
                  <SelectItem value="content">
                    {t('fromRegistry.refModeContent')}
                  </SelectItem>
                  <SelectItem value="id">{t('fromRegistry.refModeId')}</SelectItem>
                  <SelectItem value="raw">{t('fromRegistry.refModeRaw')}</SelectItem>
                </SelectContent>
              </Select>
              {/* 内容模式 + 仍脱敏 → 提醒：序列/结构是敏感字段，要明文得开原始导出 */}
              {refMode === 'content' && maskSensitive && (
                <p className="text-[11px] text-[#B45309]">
                  {t('fromRegistry.refModeContentMaskedHint')}
                </p>
              )}
            </div>
          )}

          {rawSensitive && (
            <div className="space-y-2">
              {isWemol && (
                <div className="space-y-1.5">
                  <Label htmlFor="fr-login" className="flex items-center gap-1.5">
                    {t('fromRegistry.esignLoginName')}
                    <InfoHint>{t('fromRegistry.esignLoginTip')}</InfoHint>
                  </Label>
                  <Input
                    id="fr-login"
                    autoComplete="off"
                    placeholder={t('fromRegistry.esignLoginHint')}
                    value={loginName}
                    onChange={(e) => setLoginName(e.target.value)}
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="fr-pass" className="flex items-center gap-1.5">
                  {isWemol
                    ? t('fromRegistry.esignWemolPassword')
                    : t('fromRegistry.esignPassword')}
                  <InfoHint>{t('fromRegistry.esignTip')}</InfoHint>
                </Label>
                <Input
                  id="fr-pass"
                  type="password"
                  autoComplete="off"
                  placeholder={t('fromRegistry.esignHint')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
          )}

          <DatasetMetaFields value={meta} onChange={setMeta} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('actions.cancel', { ns: 'common', defaultValue: '取消' })}
          </Button>
          <Button onClick={submit} disabled={!canSubmit}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            {t('fromRegistry.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
