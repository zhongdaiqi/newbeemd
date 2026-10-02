/**
 * PHP syntax check without a PHP binary.
 *
 *   node lint-php.mjs
 *
 * Uses the `php-parser` grammar (the one behind prettier-plugin-php) to parse
 * every plugin file. It is an optional dev dependency:
 *
 *   npm install --no-save php-parser
 *
 * Exits non-zero when any file fails to parse.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pluginDir = path.resolve(__dirname, '..')

let PhpParser
try {
  PhpParser = require('php-parser')
} catch {
  console.error('缺少 php-parser，请先执行：npm install --no-save php-parser')
  process.exit(2)
}

const engine = new PhpParser({
  parser: { php7: true, suppressErrors: false },
  ast: { withPositions: true },
})

async function walk(dir, skip = ['node_modules', '.git']) {
  const out = []
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (skip.includes(entry.name)) {
      continue
    }
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...(await walk(full, skip)))
    } else if (entry.name.endsWith('.php')) {
      out.push(full)
    }
  }
  return out
}

const files = (await walk(pluginDir)).sort()
let failed = 0

for (const file of files) {
  const rel = path.relative(pluginDir, file).split(path.sep).join('/')
  const source = await fs.readFile(file, 'utf8')

  try {
    engine.parseCode(source, rel)
    const lines = source.split('\n').length
    console.log(`  OK    ${rel.padEnd(42)} ${lines} lines`)
  } catch (error) {
    failed += 1
    console.error(`  FAIL  ${rel}`)
    console.error(`        ${error.message.split('\n')[0]}`)
    if (error.loc) {
      console.error(`        第 ${error.loc.line} 行，第 ${error.loc.column} 列`)
    }
    const context = source.split('\n')[(error.loc?.line || 1) - 1] || ''
    console.error(`        > ${context.trim().slice(0, 120)}`)
  }
}

console.log(`\nPHP 语法检查：${files.length} 个文件，${failed} 个失败`)
process.exit(failed ? 1 : 0)
