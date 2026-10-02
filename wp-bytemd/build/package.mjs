/**
 * Package the plugin into `dist/wp-bytemd-<version>.zip`.
 *
 *   node package.mjs
 *
 * The archive contains everything WordPress needs to run the plugin —
 * including the pre-built `assets/vendor/*` — but never `node_modules`.
 * `build/` is kept so the bundle can be rebuilt on the target machine.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pluginDir = path.resolve(__dirname, '..')
const repoRoot = path.resolve(pluginDir, '..')
const stageRoot = path.join(repoRoot, 'dist', '.stage')
const stagePlugin = path.join(stageRoot, 'wp-bytemd')

const pkg = JSON.parse(await fs.readFile(path.join(__dirname, 'package.json'), 'utf8'))
const version = pkg.version
const zipPath = path.join(repoRoot, 'dist', `wp-bytemd-${version}.zip`)

/* --- version consistency -------------------------------------------------
 * WordPress reads the plugin's version from the `Version:` header in the main
 * plugin file, not from WP_BYTEMD_VERSION. Bumping one and forgetting the
 * other ships a plugin that reports the wrong version (and never sees an
 * update). Assert every declaration agrees before building the archive.
 */

const mainFile = await fs.readFile(path.join(pluginDir, 'wp-bytemd.php'), 'utf8')
const readme = await fs.readFile(path.join(pluginDir, 'readme.txt'), 'utf8')
const editorSrc = await fs.readFile(path.join(__dirname, 'src', 'editor.js'), 'utf8')

const declarations = [
  ['build/package.json', pkg.version],
  ['wp-bytemd.php (Version: header)', (mainFile.match(/^\s*\*\s*Version:\s*(\S+)/m) || [])[1]],
  ["wp-bytemd.php (WP_BYTEMD_VERSION)", (mainFile.match(/WP_BYTEMD_VERSION',\s*'([^']+)'/) || [])[1]],
  ['readme.txt (Stable tag)', (readme.match(/^Stable tag:\s*(\S+)/m) || [])[1]],
  ['build/src/editor.js', (editorSrc.match(/version:\s*'([^']+)'/) || [])[1]],
]

const mismatched = declarations.filter(([, v]) => v !== version)

if (mismatched.length) {
  console.error(`打包失败：版本号不一致（期望 ${version}）：`)
  mismatched.forEach(([where, got]) => console.error(`  ${where.padEnd(34)} ${got ?? '(未找到)'}`))
  process.exit(1)
}

console.log(`版本一致性检查通过：${version}（${declarations.length} 处声明）`)

// The readme changelog drives the WordPress.org "Changelog" tab; a missing
// entry silently drops the release notes for this version.
if (!readme.includes(`= ${version} =`)) {
  console.error(`打包失败：readme.txt 的 Changelog 缺少 "= ${version} =" 条目。`)
  process.exit(1)
}

/** Paths (relative to the plugin root) that never belong in the archive. */
const EXCLUDED_DIRS = new Set(['node_modules', '.git', '.github', '.idea', '.vscode', 'dist'])
// `.metafile.json` is a ~500 KB esbuild by-product used only by notices.mjs —
// it must never ship. `.json` alone would be too broad (MANIFEST.json ships).
const EXCLUDED_FILES = /(\.map|\.log|\.DS_Store|\.zip|\.metafile\.json)$/i

/**
 * Copy the plugin tree into the staging directory.
 *
 * Returns the set of archive-relative paths actually written, so the caller
 * can tell a leftover from a previous run apart from real content.
 */
async function copy(from, to, prefix = '', written = new Set()) {
  await fs.mkdir(to, { recursive: true })
  const entries = await fs.readdir(from, { withFileTypes: true })

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) {
        continue
      }
      await copy(path.join(from, entry.name), path.join(to, entry.name), prefix ? `${prefix}/${entry.name}` : entry.name, written)
      continue
    }
    if (EXCLUDED_FILES.test(entry.name)) {
      continue
    }
    await fs.copyFile(path.join(from, entry.name), path.join(to, entry.name))
    written.add(prefix ? `${prefix}/${entry.name}` : entry.name)
  }

  return written
}

