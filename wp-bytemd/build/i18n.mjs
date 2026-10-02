/**
 * Extract every translatable string from the PHP and JS sources and emit a
 * gettext template at `languages/newbee-markdown-editor-bytemd.pot`.
 *
 *   node i18n.mjs
 *
 * The plugin has no build dependency on WordPress' i18n tooling, and this keeps
 * the template in sync without pulling in `wp i18n make-pot`.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pluginDir = path.resolve(__dirname, '..')
const outFile = path.join(pluginDir, 'languages', 'newbee-markdown-editor-bytemd.pot')

const TEXTDOMAIN = 'newbee-markdown-editor-bytemd'

/** Recursively collect files with one of the given extensions. */
async function walk(dir, extensions, skip = ['node_modules', '.git', 'vendor']) {
  const out = []
  const entries = await fs.readdir(dir, { withFileTypes: true })

  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    const rel = path.relative(pluginDir, full).split(path.sep).join('/')
    const segments = rel.split('/')

    if (segments.some((segment) => skip.includes(segment))) {
      continue
    }
    if (entry.isDirectory()) {
      out.push(...(await walk(full, extensions, skip)))
    } else if (extensions.includes(path.extname(entry.name))) {
      out.push(full)
    }
  }

  return out
}

const PHP_FUNCS = [
  '__',
  '_e',
  'esc_html__',
  'esc_html_e',
  'esc_attr__',
  'esc_attr_e',
  'esc_textarea',
  '_x',
  '_n',
]

const phpPattern = new RegExp(
  `\\b(?:${PHP_FUNCS.join('|')})\\s*\\(\\s*(['"])((?:(?!\\1).)+)\\1\\s*,\\s*['"]${TEXTDOMAIN}['"]`,
  'gs'
)

const jsPattern = new RegExp(
  `\\b(?:__|_x|_n)\\s*\\(\\s*(['"])((?:(?!\\1).)+)\\1\\s*,\\s*['"]${TEXTDOMAIN}['"]`,
  'gs'
)

/** Unescape the handful of sequences we actually use. */
function unescape(value) {
  return value.replace(/\\(['"\\])/g, '$1').replace(/\\n/g, '\n')
}

const files = await walk(pluginDir, ['.php', '.js'])
const found = new Map()

for (const file of files) {
  const source = await fs.readFile(file, 'utf8')
  const pattern = file.endsWith('.php') ? phpPattern : jsPattern
  const rel = path.relative(pluginDir, file).split(path.sep).join('/')

  for (const match of source.matchAll(pattern)) {
    const msgid = unescape(match[2])
    if (!msgid.trim()) {
      continue
    }
    if (!found.has(msgid)) {
      found.set(msgid, new Set())
    }
    found.get(msgid).add(rel)
  }
}

const byFile = new Map()
for (const [msgid, refs] of found) {
  for (const ref of refs) {
    if (!byFile.has(ref)) {
      byFile.set(ref, [])
    }
    byFile.get(ref).push(msgid)
  }
}

const escapePo = (value) =>
  value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')

const header = `# Copyright (C) 2026 Newbee Markdown Editor (ByteMD)
# This file is distributed under the MIT license.
msgid ""
msgstr ""
"Project-Id-Version: Newbee Markdown Editor (ByteMD) ${JSON.parse(await fs.readFile(path.join(pluginDir, 'build', 'package.json'), 'utf8')).version}\\n"
"Report-Msgid-Bugs-To: https://github.com/zhongdaiqi/wpbytemd/issues\\n"
"MIME-Version: 1.0\\n"
"Content-Type: text/plain; charset=UTF-8\\n"
"Content-Transfer-Encoding: 8bit\\n"
"X-Domain: ${TEXTDOMAIN}\\n"
"Plural-Forms: nplurals=1; plural=0;\\n"
`

let body = ''
let count = 0

for (const [file, msgids] of [...byFile.entries()].sort()) {
  body += `\n#: ${file}\n`
  body += msgids
    .sort()
    .map((id) => `msgid "${escapePo(id)}"\nmsgstr ""\n`)
    .join('\n')
  count += msgids.length
}

await fs.writeFile(outFile, header + body, 'utf8')

console.log(`i18n: ${found.size} unique strings from ${files.length} files → ${path.relative(pluginDir, outFile)}`)
