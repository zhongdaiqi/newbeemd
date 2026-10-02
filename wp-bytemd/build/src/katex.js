/**
 * Standalone KaTeX runtime for the public front end.
 *
 * Server-rendered Markdown (`data-bytemd-rendered="server"`) is produced by
 * Parsedown, which does not understand `$…$` / `$$…$$`. The front-end script
 * finishes the job with KaTeX's auto-render extension — and WordPress.org
 * guideline 8 requires that JavaScript to be served from the plugin itself,
 * never from a third-party CDN.
 *
 * Exposes the two globals the front-end script looks for:
 *   window.katex
 *   window.renderMathInElement
 */

// Import through the ESM entry so that `katex` and `auto-render` share a
// single copy of the library instead of pulling in both katex.js and katex.mjs.
import katex from 'katex/dist/katex.mjs'
import renderMathInElement from 'katex/dist/contrib/auto-render.mjs'

import 'katex/dist/katex.min.css'

window.katex = katex
window.renderMathInElement = renderMathInElement

export { katex, renderMathInElement }
export default katex
