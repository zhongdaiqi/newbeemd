/**
 * One-command release.
 *
 *   node release.mjs patch --notes release-notes/1.0.2.md
 *   node release.mjs 1.0.2 --notes "修复了 xxx（一行即可）"
 *   node release.mjs minor --notes notes.md --dry-run
 *
 * Does, in order:
 *   1. preflight  — clean tree, tag free, new version > current
 *   2. bump       — the 5 version declarations + readme changelog
 *   3. build      — build.mjs -> i18n.mjs -> notices.mjs -> lint-php.mjs -> package.mjs
 *   4. publish    — commit, annotated tag, push branch + tag
 *   5. release    — GitHub Release with the zip attached, then verify the download
 *
 * Options:
 *   --notes <file|text>  required. A path to a file, or inline text.
 *                        Plain lines are turned into changelog bullets.
 *   --yes, -y            skip the confirmation prompt
 *   --dry-run            stop right after packaging (no commit, no push)
 *   --no-release         commit/tag/push but skip the GitHub Release
 *   --allow-dirty        tolerate a dirty working tree
 */

import fs from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import readline from 'node:readline/promises'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pluginDir = path.resolve(__dirname, '..')
const repoRoot = path.resolve(pluginDir, '..')

const MAIN_PHP = path.join(pluginDir, 'wp-bytemd.php')
const README_TXT = path.join(pluginDir, 'readme.txt')
const PKG_JSON = path.join(__dirname, 'package.json')
const EDITOR_SRC = path.join(__dirname, 'src', 'editor.js')

/* --- args --------------------------------------------------------------- */

const argv = process.argv.slice(2)
const flags = new Set(argv.filter((a) => a.startsWith('-')))
const positional = argv.filter((a) => !a.startsWith('-'))
const notesIndex = argv.findIndex((a) => a === '--notes')
const notesArg = notesIndex >= 0 ? argv[notesIndex + 1] : null

const spec = positional[0]
const dryRun = flags.has('--dry-run')
const skipRelease = flags.has('--no-release')
const assumeYes = flags.has('--yes') || flags.has('-y')
const allowDirty = flags.has('--allow-dirty')

function die(message) {
  console.error(`\n发布中止：${message}\n`)
  process.exit(1)
}

if (!spec) {
  die(
    '缺少版本号。用法：node release.mjs <patch|minor|major|x.y.z> --notes <文件或文本>\n' +
      '     例如：node release.mjs patch --notes release-notes/1.0.2.md'
  )
}

/* --- helpers ------------------------------------------------------------ */

function sh(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { cwd: repoRoot, encoding: 'utf8', ...opts }).trim()
}

function bumpVersion(current, input) {
  if (/^\d+\.\d+\.\d+$/.test(input)) return input
  const [maj, min, pat] = current.split('.').map(Number)
  if (input === 'major') return `${maj + 1}.0.0`
  if (input === 'minor') return `${maj}.${min + 1}.0`
  if (input === 'patch') return `${maj}.${min}.${pat + 1}`
  die(`无法识别的版本号 "${input}"，请用 patch / minor / major 或完整 x.y.z。`)
}

function compareVersions(a, b) {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < 3; i += 1) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i]
  }
  return 0
}

function normalizeNotes(text) {
  return text
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => (line.startsWith('*') ? line : `* ${line.replace(/^[-+]/, '').trim()}`))
    .join('\n')
}

/* --- 1. preflight -------------------------------------------------------- */

const pkg = JSON.parse(readFileSync(PKG_JSON, 'utf8'))
const current = pkg.version
const next = bumpVersion(current, spec)

if (compareVersions(next, current) <= 0) {
  die(`新版本 ${next} 不大于当前版本 ${current}。`)
}

if (!notesArg) {
  die('缺少 --notes。版本说明需要人工写，脚本不替你编。')
}

const notes = normalizeNotes(
  existsSync(path.resolve(process.cwd(), notesArg))
    ? readFileSync(path.resolve(process.cwd(), notesArg), 'utf8')
    : notesArg
)

if (!notes) die('--notes 内容是空的。')

const branch = sh('git', ['rev-parse', '--abbrev-ref', 'HEAD'])
const tag = `v${next}`

if (sh('git', ['status', '--porcelain']) && !allowDirty) {
  die('工作区有未提交的改动。先提交，或加 --allow-dirty。')
}

try {
  sh('git', ['rev-parse', '-q', '--verify', `refs/tags/${tag}`])
  die(`本地已存在 tag ${tag}。`)
} catch {
  /* expected: tag does not exist */
}

if (sh('git', ['ls-remote', '--tags', 'origin', `refs/tags/${tag}`])) {
  die(`远程已存在 tag ${tag}。`)
}

