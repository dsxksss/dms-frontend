import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { errorI18nKey, isAppError } from '@/lib/errors'

/** 把任意错误（优先后端 detail，否则归类文案）弹成 toast。 */
export function useToastError() {
  const { t } = useTranslation()
  return useCallback(
    (e: unknown) => {
      const msg = isAppError(e) && e.detail ? e.detail : t(errorI18nKey(e))
      toast.error(msg)
    },
    [t],
  )
}
