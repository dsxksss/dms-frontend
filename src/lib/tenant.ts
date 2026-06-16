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