const readmeText = readFileSync(README_TXT, 'utf8')
if (readmeText.includes(`= ${next} =`)) {
  die(`readme.txt 已经有 "= ${next} =" 的 changelog 条目。`)
}
if (!readmeText.includes('== Changelog ==')) {
  die('readme.txt 里找不到 "== Changelog ==" 段落。')
}

const zipRel = `dist/wp-bytemd-${next}.zip`
const zipPath = path.join(repoRoot, `dist`, `wp-bytemd-${next}.zip`)

/* --- plan ---------------------------------------------------------------- */

console.log(`
发布计划
  版本      ${current}  ->  ${next}
  分支      ${branch}
  tag       ${tag}
  安装包    ${zipRel}
  版本说明
${notes
  .split('\n')
  .map((l) => `            ${l}`)
  .join('\n')}
`)

if (dryRun) console.log('  （--dry-run：打完包就停，不提交、不推送）\n')

if (!assumeYes && !dryRun) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const answer = await rl.question('确认执行？(y/N) ')
  rl.close()
  if (!/^y(es)?$/i.test(answer.trim())) die('已取消。')
}

/* --- 2. bump ------------------------------------------------------------- */

async function patchFile(file, replacer) {
  const before = await fs.readFile(file, 'utf8')
  const after = replacer(before)
  if (after === before) die(`未能改写 ${path.relative(repoRoot, file)}，请检查格式是否被改过。`)
  await fs.writeFile(file, after, 'utf8')
  console.log(`  已更新  ${path.relative(repoRoot, file).split(path.sep).join('/')}`)
}

console.log('\n[1/5] 更新版本号')

await patchFile(PKG_JSON, (s) => s.replace(/"version":\s*"[^"]+"/, `"version": "${next}"`))
await patchFile(MAIN_PHP, (s) => s.replace(/(\*\s*Version:\s*)\S+/, `$1${next}`))
await patchFile(MAIN_PHP, (s) =>
  s.replace(/(define\(\s*'WP_BYTEMD_VERSION',\s*')[^']+(')/, `$1${next}$2`)
)
await patchFile(README_TXT, (s) => s.replace(/^(Stable tag:\s*)\S+/m, `$1${next}`))
await patchFile(EDITOR_SRC, (s) => s.replace(/(version:\s*')[^']+(')/, `$1${next}$2`))

console.log('[2/5] 写入 changelog')
await patchFile(README_TXT, (s) => {
  const eol = s.includes('\r\n') ? '\r\n' : '\n'
  const block = `= ${next} =` + eol + notes.split('\n').join(eol) + eol + eol
  return s.replace(/(== Changelog ==\r?\n\r?\n)/, `$1${block}`)
})

/* --- 3. build ------------------------------------------------------------ */

console.log('[3/5] 重建产物')

const steps = ['build.mjs', 'i18n.mjs', 'notices.mjs', 'lint-php.mjs', 'package.mjs']

for (const step of steps) {
  console.log(`\n  --- node ${step} ---`)
  try {
    execFileSync(process.execPath, [step], { cwd: __dirname, stdio: 'inherit' })
  } catch {
    die(`${step} 失败，已停在打包阶段。工作区留有改动，可修正后重跑。`)
  }
}

if (!existsSync(zipPath)) die(`打包脚本跑完了，但没找到 ${zipRel}。`)

const zipBytes = (await fs.stat(zipPath)).size
console.log(`\n  安装包就绪：${zipRel}  ${(zipBytes / 1024).toFixed(1)} KB`)

if (dryRun) {
  console.log('\n--dry-run 结束。版本号与 changelog 的改动仍留在工作区。\n')
  process.exit(0)
}

/* --- 4. commit / tag / push --------------------------------------------- */

console.log('\n[4/5] 提交并推送')

const commitMessage = `release: ${tag}\n\n${notes.split('\n').map((l) => l.replace(/^\*\s*/, '- ')).join('\n')}\n`

sh('git', ['add', '-A'])
sh('git', ['commit', '-q', '-F', '-'], { input: commitMessage })
sh('git', ['tag', '-a', tag, '-m', `wp-bytemd ${next}\n\n${notes}`])
sh('git', ['push', 'origin', branch])
sh('git', ['push', 'origin', tag])

console.log(`  已推送 ${branch} 与 ${tag}`)

if (skipRelease) {
  console.log('\n--no-release：已跳过 GitHub Release。\n')
  process.exit(0)
}

/* --- 5. github release --------------------------------------------------- */

console.log('\n[5/5] 创建 GitHub Release')

const remote = sh('git', ['remote', 'get-url', 'origin'])
const match = remote.match(/github\.com[/:]([^/]+)\/(.+?)(?:\.git)?$/)
if (!match) die(`无法从 origin 解析出 GitHub 仓库：${remote}`)
// 仓库可能被改名：旧路径仍会返回 301，但 `fetch` 只对 GET 自动跟随重定向，
// 带 body 的 POST（创建 Release、上传附件）会拿到 307 并失败。
// 所以先解析出规范仓库名，后续所有 API 调用都用它。
const [, ownerRaw, repoRaw] = match

const credential = execFileSync('git', ['credential', 'fill'], {
  input: 'protocol=https\nhost=github.com\n\n',
  encoding: 'utf8',
  env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
})
const password = (credential.match(/^password=(.*)$/m) || [])[1]
if (!password) {
  die('取不到 github.com 的凭据，无法调 API。请先手动 push 一次让凭据助手缓存令牌。')
}
const username = (credential.match(/^username=(.*)$/m) || [])[1] || 'x-access-token'
const auth = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64')

async function api(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: auth,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'wp-bytemd-release',
      ...(options.headers || {}),
    },
  })
  const text = await res.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    json = text
  }
  return { res, json }
}

const canonical = await api(`https://api.github.com/repos/${ownerRaw}/${repoRaw}`)
if (!canonical.res.ok) {
  console.error(`  解析仓库失败：HTTP ${canonical.res.status}`)
  console.error(typeof canonical.json === 'string' ? canonical.json : JSON.stringify(canonical.json, null, 2))
  die('无法确定 GitHub 仓库的规范地址。')
}
const [owner, repo] = canonical.json.full_name.split('/')
if (`${owner}/${repo}`.toLowerCase() !== `${ownerRaw}/${repoRaw}`.toLowerCase()) {
  console.log(`  提示：仓库已改名 ${ownerRaw}/${repoRaw} → ${owner}/${repo}，按新地址调用 API。`)
}

// Release 标题用插件头里的显示名，改名后不用再改脚本。
const displayName =
  ((await fs.readFile(MAIN_PHP, 'utf8')).match(/^\s*\*\s*Plugin Name:\s*(.+?)\s*$/m) || [])[1] ||
  'wp-bytemd'

const body = `## ${displayName} ${next}

### 安装

下载下方 \`wp-bytemd-${next}.zip\`，后台「插件 → 安装插件 → 上传插件」直接装。

> 服务器**不需要** Node.js —— 包内已含编译好的 \`assets/vendor/\` 运行时。

### 本次变更

${notes}

### 发布信息

- 提交：\`${sh('git', ['rev-parse', '--short', 'HEAD'])}\`
- ByteMD 1.22.0 / WordPress ≥ 6.5（在 7.1.x 上验证）
`

let { res, json } = await api(`https://api.github.com/repos/${owner}/${repo}/releases`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ tag_name: tag, name: `${displayName} ${next}`, body, draft: false, prerelease: false }),
})

