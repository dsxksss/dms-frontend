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

/** 记住上次登录/注册的租户（refresh 需要；登录回传后会被覆盖为权威值）。 */
export const LAST_TENANT_KEY = 'dms-last-tenant'

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
 * 解析当前应使用的租户：子域名 Host → ?tenant= → 上次登录 → 部署默认。
 * 解析不到则返回空串，交给后端按 Host/邮箱/default_tenant 推断（用户无需手填）。
 */
export function resolveTenant(searchTenant?: string | null): string {
  return (
    readHostTenant() ??
    (searchTenant?.trim() || undefined) ??
    (localStorage.getItem(LAST_TENANT_KEY) || undefined) ??
    readDefaultTenant() ??
    ''
  )
}
