import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { driver, type DriveStep } from 'driver.js'
import 'driver.js/dist/driver.css'
import type { TFunction } from 'i18next'

/** 新手引导（driver.js 聚光灯）。两轮：全局导航 + 项目内业务流。 */

const SEEN_APP = 'dms-tour-app'
const SEEN_PROJECT = 'dms-tour-project'

/** 只保留「无锚点(居中)」或「锚点元素当前存在」的步骤，避免目标缺失导致中断。 */
function presentSteps(steps: DriveStep[]): DriveStep[] {
  return steps.filter(
    (s) => !s.element || !!document.querySelector(s.element as string),
  )
}

function run(t: TFunction, steps: DriveStep[]) {
  const present = presentSteps(steps)
  if (present.length === 0) return
  driver({
    showProgress: true,
    allowClose: true,
    overlayColor: '#0b1020',
    overlayOpacity: 0.55,
    stagePadding: 6,
    stageRadius: 10,
    nextBtnText: t('next'),
    prevBtnText: t('prev'),
    doneBtnText: t('done'),
    progressText: '{{current}} / {{total}}',
    steps: present,
  }).drive()
}

/** 全局导航引导（首登 /projects 时）。 */
export function startAppTour(t: TFunction) {
  run(t, [
    { popover: { title: t('app.welcome.title'), description: t('app.welcome.desc') } },
    {
      element: '[data-tour="nav-projects"]',
      popover: {
        title: t('app.projects.title'),
        description: t('app.projects.desc'),
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '[data-tour="new-project"]',
      popover: {
        title: t('app.newProject.title'),
        description: t('app.newProject.desc'),
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="nav-orgs"]',
      popover: {
        title: t('app.orgs.title'),
        description: t('app.orgs.desc'),
        side: 'right',
      },
    },
    {
      element: '[data-tour="nav-audit"]',
      popover: {
        title: t('app.audit.title'),
        description: t('app.audit.desc'),
        side: 'right',
      },
    },
    { popover: { title: t('app.end.title'), description: t('app.end.desc') } },
  ])
}

/** 项目内业务流引导（首次进入某项目时）。 */
export function startProjectTour(t: TFunction) {
  run(t, [
    {
      popover: {
        title: t('project.welcome.title'),
        description: t('project.welcome.desc'),
      },
    },
    {
      element: '[data-tour="proj-registry"]',
      popover: {
        title: t('project.registry.title'),
        description: t('project.registry.desc'),
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '[data-tour="proj-datasets"]',
      popover: {
        title: t('project.datasets.title'),
        description: t('project.datasets.desc'),
        side: 'right',
      },
    },
    {
      popover: {
        title: t('project.convert.title'),
        description: t('project.convert.desc'),
      },
    },
  ])
}

/**
 * 首次访问自动起一轮引导（localStorage 记忆，看过即不再自动弹）。
 * `enabled` 为 false 时不触发（如数据未就绪 / 非目标路由）。
 */
export function useFirstRunTour(kind: 'app' | 'project', enabled: boolean) {
  const { t } = useTranslation('onboarding')
  useEffect(() => {
    if (!enabled) return
    const key = kind === 'app' ? SEEN_APP : SEEN_PROJECT
    if (localStorage.getItem(key)) return
    // 延迟到目标元素渲染完成再起。
    const id = window.setTimeout(() => {
      localStorage.setItem(key, '1')
      if (kind === 'app') startAppTour(t)
      else startProjectTour(t)
    }, 700)
    return () => window.clearTimeout(id)
  }, [enabled, kind, t])
}

/** 供「帮助」按钮手动重播（重播不写记忆标记）。 */
export function useTourReplay() {
  const { t } = useTranslation('onboarding')
  return {
    replayApp: () => startAppTour(t),
    replayProject: () => startProjectTour(t),
  }
}