async function sizeOf(dir) {
  let total = 0
  let files = 0
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      const nested = await sizeOf(full)
      total += nested.total
      files += nested.files
    } else {
      total += (await fs.stat(full)).size
      files += 1
    }
  }
  return { total, files }
}

/* --- stage ------------------------------------------------------------- */

// Start from a clean staging directory. Some sandboxed environments refuse
// bulk recursive deletes; that is not fatal, because the reconciliation step
// below removes whatever `copy()` did not write.
try {
  await fs.rm(stageRoot, { recursive: true, force: true })
} catch (err) {
  console.warn(`提示：暂存目录未能清空（${err.code || err.message}），改为就地覆盖。`)
}

const written = await copy(pluginDir, stagePlugin)

/* --- sanity checks ----------------------------------------------------- */

// Reconcile the staging directory against what `copy()` just wrote.
//
// Comparing against the *source tree* is not enough: a file can still exist in
// the source yet be newly matched by EXCLUDED_FILES, and it would then linger in
// the stage and silently ship inside the archive. Comparing against `written`
// covers both cases — deleted files and newly excluded ones.
const stale = (await collectFiles(stagePlugin)).filter((f) => !written.has(f.rel))

for (const file of stale) {
  // Per-file deletes stay well under any bulk-delete guard.
  await fs.rm(file.full, { force: true })
}

if (stale.length) {
  console.log(`  已清理暂存目录残留：${stale.length} 个文件（${stale.slice(0, 3).map((f) => f.rel).join('、')}${stale.length > 3 ? ' 等' : ''}）`)
}

const required = [
  'wp-bytemd.php',
  'includes/class-wp-bytemd.php',
  'assets/vendor/bytemd-editor.js',
  'assets/vendor/bytemd-editor.css',
  'vendor/parsedown/Parsedown.php',
]

for (const file of required) {
  try {
    await fs.access(path.join(stagePlugin, file))
  } catch {
    console.error(`打包失败：缺少必需文件 ${file}`)
    process.exit(1)
  }
}

/* --- zip --------------------------------------------------------------- */

/*
 * Write the archive ourselves instead of shelling out to PowerShell's
 * `Compress-Archive` (or 7-Zip, or anything else platform-specific).
 *
 * Reason: `Compress-Archive` on Windows PowerShell 5.1 goes through
 * .NET Framework's ZipFile and stores entry names with **backslashes**
 * (`wp-bytemd\wp-bytemd.php`). APPNOTE 4.4.17.1 requires `/`, and PHP's
 * `unzip_file()` only understands `/`. A backslash archive unpacks into
 * a flat pile of oddly-named files, so WordPress never sees a plugin
 * directory, `get_plugins()` returns nothing, and clicking "Activate"
 * fails with "The plugin does not exist." (插件文件不存在).
 *
 * Windows' own Extractor tolerates the backslashes, which is exactly why
 * this bug survives local verification and only shows up on the server.
 */

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c
  }
  return table
})()

function crc32(buf) {
  let c = -1
  for (let i = 0; i < buf.length; i += 1) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  }
  return (c ^ -1) >>> 0
}