if (res.status === 422 && JSON.stringify(json).includes('already_exists')) {
  console.log('  该 tag 已有 release，复用现有条目。')
  ;({ res, json } = await api(`https://api.github.com/repos/${owner}/${repo}/releases/tags/${tag}`))
}

if (!res.ok) {
  console.error(`  创建 release 失败：HTTP ${res.status}`)
  console.error(typeof json === 'string' ? json : JSON.stringify(json, null, 2))
  die('分支与 tag 已经推上去了，只需手动补一个 Release。')
}

const assetName = path.basename(zipPath)
const upload = await api(
  `https://uploads.github.com/repos/${owner}/${repo}/releases/${json.id}/assets?name=${encodeURIComponent(assetName)}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/zip', 'Content-Length': String(zipBytes) },
    body: await fs.readFile(zipPath),
  }
)

if (!upload.res.ok) {
  console.error(`  上传附件失败：HTTP ${upload.res.status}`)
  console.error(
    typeof upload.json === 'string' ? upload.json : JSON.stringify(upload.json, null, 2)
  )
  die(`Release 已建好（${json.html_url}），但附件没传上去，手动补一下。`)
}

/* --- verify -------------------------------------------------------------- */

const downloadUrl = upload.json.browser_download_url
const res2 = await fetch(downloadUrl, { redirect: 'follow' })
const downloaded = Buffer.from(await res2.arrayBuffer())
const local = await fs.readFile(zipPath)

if (res2.status !== 200) die(`下载校验失败：HTTP ${res2.status}`)
if (!downloaded.equals(local)) die('下载回来的附件与本地 zip 字节不一致。')

console.log(`
发布完成
  Release   ${json.html_url}
  附件      ${assetName}  ${(zipBytes / 1024).toFixed(1)} KB  (下载校验通过)
  直链      ${downloadUrl}
`)
