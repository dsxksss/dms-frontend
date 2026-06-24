import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Loader2, Upload } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { InfoHint } from '@/components/info-hint'
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
import { useImportEntities } from '@/hooks/use-registry'
import { useToastError } from '@/hooks/use-toast-error'

/** 批量导入实体（CSV / FASTA）。typeId = 目标药物资产类型。 */
export function ImportEntitiesDialog({
  projectId,
  typeId,
  open,
  onOpenChange,
}: {
  projectId: string
  typeId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation('registry')
  const importer = useImportEntities(projectId, typeId)
  const toastError = useToastError()
  const fileRef = useRef<HTMLInputElement>(null)
  const [format, setFormat] = useState<'csv' | 'fasta'>('csv')
  const [body, setBody] = useState('')
  const [nameField, setNameField] = useState('')
  const [seqField, setSeqField] = useState('')

  const onFile = async (file?: File) => {
    if (file) setBody(await file.text())
  }

  const submit = async () => {
    if (!body.trim()) return
    try {
      const report = await importer.mutateAsync({
        body,
        format,
        name_field: nameField || undefined,
        seq_field: seqField || undefined,
      })
      toast.success(t('import.created', { count: report.created }))
      if (report.failed.length) {
        toast.error(t('import.failedCount', { count: report.failed.length }))
      }
      onOpenChange(false)
      setBody('')
    } catch (e) {
      toastError(e)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{t('import.title')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              {t('import.format')}
              <InfoHint>{t('import.formatHint')}</InfoHint>
            </Label>
            <Select
              value={format}
              onValueChange={(v) => setFormat(v as 'csv' | 'fasta')}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">{t('import.csv')}</SelectItem>
                <SelectItem value="fasta">{t('import.fasta')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {format === 'fasta' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t('import.nameField')}</Label>
                <Input
                  placeholder="name"
                  value={nameField}
                  onChange={(e) => setNameField(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t('import.seqField')}</Label>
                <Input
                  placeholder="sequence"
                  value={seqField}
                  onChange={(e) => setSeqField(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>{t('import.content')}</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="size-4" />
                {t('import.pickFile')}
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.fasta,.fa,.txt"
                hidden
                onChange={(e) => onFile(e.target.files?.[0])}
              />
            </div>
            <Textarea
              rows={8}
              className="mono text-[12px]"
              placeholder={t('import.contentPlaceholder')}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('actions.cancel', { ns: 'common', defaultValue: '取消' })}
          </Button>
          <Button onClick={submit} disabled={!body.trim() || importer.isPending}>
            {importer.isPending && <Loader2 className="size-4 animate-spin" />}
            {t('import.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