/** MS-DOS date/time pair, as required by the ZIP headers. */
function dosDateTime(date) {
  return {
    time: ((date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1)) & 0xffff,
    date: (((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()) & 0xffff,
  }
}

/** Collect every file below `dir` as archive-relative POSIX paths. */
async function collectFiles(dir, prefix = '') {
  const out = []
  const entries = await fs.readdir(dir, { withFileTypes: true })

  for (const entry of entries) {
    // Archive entry names must use forward slashes — never path.sep.
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name
    const full = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      out.push(...(await collectFiles(full, rel)))
    } else {
      out.push({ rel, full })
    }
  }

  return out
}

async function writeZip(files, target) {
  const now = dosDateTime(new Date())
  const localParts = []
  const centralParts = []
  let offset = 0

  for (const file of files) {
    const data = await fs.readFile(file.full)
    const name = Buffer.from(file.rel, 'utf8')
    const deflated = zlib.deflateRawSync(data, { level: 9 })
    // Fall back to "stored" when deflating does not pay off.
    const stored = deflated.length >= data.length
    const body = stored ? data : deflated
    const method = stored ? 0 : 8
    const sum = crc32(data)

    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0) // local file header signature
    local.writeUInt16LE(20, 4) // version needed to extract
    local.writeUInt16LE(0x0800, 6) // general purpose flag: UTF-8 names
    local.writeUInt16LE(method, 8)
    local.writeUInt16LE(now.time, 10)
    local.writeUInt16LE(now.date, 12)
    local.writeUInt32LE(sum, 14)
    local.writeUInt32LE(body.length, 18)
    local.writeUInt32LE(data.length, 22)
    local.writeUInt16LE(name.length, 26)
    local.writeUInt16LE(0, 28) // extra field length

    localParts.push(local, name, body)

    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0) // central directory signature
    central.writeUInt16LE(0x031e, 4) // version made by: 3 = UNIX, 30 = 3.0
    central.writeUInt16LE(20, 6) // version needed to extract
    central.writeUInt16LE(0x0800, 8)
    central.writeUInt16LE(method, 10)
    central.writeUInt16LE(now.time, 12)
    central.writeUInt16LE(now.date, 14)
    central.writeUInt32LE(sum, 16)
    central.writeUInt32LE(body.length, 20)
    central.writeUInt32LE(data.length, 24)
    central.writeUInt16LE(name.length, 28)
    central.writeUInt16LE(0, 30) // extra field length
    central.writeUInt16LE(0, 32) // file comment length
    central.writeUInt16LE(0, 34) // disk number start
    central.writeUInt16LE(0, 36) // internal file attributes
    // External attributes: UNIX mode in the high 16 bits, `-rw-r--r--`.
    // `>>> 0` is required — `<<` is a signed 32-bit op and would go negative.
    central.writeUInt32LE((0o100644 << 16) >>> 0, 38)
    central.writeUInt32LE(offset, 42)

    centralParts.push(central, name)

    offset += local.length + name.length + body.length
  }

  const centralBuffer = Buffer.concat(centralParts)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0) // end of central directory signature
  eocd.writeUInt16LE(0, 4) // this disk number
  eocd.writeUInt16LE(0, 6) // disk with central directory
  eocd.writeUInt16LE(files.length, 8)
  eocd.writeUInt16LE(files.length, 10)
  eocd.writeUInt32LE(centralBuffer.length, 12)
  eocd.writeUInt32LE(offset, 16)
  eocd.writeUInt16LE(0, 20) // comment length

  await fs.writeFile(target, Buffer.concat([...localParts, centralBuffer, eocd]))
}

/**
 * Re-open the finished archive and re-derive everything WordPress will see.
 *
 * Checking the in-memory file list before writing is not enough: the bug that
 * prompted this function was invisible until the bytes hit the disk. So read
 * the zip back, walk its central directory, inflate every member and compare
 * CRCs, and refuse to report success otherwise.
 */
