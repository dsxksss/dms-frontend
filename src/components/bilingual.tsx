import { useTranslation } from 'react-i18next'

/** 当前是否中文 locale。 */
export function useIsZh(): boolean {
  const { i18n } = useTranslation()
  return i18n.language.startsWith('zh')
}

/**
 * 短标签：只显示当前语言（中文 locale → 中文，英文 locale → 英文）。
 * 侧栏导航用，避免中文模式下中英并排显得冗余。
 */
export function BiLabel({ zh, en }: { zh: string; en: string }) {
  const isZh = useIsZh()
  return <>{isZh ? zh : en}</>
}
