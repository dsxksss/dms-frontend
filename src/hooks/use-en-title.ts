import { useTranslation } from 'react-i18next'

/**
 * 双语标题副标：中文界面下取某 i18n key 的英文译文（用作 PageHeader 的 titleEn，
 * 复刻原型「数据资产 Data Assets」式标题）；英文界面返回 undefined（只显本地化主标题）。
 * ns 默认 common。
 */
export function useEnTitle(ns?: string): (key: string) => string | undefined {
  const { i18n } = useTranslation()
  const isZh = i18n.language.startsWith('zh')
  const en = i18n.getFixedT('en', ns ?? 'common')
  return (key) => (isZh ? (en(key) as string) : undefined)
}
