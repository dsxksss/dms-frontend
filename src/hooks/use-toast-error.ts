import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { errorI18nKey, isAppError, quotaI18nKey } from '@/lib/errors'

/** 把任意错误弹成 toast：配额 409→友好套餐文案；否则后端 detail；再否则归类文案。 */
export function useToastError() {
  const { t } = useTranslation()
  return useCallback(
    (e: unknown) => {
      const quota = quotaI18nKey(e)
      if (quota) {
        toast.error(t(quota))
        return
      }
      const msg = isAppError(e) && e.detail ? e.detail : t(errorI18nKey(e))
      toast.error(msg)
    },
    [t],
  )
}
