import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
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
import { useImportEntities } from '@/hooks/use-registry'
import { useToastError } from '@/hooks/use-toast-error'
import type { EntityType, ImportReport } from '@/api/registry'

export function ImportEntitiesDialog({
  projectId,
  type,
  open,
  onOpenChange,
}: {
  projectId: string
  type: EntityType
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const { t } = useTranslation('registry')
  const imp = useImportEntities(projectId, type.id)
  const toastError = useToastError()
  const fileRef = useRef<HTMLInputElement>(null)

  const [format, setFormat] = useState<'csv' | 'fasta'>('csv')
  const [content, setContent] = useState('')
  const [nameField, setNameField] = useState('')
  const [seqField, setSeqField] = useState('')
  const [report, setReport] = useState<ImportReport | null>(null)

  useEffect(() => {
    if (open) {
      setContent('')
      setReport(null)
    }
  }, [open])

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setContent(await file.text())
    if (file.name.toLowerCase().match(/\.(fa|fasta|fastq|fq)$/)) setFormat('fasta')
  }

  const submit = async () => {
    if (!content.trim()) {
      toast.error(t('import.empty'))
      return
    }
    try {
      const r = await imp.mutateAsync({
        body: content,
        format,
        name_field: format === 'fasta' && nameField ? nameField : undefined,
        seq_field: format === 'fasta' && seqField ? seqField : undefined,
      })
      setReport(r)
      toast.success(t('import.created', { count: r.created }))
    } catch (e) {
      toastError(e)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t('import.title')} · {type.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-end gap-2">
            <div className="space-y-1.5">
              <Label>{t('import.format')}</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as 'csv' | 'fasta')}>
                <SelectTrigger className="w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">{t('import.csv')}</SelectItem>
                  <SelectItem value="fasta">{t('import.fasta')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <input ref={fileRef} type="file" className="hidden" onChange={onFile} />
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="size-4" />
              {t('import.pickFile')}
            </Button>
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
                <p className="text-muted-foreground text-xs">{t('import.nameFieldHint')}</p>
              </div>
              <div className="space-y-1.5">
                <Label>{t('import.seqField')}</Label>
                <Input
                  placeholder="sequence"
                  value={seqField}
                  onChange={(e) => setSeqField(e.target.value)}
                />
                <p className="text-muted-foreground text-xs">{t('import.seqFieldHint')}</p>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="import-content">{t('import.content')}</Label>
            <Textarea
              id="import-content"
              className="h-40 font-mono text-xs"
              placeholder={t('import.contentPlaceholder')}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          {report && (
            <div className="space-y-2 rounded-md border p-3 text-sm">
              <p className="text-success font-medium">
                {t('import.created', { count: report.created })}
              </p>
              {report.failed.length > 0 && (
                <>
                  <p className="text-destructive font-medium">
                    {t('import.failedCount', { count: report.failed.length })}
                  </p>
                  <ul className="text-muted-foreground max-h-32 space-y-0.5 overflow-auto text-xs">
                    {report.failed.map((f, i) => (
                      <li key={i}>{t('import.rowError', { row: f.row, error: f.error })}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={imp.isPending}>
            {imp.isPending && <Loader2 className="size-4 animate-spin" />}
            {imp.isPending ? t('import.importing') : t('import.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
