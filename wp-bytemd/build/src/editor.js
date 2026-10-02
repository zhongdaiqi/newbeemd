/**
 * Entry point: admin editor bundle.
 *
 * Exposes `window.WPByteMD` with everything the WordPress admin scripts need.
 */

import { Editor } from 'bytemd'
import zhHans from 'bytemd/locales/zh_Hans.json'
import en from 'bytemd/locales/en.json'

import {
  pluginFactories,
  buildPlugins,
  createMermaidPlugin,
  loadMermaid,
  uploadToMediaLibrary,
} from './shared.js'

const WPByteMD = {
  version: '1.2.0',
  bytemdVersion: '1.22.0',
  Editor,
  pluginFactories,
  buildPlugins,
  createMermaidPlugin,
  loadMermaid,
  uploadToMediaLibrary,
  locales: { zh_Hans: zhHans, en },
}

window.WPByteMD = Object.assign(window.WPByteMD || {}, WPByteMD)

export default WPByteMD
