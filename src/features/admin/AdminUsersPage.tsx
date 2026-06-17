import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { EmptyState, TableSkeleton } from '@/components/states'
import { useUserSearch } from '@/hooks/use-membership'
import { useDebounce } from '@/hooks/use-debounce'
import { shortId } from '@/lib/format'

export function AdminUsersPage() {
  const { t } = useTranslation('admin')
  const [q, setQ] = useState('')
  const debounced = useDebounce(q, 250)
  const query = useUserSearch(debounced)

  return (
    <div>
      <PageHeader title={t('users.title')} description={t('users.hint')} />
      <div className="relative max-w-sm">
        <Search className="text-muted-foreground absolute top-2.5 left-2.5 size-4" />
        <Input
          className="pl-8"
          placeholder={t('users.search')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="mt-4">
        {debounced.trim().length === 0 ? (
          <EmptyState title={t('users.hint')} />
        ) : query.isLoading ? (
          <TableSkeleton rows={4} cols={2} />
        ) : query.data && query.data.length > 0 ? (
          <ul className="divide-y rounded-md border">
            {query.data.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{u.display_name}</div>
                  <div className="text-muted-foreground truncate text-xs">{u.email}</div>
                </div>
                <Badge variant="secondary" className="shrink-0 font-mono text-xs">
                  {shortId(u.id)}
                </Badge>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title={t('users.empty')} />
        )}
      </div>
    </div>
  )
}
