/**
 * 从 Host 子域名解析租户 slug，与后端 `tenant_from_host` 规则对齐：
 * - 需配置后缀(suffix)，如 `dms.app`（允许带前导点）。
 * - 仅取单层子域：`acme.dms.app` → `acme`；`a.b.dms.app` / 裸域 / 保留标签(www/api) → null。
 */
const RESERVED = new Set(['www', 'api', 'app'])

export function tenantFromHost(
  hostname: string,
  suffix: string | undefined,
): string | null {
  if (!suffix) return null
  const host = hostname.toLowerCase().split(':')[0]
  const suf = suffix.toLowerCase().replace(/^\./, '')
  if (!suf || !host.endsWith(`.${suf}`)) return null
  const label = host.slice(0, host.length - suf.length - 1)
  if (!label || label.includes('.')) return null
  if (RESERVED.has(label)) return null
  return label
}

function readDefaultTenant(): string | undefined {
  const env = (import.meta.env.VITE_DEFAULT_TENANT as string | undefined)?.trim()
  return env || undefined
}

/** 部署在租户子域名(如 acme.dms.app)时由 Host 推断，与后端规则一致。 */
function readHostTenant(): string | undefined {
  const suffix = (import.meta.env.VITE_TENANT_HOST_SUFFIX as string | undefined)?.trim()
  return tenantFromHost(window.location.hostname, suffix) ?? undefined
}

/**
 * 解析登录/注册时应显式携带的企业：子域名 Host → 显式 ?tenant= → 部署默认。
 * 解析不到返回空串，交给后端按邮箱(全局唯一)反查——这是云端常态，用户无需指定企业。
 *
 * 注意：**不再读取"上次登录"的残留**。否则换账号登录时会把上一个用户的企业强加给
 * 新邮箱，盖过后端邮箱反查导致 401（典型坑）。刷新所需的权威 tenant 由会话 store
 * （登录响应回传）持有，与此无关。
 */
export function resolveTenant(searchTenant?: string | null): string {
  return (
    readHostTenant() ??
    (searchTenant?.trim() || undefined) ??
    readDefaultTenant() ??
    ''
  )
}
