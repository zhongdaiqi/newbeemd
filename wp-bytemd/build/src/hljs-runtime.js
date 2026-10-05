/**
 * Standalone highlight.js runtime for the public front end.
 *
 * Server-rendered Markdown (the default `data-bytemd-rendered="server"`
 * path) is produced by Parsedown, which emits plain
 * `<pre><code class="language-…">` blocks — ByteMD's own highlight plugin
 * never runs there. This bundle gives `bytemd-frontend.js` the same slim
 * highlight.js build the editor preview uses, loaded on demand only on pages
 * that actually contain code blocks.
 *
 * It has to live inside the plugin rather than on a CDN: WordPress.org
 * guideline 8 forbids calling third-party CDNs for non-service JavaScript.
 *
 * Exposes `window.WPByteMDHljs`.
 */

import hljs from './hljs.js'

import 'highlight.js/styles/github.css'

window.WPByteMDHljs = hljs

export default hljs
