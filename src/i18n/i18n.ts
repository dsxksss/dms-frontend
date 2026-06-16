import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import zhCommon from './locales/zh-CN/common.json'
import enCommon from './locales/en/common.json'
import zhAuth from './locales/zh-CN/auth.json'
import enAuth from './locales/en/auth.json'
import zhProjects from './locales/zh-CN/projects.json'
import enProjects from './locales/en/projects.json'
import zhRegistry from './locales/zh-CN/registry.json'
import enRegistry from './locales/en/registry.json'
import zhDatasets from './locales/zh-CN/datasets.json'
import enDatasets from './locales/en/datasets.json'
import zhFiles from './locales/zh-CN/files.json'
import enFiles from './locales/en/files.json'
import zhAudit from './locales/zh-CN/audit.json'
import enAudit from './locales/en/audit.json'
import zhOrgs from './locales/zh-CN/orgs.json'
import enOrgs from './locales/en/orgs.json'
import zhMembership from './locales/zh-CN/membership.json'
import enMembership from './locales/en/membership.json'

export const SUPPORTED_LANGS = ['zh-CN', 'en'] as const
export type Lang = (typeof SUPPORTED_LANGS)[number]

export const resources = {
  'zh-CN': {
    common: zhCommon,
    auth: zhAuth,
    projects: zhProjects,
    registry: zhRegistry,
    datasets: zhDatasets,
    files: zhFiles,
    audit: zhAudit,
    orgs: zhOrgs,
    membership: zhMembership,
  },
  en: {
    common: enCommon,
    auth: enAuth,
    projects: enProjects,
    registry: enRegistry,
    datasets: enDatasets,
    files: enFiles,
    audit: enAudit,
    orgs: enOrgs,
    membership: enMembership,
  },
} as const

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'zh-CN',
    supportedLngs: SUPPORTED_LANGS as unknown as string[],
    defaultNS: 'common',
    ns: [
      'common',
      'auth',
      'projects',
      'registry',
      'datasets',
      'files',
      'audit',
      'orgs',
      'membership',
    ],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'dms-lang',
      caches: ['localStorage'],
    },
  })

export default i18n
