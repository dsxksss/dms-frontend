/**
 * slug 工具：把人类可读名称转成 URL 安全标识，降低"手填 slug"的门槛。
 * 普通用户只需填名称，slug 由名称自动派生；中文等无 ascii 的名称回退到随机串。
 */

/** 名称 → ascii slug（小写、非字母数字转连字符、去首尾连字符）。中文名会得到空串。 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

/** 随机短 slug（中文名/空名时的回退）。 */
export function randomSlug(prefix = 'x'): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`
}

/** 从名称生成可用 slug：能 ascii 化就用，否则回退随机。用户始终无需手填。 */
export function autoSlug(name: string, prefix = 'x'): string {
  return slugify(name) || randomSlug(prefix)
}
