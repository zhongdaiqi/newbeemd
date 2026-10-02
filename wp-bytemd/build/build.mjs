/**
 * Build pipeline: bundle ByteMD (1.22.x) + official plugins into plain IIFE
 * files that WordPress can enqueue with a normal <script> tag.
 *
 *   node build.mjs            # minified production build
 *   node build.mjs --dev      # readable build with sourcemaps
 *
 * Output (../assets/vendor):
 *   bytemd-editor.js / .css   admin editor bundle  (Editor + CodeMirror)
 *   bytemd-viewer.js / .css   front-end viewer bundle (Viewer only)
 *   bytemd-katex.js / .css    standalone KaTeX + auto-render, loaded on demand
 *   bytemd-mermaid.js         standalone Mermaid, loaded only when a page has a diagram
 *   fonts/                    KaTeX fonts referenced by the CSS
 *   MANIFEST.json             versions + sizes, used by the PHP side for cache busting
 *
 * Every runtime asset is bundled locally on purpose: WordPress.org guideline 8
 * requires that all non-service related JavaScript and CSS be served from the
 * plugin, so nothing may be pulled from a third-party CDN at runtime.
 */

import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs/promises'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outdir = path.resolve(__dirname, '..', 'assets', 'vendor')
const dev = process.argv.includes('--dev')

const pkg = JSON.parse(await fs.readFile(path.join(__dirname, 'package.json'), 'utf8'))
const vendorVersions = {}
for (const name of Object.keys(pkg.dependencies || {})) {
  try {
    const mod = JSON.parse(
      await fs.readFile(path.join(__dirname, 'node_modules', name, 'package.json'), 'utf8')
    )
    vendorVersions[name] = mod.version
  } catch {
    /* optional dependency, ignore */
  }
}

await fs.mkdir(path.join(outdir, 'fonts'), { recursive: true })

/**
 * `@bytemd/plugin-highlight` imports the full highlight.js bundle (190+
 * grammars, ~1.1 MB). Redirect that specifier to our curated shim.
 */
const hljsShimPlugin = {
  name: 'hljs-shim',
  setup(build) {
    build.onResolve({ filter: /^highlight\.js$/ }, () => ({
      path: path.join(__dirname, 'src', 'hljs.js'),
    }))
  },
}

/**
 * KaTeX ships woff2 + woff + ttf for every face. Every browser WordPress
 * supports understands woff2, so the legacy formats are ~600 KB of dead
 * weight.
 *
 * The diet is applied while *loading* the CSS, before esbuild resolves the
 * `url()` references — so the legacy files are never emitted in the first
 * place. Pruning them afterwards instead would mean a bulk delete on every
 * build, which is slow and gets refused outright in some sandboxed
 * environments.
 *
 * @param {string} css Stylesheet source.
 * @return {string} Stylesheet with only the woff2 sources left in `@font-face`.
 */
