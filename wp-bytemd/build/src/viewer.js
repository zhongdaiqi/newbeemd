/**
 * Entry point: front-end viewer bundle.
 *
 * Smaller than the editor bundle (no CodeMirror), used when the site owner
 * picks client-side rendering so that the published post looks *exactly* like
 * the editor preview.
 */

import { Viewer } from 'bytemd'

import {
  pluginFactories,
  buildPlugins,
  createMermaidPlugin,
  loadMermaid,
} from './shared.js'

const WPByteMDViewer = {
  bytemdVersion: '1.22.0',
  Viewer,
  pluginFactories,
  buildPlugins,
  createMermaidPlugin,
  loadMermaid,
}

window.WPByteMD = Object.assign(window.WPByteMD || {}, { Viewer }, WPByteMDViewer)

export default WPByteMDViewer
