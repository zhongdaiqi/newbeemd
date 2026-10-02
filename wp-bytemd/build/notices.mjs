/**
 * Generate `THIRD-PARTY-NOTICES.md`.
 *
 *   node build.mjs          # first — produces build/.metafile.json
 *   node notices.mjs
 *
 * Why this file has to exist:
 *   `build.mjs` bundles ByteMD plus its whole dependency tree into
 *   `assets/vendor/*.js` with `legalComments: 'none'`, which strips every
 *   copyright and license comment from the output. MIT and BSD-3-Clause both
 *   require the copyright notice to travel with the software, so the notices
 *   cannot live inside the bundle — they ship as this document instead.
 *
 *   The component list is derived from the esbuild metafile rather than from
 *   package.json, because esbuild tree-shakes: a transitive dependency can be
 *   declared yet never actually be included.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pluginDir = path.resolve(__dirname, '..')
const metafilePath = path.join(__dirname, '.metafile.json')
const outFile = path.join(pluginDir, 'THIRD-PARTY-NOTICES.md')

/** Bundled libraries that are not installed from npm. */
const PHP_VENDORS = [
  {
    name: 'Parsedown',
    version: '1.8.0',
    license: 'MIT',
    copyright: 'Copyright (c) 2013-2018 Emanuil Rusev, erusev.com',
    homepage: 'https://github.com/erusev/parsedown',
    licenseText: path.join(pluginDir, 'vendor', 'parsedown', 'LICENSE.txt'),
  },
  {
    name: 'ParsedownExtra',
    version: '0.9.0',
    license: 'MIT',
    copyright: 'Copyright (c) 2013 Emanuil Rusev, erusev.com',
    homepage: 'https://github.com/erusev/parsedown-extra',
    licenseText: path.join(pluginDir, 'vendor', 'parsedown', 'LICENSE-ParsedownExtra.txt'),
  },
]

/* --- 1. which packages are actually inside the bundle? ------------------ */

let metafile
try {
  metafile = JSON.parse(await fs.readFile(metafilePath, 'utf8'))
} catch {
  console.error('找不到 build/.metafile.json —— 请先运行 `node build.mjs`。')
  process.exit(1)
}

const MARKER = 'node_modules/'

/** `../node_modules/@scope/pkg/dist/x.js` -> `@scope/pkg` (+ its directory). */
function splitPackage(inputPath) {
  const rel = inputPath.split(path.sep).join('/')
  const at = rel.lastIndexOf(MARKER)
  if (at < 0) return null

  const rest = rel.slice(at + MARKER.length)
  const parts = rest.split('/')
  const name = rest.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]
  if (!name) return null

  return {
    name,
    dir: path.resolve(__dirname, rel.slice(0, at + MARKER.length + name.length)),
  }
}

const packages = new Map()
for (const input of Object.keys(metafile.inputs || {})) {
  const found = splitPackage(input)
  if (found) packages.set(found.name, found.dir)
}

/* --- 2. version / license / copyright line ------------------------------ */

async function firstLicenseFile(dir) {
  try {
    const files = await fs.readdir(dir)
    const hit = files.find((f) => /^licen[sc]e/i.test(f))
    return hit ? path.join(dir, hit) : null
  } catch {
    return null
  }
}

function normalizeLicense(pkg) {
  const raw = typeof pkg.license === 'string'
    ? pkg.license
    : Array.isArray(pkg.licenses)
      ? pkg.licenses.map((l) => (typeof l === 'string' ? l : l.type)).filter(Boolean).join(' OR ')
      : pkg.license && pkg.license.type
        ? pkg.license.type
        : null
  return raw || null
}

const components = []

for (const [name, dir] of packages) {
  let pkg = {}
  try {
    pkg = JSON.parse(await fs.readFile(path.join(dir, 'package.json'), 'utf8'))
  } catch {
    /* fall through — still list it */
  }

  const licensePath = await firstLicenseFile(dir)
  let copyright = ''
  let rawText = ''

  if (licensePath) {
    rawText = await fs.readFile(licensePath, 'utf8')
    const lines = rawText.split(/\r?\n/)
    const idx = lines.findIndex((l) => /copyright/i.test(l))
    if (idx >= 0) {
      copyright = lines
        .slice(idx, idx + 2)
        .map((l) => l.trim())
        .filter((l) => /copyright/i.test(l))
        .join(' ')
        .trim()
    }
  }

  let license = normalizeLicense(pkg)
  if (!license && rawText) {
    if (/MIT License|Permission is hereby granted, free of charge/i.test(rawText)) license = 'MIT'
    else if (/BSD 3-Clause|Redistribution and use in source and binary forms/i.test(rawText)) license = 'BSD-3-Clause'
    else if (/Apache License/i.test(rawText)) license = 'Apache-2.0'
    else if (/ISC License/i.test(rawText)) license = 'ISC'
    else license = 'UNKNOWN — 见组件自带 LICENSE'
  }

  components.push({
    name,
    version: pkg.version || '?',
    license: license || 'UNKNOWN — 见组件自带 LICENSE',
    copyright: copyright || (pkg.author ? `作者：${typeof pkg.author === 'string' ? pkg.author : pkg.author.name || ''}` : '见组件自带 LICENSE'),
    homepage: typeof pkg.homepage === 'string' ? pkg.homepage : '',
    rawText,
    licensePath,
  })
}