async function verifyArchive(target) {
  const buf = await fs.readFile(target)

  let eocd = -1
  for (let i = buf.length - 22; i >= 0; i -= 1) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) {
    console.error('打包后校验失败：找不到中央目录记录（EOCD）。')
    process.exit(1)
  }

  const total = buf.readUInt16LE(eocd + 10)
  const problems = []
  const names = []
  let off = buf.readUInt32LE(eocd + 16)

  for (let i = 0; i < total; i += 1) {
    if (buf.readUInt32LE(off) !== 0x02014b50) {
      problems.push('中央目录签名损坏')
      break
    }

    const method = buf.readUInt16LE(off + 10)
    const sum = buf.readUInt32LE(off + 16)
    const csize = buf.readUInt32LE(off + 20)
    const usize = buf.readUInt32LE(off + 24)
    const nameLen = buf.readUInt16LE(off + 28)
    const extraLen = buf.readUInt16LE(off + 30)
    const cmtLen = buf.readUInt16LE(off + 32)
    const localOffset = buf.readUInt32LE(off + 42)
    const name = buf.slice(off + 46, off + 46 + nameLen).toString('utf8')
    names.push(name)

    if (name.includes('\\')) {
      problems.push(`条目使用反斜杠分隔符：${name}`)
    }

    const localNameLen = buf.readUInt16LE(localOffset + 26)
    const localExtraLen = buf.readUInt16LE(localOffset + 28)
    const start = localOffset + 30 + localNameLen + localExtraLen
    const raw = buf.slice(start, start + csize)

    try {
      const data = method === 0 ? raw : zlib.inflateRawSync(raw)
      if (data.length !== usize) {
        problems.push(`解压后长度不符：${name}`)
      }
      if (crc32(data) !== sum) {
        problems.push(`CRC 校验失败：${name}`)
      }
    } catch (err) {
      problems.push(`解压失败 ${name}：${err.message}`)
    }

    off += 46 + nameLen + extraLen + cmtLen
  }

  if (!names.includes(MAIN_ENTRY)) {
    problems.push(`缺少插件主文件 ${MAIN_ENTRY}`)
  }

  const stray = names.filter((n) => !n.startsWith('wp-bytemd/'))
  if (stray.length) {
    problems.push(`${stray.length} 个条目不在 wp-bytemd/ 目录下，例如 ${stray[0]}`)
  }

  if (problems.length) {
    console.error('\n打包后校验失败（这份 zip 装到 WordPress 会报“插件文件不存在”）：')
    problems.slice(0, 8).forEach((p) => console.error(`  ${p}`))
    process.exit(1)
  }

  console.log(`  自校验：${names.length} 个条目，路径分隔符合法、CRC 全部通过`)
}

// Collect from `stageRoot`, not `stagePlugin`, so every entry is prefixed with
// `wp-bytemd/`. Without that wrapper WordPress treats the archive as a "no
// single root directory" plugin and scatters the files straight into
// wp-content/plugins/, then reports "插件文件不存在" on activation.
const zipFiles = await collectFiles(stageRoot)
const offenders = zipFiles.filter((f) => f.rel.includes('\\') || f.rel.startsWith('/'))

if (offenders.length) {
  console.error('打包失败：压缩包条目使用了非法路径分隔符：')
  offenders.slice(0, 5).forEach((f) => console.error(`  ${f.rel}`))
  process.exit(1)
}

const MAIN_ENTRY = 'wp-bytemd/wp-bytemd.php'
if (!zipFiles.some((f) => f.rel === MAIN_ENTRY)) {
  console.error(`打包失败：${MAIN_ENTRY} 不在压缩包根目录（WordPress 将报“插件文件不存在”）。`)
  process.exit(1)
}

const stray = zipFiles.filter((f) => !f.rel.startsWith('wp-bytemd/'))
if (stray.length) {
  console.error('打包失败：以下条目位于 wp-bytemd/ 之外：')
  stray.slice(0, 5).forEach((f) => console.error(`  ${f.rel}`))
  process.exit(1)
}

// `writeZip` opens with `fs.writeFile`, which truncates — no need to unlink
// first (and an unlink would trip the sandbox's bulk-delete guard).
await writeZip(zipFiles, zipPath)
await verifyArchive(zipPath)

/* --- report ------------------------------------------------------------ */

const staged = await sizeOf(stagePlugin)
const zipped = await fs.stat(zipPath)

console.log(`\n打包完成：${path.relative(repoRoot, zipPath).split(path.sep).join('/')}`)
console.log(`  未压缩：${staged.files} 个文件 / ${(staged.total / 1024 / 1024).toFixed(2)} MB`)
console.log(`  压缩后：${(zipped.size / 1024 / 1024).toFixed(2)} MB`)

// Keep the staging folder: it doubles as the "unzipped plugin folder" you can
// drop straight into wp-content/plugins.
console.log(`  暂存目录：${path.relative(repoRoot, stagePlugin).split(path.sep).join('/')}`)
