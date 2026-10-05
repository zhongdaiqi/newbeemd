/**
 * Entry point: admin editor bundle.
 *
 * Exposes `window.WPByteMD` with everything the WordPress admin scripts need.
 */

import { Editor } from 'bytemd'
import zhHans from 'bytemd/locales/zh_Hans.json'
import en from 'bytemd/locales/en.json'

/*
 * ByteMD's toolbar dropdowns (headings, link insertion, …) are tippy
 * popovers hard-wired to the `light-border` theme. tippy ships no styling of
 * its own until its stylesheet is loaded — without these two imports the
 * dropdown renders as transparent text floating over the editor, which is
 * unreadable on a dark admin colour scheme.
 */
import 'tippy.js/dist/tippy.css'
import 'tippy.js/themes/light-border.css'

import {
  pluginFactories,
  buildPlugins,
  createMermaidPlugin,
  loadMermaid,
  uploadToMediaLibrary,
} from './shared.js'

const WPByteMD = {
  version: '1.3.3',
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
