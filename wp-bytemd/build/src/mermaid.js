/**
 * Standalone Mermaid runtime.
 *
 * Mermaid is ~3 MB, so it is kept out of the editor and viewer bundles and
 * shipped as its own file. The plugin injects this script lazily, the first
 * time a page actually contains a ```mermaid fence.
 *
 * It has to live inside the plugin rather than on a CDN: WordPress.org
 * guideline 8 forbids calling third-party CDNs for non-service JavaScript.
 *
 * Exposes `window.WPByteMDMermaid`, consumed by:
 *   - assets/js/bytemd-frontend.js   (public pages)
 *   - src/shared.js                  (editor preview + client-side viewer)
 */

import mermaid from 'mermaid'

window.WPByteMDMermaid = mermaid

export default mermaid
