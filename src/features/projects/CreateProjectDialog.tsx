import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateProject } from '@/hooks/use-projects'
import { useOrgs } from '@/hooks/use-orgs'
import { useToastError } from '@/hooks/use-toast-error'

/** 归属默认值：留空交后端回退到默认组织「我的工作区」。 */
const DEFAULT_WS = ''

/** 新建项目对话框：名称 + 描述 + 归属组织（默认「我的工作区」，可改其他组织）。 */
export function CreateProjectDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation('projects')
  const navigate = useNavigate()
  const create = useCreateProject()
  const orgs = useOrgs()
  const toastError = useToastError()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [org, setOrg] = useState(DEFAULT_WS)
  const orgList = orgs.data ?? []
  const defaultOrg = orgList.find((o) => o.is_default)
  // 选中值：空=默认工作区（用默认组织 id 回显，否则交后端兜底）。
  const selected = org || defaultOrg?.id || DEFAULT_WS

  const submit = async () => {
    if (!name.trim()) return
    try {
      const project = await create.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        organization_id: org || undefined,
      })
      toast.success(t('toast.created'))
      onOpenChange(false)
      setName('')
      setDescription('')
      setOrg(DEFAULT_WS)
      navigate(`/projects/${project.id}`)
    } catch (e) {
      toastError(e)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{t('create.title')}</DialogTitle>
          <DialogDescription>{t('subtitle')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="p-name">{t('create.name')}</Label>
            <Input
              id="p-name"
              placeholder={t('create.namePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-desc">{t('create.description')}</Label>
            <Textarea
              id="p-desc"
              rows={3}
              placeholder={t('create.descriptionPlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t('columns.organization')}</Label>
            <Select value={selected} onValueChange={setOrg}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {!defaultOrg && (
                  <SelectItem value={DEFAULT_WS}>
                    {t('card.defaultWorkspace')}
                  </SelectItem>
                )}
                {orgList.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.is_default ? `📌 ${o.name}` : o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('actions.cancel', { ns: 'common', defaultValue: '取消' })}
          </Button>
          <Button onClick={submit} disabled={!name.trim() || create.isPending}>
            {create.isPending && <Loader2 className="size-4 animate-spin" />}
            {t('create.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
