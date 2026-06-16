import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useEntities, useEntity, useEntityTypes } from '@/hooks/use-registry'
import { shortId } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Entity } from '@/api/registry'

export function entityLabel(e: Entity): string {
  const name = e.data?.name ?? e.data?.key
  return typeof name === 'string' && name ? name : shortId(e.id)
}

/** 选引用实体：先选类型，再在可搜索下拉里挑实体。返回实体 id。已有值时回显类型与名称。 */
export function EntityPicker({
  projectId,
  value,
  onChange,
  excludeId,
}: {
  projectId: string
  value?: string
  onChange: (entityId: string | undefined) => void
  excludeId?: string
}) {
  const { t } = useTranslation('registry')
  const types = useEntityTypes(projectId)
  const [typeId, setTypeId] = useState<string>('')
  const [open, setOpen] = useState(false)

  // 回显：有值但未选类型时，拉取该实体以推断类型并显示名称。
  const valueEntity = useEntity(projectId, value ?? '', !!value && !typeId)
  useEffect(() => {
    if (value && !typeId && valueEntity.data) setTypeId(valueEntity.data.type_id)
  }, [value, typeId, valueEntity.data])

  const entities = useEntities(projectId, { type: typeId, limit: 100 }, !!typeId)

  const merged = [...(entities.data?.items ?? [])]
  if (valueEntity.data && !merged.some((e) => e.id === valueEntity.data!.id)) {
    merged.unshift(valueEntity.data)
  }
  const options = merged.filter((e) => e.id !== excludeId)
  const selected = options.find((e) => e.id === value)
  const selectedLabel = selected
    ? entityLabel(selected)
    : valueEntity.data
      ? entityLabel(valueEntity.data)
      : ''

  return (
    <div className="grid grid-cols-2 gap-2">
      <Select value={typeId} onValueChange={setTypeId}>
        <SelectTrigger>
          <SelectValue placeholder={t('picker.type')} />
        </SelectTrigger>
        <SelectContent>
          {(types.data ?? []).map((ty) => (
            <SelectItem key={ty.id} value={ty.id}>
              {ty.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            disabled={!typeId}
            className="justify-between font-normal"
          >
            <span className="truncate">
              {selectedLabel || t('picker.entity')}
            </span>
            <ChevronsUpDown className="text-muted-foreground size-4 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput placeholder={t('picker.search')} />
            <CommandList>
              <CommandEmpty>{t('picker.empty')}</CommandEmpty>
              <CommandGroup>
                {options.map((e) => (
                  <CommandItem
                    key={e.id}
                    value={`${entityLabel(e)} ${e.id}`}
                    onSelect={() => {
                      onChange(e.id)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        'size-4',
                        value === e.id ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    <span className="truncate">{entityLabel(e)}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
