/**
 * Shared pieces for both the editor and the viewer bundle.
 *
 * ByteMD 1.22.x is framework agnostic (compiled Svelte), so we can bundle it
 * once as an IIFE and hand it to WordPress as a global: `window.WPByteMD`.
 */

import gfm from '@bytemd/plugin-gfm'
import highlight from '@bytemd/plugin-highlight'
import math from '@bytemd/plugin-math'
import breaks from '@bytemd/plugin-breaks'
import frontmatter from '@bytemd/plugin-frontmatter'
import gemoji from '@bytemd/plugin-gemoji'
import mediumZoom from '@bytemd/plugin-medium-zoom'

/* Styles. esbuild extracts every CSS import into `<entry>.css`. */
import 'bytemd/dist/index.css'
import 'highlight.js/styles/github.css'
import 'katex/dist/katex.min.css'

/**
 * Plugin factories keyed by the slug used in the WordPress settings screen.
 * Values are the *factory* functions, so the PHP side decides which ones are
 * actually activated.
 */
export const pluginFactories = {
  gfm,
  highlight,
  math,
  breaks,
  frontmatter,
  gemoji,
  mediumZoom,
}

/**
 * Build the plugin list from a plain config object coming from PHP.
 *
 * @param {Record<string, boolean>} enabled Map of slug => enabled.
 * @param {{ mermaid?: object }} [extra]
 * @return {Array} ByteMD plugin array.
 */
export function buildPlugins(enabled, extra = {}) {
  const list = []
  Object.keys(pluginFactories).forEach((key) => {
    if (enabled && enabled[key]) {
      list.push(pluginFactories[key]())
    }
  })
  if (extra.mermaid) {
    list.push(createMermaidPlugin(extra.mermaid))
  }
  return list
}

/* -------------------------------------------------------------------------
 * Mermaid
 * ---------------------------------------------------------------------- */

/**
 * Mermaid is ~3 MB of JS and would dwarf the rest of the bundle, so it is
 * *not* bundled. Instead we load the ESM build from a CDN (or any URL the
 * site owner configures) the first time a diagram actually appears.
 */
let mermaidPromise = null

function dynamicImport(url) {
  // Hidden from esbuild on purpose: keeps the import at runtime.
  const importer = new Function('u', 'return import(u)')
  return importer(url)
}

export function loadMermaid(config) {
  const cfg = Object.assign(
    { src: 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs', theme: 'default' },
    config || {}
  )
  if (!mermaidPromise) {
    mermaidPromise = dynamicImport(cfg.src)
      .then((mod) => {
        const mermaid = mod.default || mod
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'loose',
          theme: cfg.theme === 'auto' ? 'default' : cfg.theme,
        })
        return mermaid
      })
      .catch((err) => {
        mermaidPromise = null
        throw err
      })
  }
  return mermaidPromise
}

let mermaidSeq = 0

/**
 * Plugin implementing ```mermaid fences for the *preview / viewer* side.
 * The editor side keeps the raw fence, which is what a Markdown author wants.
 */
export function createMermaidPlugin(config) {
  return {
    viewerEffect({ markdownBody }) {
      if (!markdownBody) return
      const nodes = markdownBody.querySelectorAll('pre > code.language-mermaid, pre > code.lang-mermaid')
      if (!nodes.length) return

      loadMermaid(config)
        .then((mermaid) => {
          nodes.forEach((code) => {
            const pre = code.parentNode
            const host = document.createElement('div')
            host.className = 'bytemd-mermaid'
            host.setAttribute('data-bytemd-mermaid', '1')
            pre.parentNode.replaceChild(host, pre)

            const id = 'bytemd-mermaid-' + ++mermaidSeq
            Promise.resolve(mermaid.render(id, code.textContent || ''))
              .then((result) => {
                host.innerHTML = result && result.svg ? result.svg : String(result || '')
                host.setAttribute('data-rendered', '1')
              })
              .catch((err) => {
                host.classList.add('bytemd-mermaid-error')
                host.textContent = 'Mermaid 渲染失败：' + (err && err.message ? err.message : err)
              })
          })
        })
        .catch((err) => {
          const host = markdownBody.ownerDocument.createElement('div')
          host.className = 'bytemd-mermaid-error'
          host.textContent = 'Mermaid 资源加载失败：' + (err && err.message ? err.message : err)
          const first = nodes[0]
          if (first && first.parentNode) first.parentNode.replaceChild(host, first)
        })
    },
  }
}

/* -------------------------------------------------------------------------
 * Image upload
 * ---------------------------------------------------------------------- */

/**
 * `uploadImages` implementation for ByteMD: pushes files into the WordPress
 * media library through the core REST endpoint (`/wp/v2/media`).
 *
 * @param {FileList|File[]} files
 * @param {{ endpoint: string, nonce: string }} config
 * @return {Promise<string[]>} Public URLs, in the same order as the input.
 */
export async function uploadToMediaLibrary(files, config) {
  const list = Array.prototype.slice.call(files || [])
  const out = []
  for (let i = 0; i < list.length; i += 1) {
    const file = list[i]
    const body = new FormData()
    body.append('file', file)
    if (file.name) {
      body.append('title', file.name.replace(/\.[^.]+$/, ''))
    }
    /* eslint-disable no-await-in-loop */
    const res = await fetch(config.endpoint, {
      method: 'POST',
      headers: { 'X-WP-Nonce': config.nonce },
      credentials: 'same-origin',
      body,
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      const msg = json && json.message ? json.message : 'HTTP ' + res.status
      throw new Error('图片上传失败：' + msg)
    }
    out.push(json.source_url)
  }
  return out
}
