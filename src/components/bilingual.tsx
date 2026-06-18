import { useTranslation } from 'react-i18next'

/** 当前是否中文 locale。 */
export function useIsZh(): boolean {
  const { i18n } = useTranslation()
  return i18n.language.startsWith('zh')
}

/**
 * 双语短标签（原型侧栏 / Tab 风格）：
 * 中文 locale 显示「中文 + 浅色英文」；英文 locale 仅显示英文。
 */
export function BiLabel({ zh, en }: { zh: string; en: string }) {
  const isZh = useIsZh()
  if (!isZh) return <>{en}</>
  return (
    <>
      {zh}
      <span className="ml-1.5 font-normal opacity-55">{en}</span>
    </>
  )
}
