#!/usr/bin/env node
/**
 * i18n 对齐检查：校验 zh-CN 与 en 的命名空间文件集一致、且每个文件的扁平 key 完全对齐。
 * 任一缺漏 → 退出码 1（接入 CI，漏翻即红）。无依赖、纯 Node ESM。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const localesDir = path.join(root, 'src/i18n/locales')
const LANGS = ['zh-CN', 'en']

const flatten = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? flatten(v, `${prefix}${k}.`)
      : [`${prefix}${k}`],
  )

const nsOf = (lang) =>
  fs
    .readdirSync(path.join(localesDir, lang))
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace('.json', ''))

let issues = 0
const note = (msg) => {
  console.error(`  ✗ ${msg}`)
  issues++
}

// 1) 命名空间文件集一致
const [zhNs, enNs] = LANGS.map((l) => new Set(nsOf(l)))
for (const n of zhNs) if (!enNs.has(n)) note(`命名空间 "${n}" 缺 en/${n}.json`)
for (const n of enNs) if (!zhNs.has(n)) note(`命名空间 "${n}" 缺 zh-CN/${n}.json`)

// 2) 每个共享命名空间的 key 对齐
for (const n of [...zhNs].filter((x) => enNs.has(x))) {
  const load = (l) =>
    new Set(
      flatten(
        JSON.parse(fs.readFileSync(path.join(localesDir, l, `${n}.json`), 'utf8')),
      ),
    )
  const zh = load('zh-CN')
  const en = load('en')
  for (const k of zh) if (!en.has(k)) note(`[${n}] en 缺 key: ${k}`)
  for (const k of en) if (!zh.has(k)) note(`[${n}] zh-CN 缺 key: ${k}`)
}

if (issues === 0) {
  console.log('✓ i18n 对齐检查通过（zh-CN / en key 完全一致）')
  process.exit(0)
} else {
  console.error(`\n✗ i18n 对齐检查失败：${issues} 处不一致`)
  process.exit(1)
}
