/**
 * 产品版本（edition）—— 构建期由 `VITE_EDITION` 决定，两套 dist 产物。
 *
 * - `wemol`（**默认**，未设 VITE_EDITION 即此）：WeMol 配套版——仅 WeMol SSO 登录、关自助注册、
 *   对用户隐藏「企业/租户」（保留 组织 + 项目）。cloud 与私有化共用此构建，WeMol 地址由后端
 *   部署期 `[auth.wemol].base_url` 决定。当前 DMS 主要与 WeMol 配合试运行，故默认即此版本。
 * - `standalone`：自定义租户版——邮箱密码注册/登录、客户自建企业。需显式 `VITE_EDITION=standalone`。
 */
export type Edition = 'standalone' | 'wemol'

export const EDITION: Edition =
  import.meta.env.VITE_EDITION === 'standalone' ? 'standalone' : 'wemol'

export const isWemol = EDITION === 'wemol'
export const isStandalone = EDITION === 'standalone'
