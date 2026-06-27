/**
 * 「快速上手」任务清单的完成标记（localStorage）。
 * 独立于 onboarding.ts（不引入 driver.js），供各 hook 轻量调用。
 */
export type OnboardStep = 'asset' | 'dataset'

const STEP_KEY: Record<OnboardStep, string> = {
  asset: 'dms-done-asset',
  dataset: 'dms-done-dataset',
}

export function markOnboard(step: OnboardStep) {
  try {
    localStorage.setItem(STEP_KEY[step], '1')
  } catch {
    /* localStorage 不可用时忽略 */
  }
}

export function isOnboardDone(step: OnboardStep): boolean {
  try {
    return localStorage.getItem(STEP_KEY[step]) === '1'
  } catch {
    return false
  }
}