function stripLegacyFontFormats(css) {
  return css.replace(/@font-face\s*\{[^}]*\}/gi, (block) =>
    block.replace(/(src\s*:\s*)([^;}]+)/i, (whole, head, value) => {
      const kept = value
        .split(',')
        .filter((part) => !/\.(woff|ttf|eot)(["')\s]|$)/i.test(part))
      return kept.length ? head + kept.join(',') : whole
    })
  )
}

const fontDietPlugin = {
  name: 'font-diet',
  setup(build) {
    build.onLoad({ filter: /\.css$/ }, async (args) => {
      const css = await fs.readFile(args.path, 'utf8')
      if (!css.includes('@font-face')) {
        return null
      }
      return {
        contents: stripLegacyFontFormats(css),
        loader: 'css',
        resolveDir: path.dirname(args.path),
      }
    })
  },
}

const result = await build({
  entryPoints: {
    'bytemd-editor': path.join(__dirname, 'src', 'editor.js'),
    'bytemd-viewer': path.join(__dirname, 'src', 'viewer.js'),
    'bytemd-katex': path.join(__dirname, 'src', 'katex.js'),
    'bytemd-mermaid': path.join(__dirname, 'src', 'mermaid.js'),
  },
  outdir,
  bundle: true,
  format: 'iife',
  target: ['es2019'],
  platform: 'browser',
  minify: !dev,
  sourcemap: dev ? 'linked' : false,
  legalComments: 'none',
  metafile: true,
  logLevel: 'info',
  plugins: [hljsShimPlugin, fontDietPlugin],
  define: {
    'process.env.NODE_ENV': JSON.stringify(dev ? 'development' : 'production'),
    global: 'globalThis',
  },
  loader: {
    '.woff': 'file',
    '.woff2': 'file',
    '.ttf': 'file',
    '.eot': 'file',
    '.svg': 'file',
    '.png': 'file',
    '.gif': 'file',
  },
  assetNames: 'fonts/[name]',
  charset: 'utf8',
})

/* ---------------------------------------------------------------------------
 * Font diet: KaTeX ships woff2 + woff + ttf variants of every face. Every
 * browser we care about understands woff2, so drop the legacy formats from the
 * CSS and delete the files (~600 KB, 40 files).
 * ------------------------------------------------------------------------ */

const cssFiles = ['bytemd-editor.css', 'bytemd-viewer.css', 'bytemd-katex.css']
const usedFonts = new Set()

for (const name of cssFiles) {
  const file = path.join(outdir, name)
  let css
  try {
    css = await fs.readFile(file, 'utf8')
  } catch {
    continue
  }

  css = css.replace(
    /,\s*url\("\.\/fonts\/[^"]+\.(?:woff|ttf|eot)"\)\s*format\("(?:woff|truetype|embedded-opentype)"\)/g,
    ''
  )

  for (const match of css.matchAll(/url\("\.\/fonts\/([^"]+)"\)/g)) {
    usedFonts.add(match[1])
  }

  await fs.writeFile(file, css, 'utf8')
}

/* Safety net: `fontDietPlugin` should already have kept the legacy formats out
 * of the build entirely, so this normally finds nothing. It exists to catch a
 * stylesheet that slipped through, and to sweep up files left over from an
 * older build. Failures are reported rather than swallowed — a partial cleanup
 * used to be reported as a success, which silently shipped stray font files. */
let removedFonts = 0
const strayFonts = []

try {
  const fontsDir = path.join(outdir, 'fonts')
  for (const file of await fs.readdir(fontsDir)) {
    if (usedFonts.has(file)) {
      continue
    }
    try {
      await fs.rm(path.join(fontsDir, file), { force: true })
      removedFonts += 1
    } catch (err) {
      strayFonts.push(`${file} (${err.code || err.message})`)
    }
  }
} catch {
  /* fonts directory missing — nothing to prune */
}


const outputs = Object.keys(result.metafile.outputs).sort()
const manifest = {
  name: 'wp-bytemd vendor assets',
  bytemd: vendorVersions.bytemd || null,
  generatedAt: new Date().toISOString(),
  dev,
  files: {},
}

const seen = new Set()
for (const file of outputs) {
  const abs = path.resolve(__dirname, file)
  const rel = path.relative(outdir, abs).split(path.sep).join('/')
  let size = 0
  try {
    size = (await fs.stat(abs)).size
  } catch {
    continue
  }
  if (rel.startsWith('fonts/')) {
    if (!seen.has('fonts/')) {
      seen.add('fonts/')
      manifest.files['fonts/'] = { note: 'KaTeX woff2 web fonts', count: 0, bytes: 0 }
    }
    manifest.files['fonts/'].count += 1
    manifest.files['fonts/'].bytes += size
    continue
  }
  manifest.files[rel] = { bytes: size, kb: Math.round((size / 1024) * 10) / 10 }
}

if (manifest.files['fonts/'] && manifest.files['fonts/'].bytes) {
  manifest.files['fonts/'].kb = Math.round((manifest.files['fonts/'].bytes / 1024) * 10) / 10
}

manifest.dependencies = vendorVersions

await fs.writeFile(path.join(outdir, 'MANIFEST.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8')

// Persist the esbuild metafile. It is the only accurate record of *which*
// npm packages actually ended up inside the bundle (esbuild tree-shakes, so a
// transitive dependency may be listed in package.json yet never be included).
// `notices.mjs` consumes it to generate THIRD-PARTY-NOTICES.md.
await fs.writeFile(
  path.join(__dirname, '.metafile.json'),
  JSON.stringify(result.metafile) + '\n',
  'utf8'
)

const report = Object.entries(manifest.files)
  .filter(([, v]) => v.kb !== undefined)
  .map(([k, v]) => `  ${k.padEnd(28)} ${String(v.kb).padStart(8)} KB${v.count ? `  (${v.count} files)` : ''}`)
  .join('\n')
console.log('\nByteMD %s bundled for WordPress:\n%s\n', vendorVersions.bytemd, report)
if (removedFonts) {
  console.log('Swept %d stray font file(s) left over from an earlier build.\n', removedFonts)
}
if (strayFonts.length) {
  console.warn(
    'WARNING: %d font file(s) could not be removed and WILL ship in the archive:\n%s',
    strayFonts.length,
    strayFonts.map((f) => `  ${f}`).join('\n')
  )
}