for (const v of PHP_VENDORS) components.push(v)

components.sort((a, b) => a.license.localeCompare(b.license) || a.name.localeCompare(b.name))

/* --- 3. collect one verbatim sample per license family ------------------ */

const familyText = new Map()
for (const c of components) {
  if (!familyText.has(c.license) && c.rawText) {
    familyText.set(c.license, { text: c.rawText.trim(), from: `${c.name}@${c.version}` })
  }
}

/* --- 4. render ---------------------------------------------------------- */

const byLicense = new Map()
for (const c of components) {
  if (!byLicense.has(c.license)) byLicense.set(c.license, [])
  byLicense.get(c.license).push(c)
}

const order = [...byLicense.keys()].sort((a, b) => byLicense.get(b).length - byLicense.get(a).length)

const manifest = await fs
  .readFile(path.join(pluginDir, 'assets', 'vendor', 'MANIFEST.json'), 'utf8')
  .then((s) => JSON.parse(s))
  .catch(() => ({}))

const out = []
out.push('# 第三方组件声明 / Third-Party Notices')
out.push('')
out.push('**ByteMD for WordPress** 的发行包（`dist/wp-bytemd-*.zip`）与浏览器产物中，包含了下列第三方开源组件。')
out.push('')
out.push('构建脚本使用 esbuild 把 ByteMD 及其依赖树打包进 `assets/vendor/*.js`，并设置了')
out.push("`legalComments: 'none'`——该选项会移除输出中的所有注释，因此这些组件的版权与许可证声明")
out.push('**不会出现在打包产物内部**，改由本文档统一承载。MIT 与 BSD-3-Clause 均要求版权声明随软件一并分发。')
out.push('')
out.push(`- 生成时间：${new Date().toISOString()}`)
out.push(`- 打包的 ByteMD 版本：${manifest.bytemd || '1.22.0'}`)
out.push(`- 组件总数：**${components.length}**`)
out.push('- 完整依赖清单见 `assets/vendor/MANIFEST.json`')
out.push('')
out.push('> 本文档由 `node build/notices.mjs` 自动生成，请勿手工修改；新增或升级依赖后请重新生成。')
out.push('')
out.push('---')
out.push('')
out.push('## 一、组件清单')
out.push('')

for (const license of order) {
  const list = byLicense.get(license)
  out.push(`### ${license}（${list.length} 个）`)
  out.push('')
  out.push('| 组件 | 版本 | 版权声明 |')
  out.push('| --- | --- | --- |')
  for (const c of list) {
    out.push(`| \`${c.name}\` | ${c.version} | ${c.copyright.replace(/\|/g, '\\|')} |`)
  }
  out.push('')
}

out.push('---')
out.push('')
out.push('## 二、许可证全文')
out.push('')

for (const license of order) {
  const sample = familyText.get(license)
  out.push(`### ${license}`)
  out.push('')
  if (!sample) {
    out.push(`未能在本地找到该类别的许可证全文，请参见各组件自带仓库中的 LICENSE 文件。`)
    out.push('')
    continue
  }
  out.push(`以下文本逐字取自 \`${sample.from}\`。同类组件的许可证文本与本文件一致，`)
  out.push('差异仅在于版权署名行——每个组件的版权署名见上表。')
  out.push('')
  out.push('```text')
  out.push(sample.text)
  out.push('```')
  out.push('')
}

out.push('---')
out.push('')
out.push('## 三、关于名称与官方关系')
out.push('')
out.push('本插件是**非官方**的第三方集成，与字节跳动（ByteDance）及 ByteMD 项目官方无隶属或背书关系。')
out.push('“ByteMD”为其开源项目名称，此处仅用于说明本插件所集成的编辑器组件。')
out.push('')

await fs.writeFile(outFile, out.join('\n'), 'utf8')

console.log(`notices: ${components.length} 个组件 → ${path.relative(path.resolve(pluginDir, '..'), outFile).split(path.sep).join('/')}`)
for (const license of order) {
  console.log(`  ${license.padEnd(34)} x${byLicense.get(license).length}`)
}
