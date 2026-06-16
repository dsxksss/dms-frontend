import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import zhCommon from './locales/zh-CN/common.json'
import enCommon from './locales/en/common.json'

export const SUPPORTED_LANGS = ['zh-CN', 'en'] as const
export type Lang = (typeof SUPPORTED_LANGS)[number]

export const resources = {
  'zh-CN': { common: zhCommon },
  en: { common: enCommon },
} as const

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'zh-CN',
    supportedLngs: SUPPORTED_LANGS as unknown as string[],
    defaultNS: 'common',
    ns: ['common'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'dms-lang',
      caches: ['localStorage'],
    },
  })

export default i18n
