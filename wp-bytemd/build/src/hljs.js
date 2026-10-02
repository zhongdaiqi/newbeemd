/**
 * Slim highlight.js build.
 *
 * `@bytemd/plugin-highlight` does `await import('highlight.js')`, which resolves
 * to the *full* bundle: every one of the 190+ grammars, ~1.1 MB of JavaScript.
 * build.mjs rewrites that specifier to this module through an esbuild plugin,
 * so we ship a curated set of ~35 languages instead.
 */

import hljs from 'highlight.js/lib/core'

import bash from 'highlight.js/lib/languages/bash'
import c from 'highlight.js/lib/languages/c'
import cpp from 'highlight.js/lib/languages/cpp'
import csharp from 'highlight.js/lib/languages/csharp'
import css from 'highlight.js/lib/languages/css'
import dart from 'highlight.js/lib/languages/dart'
import diff from 'highlight.js/lib/languages/diff'
import dockerfile from 'highlight.js/lib/languages/dockerfile'
import go from 'highlight.js/lib/languages/go'
import ini from 'highlight.js/lib/languages/ini'
import java from 'highlight.js/lib/languages/java'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import kotlin from 'highlight.js/lib/languages/kotlin'
import less from 'highlight.js/lib/languages/less'
import lua from 'highlight.js/lib/languages/lua'
import makefile from 'highlight.js/lib/languages/makefile'
import markdown from 'highlight.js/lib/languages/markdown'
import nginx from 'highlight.js/lib/languages/nginx'
import objectivec from 'highlight.js/lib/languages/objectivec'
import perl from 'highlight.js/lib/languages/perl'
import php from 'highlight.js/lib/languages/php'
import plaintext from 'highlight.js/lib/languages/plaintext'
import powershell from 'highlight.js/lib/languages/powershell'
import python from 'highlight.js/lib/languages/python'
import r from 'highlight.js/lib/languages/r'
import ruby from 'highlight.js/lib/languages/ruby'
import rust from 'highlight.js/lib/languages/rust'
import scss from 'highlight.js/lib/languages/scss'
import sql from 'highlight.js/lib/languages/sql'
import swift from 'highlight.js/lib/languages/swift'
import typescript from 'highlight.js/lib/languages/typescript'
import vbnet from 'highlight.js/lib/languages/vbnet'
import xml from 'highlight.js/lib/languages/xml'
import yaml from 'highlight.js/lib/languages/yaml'

/* WordPress developers care about these two, and they are cheap to add. */
import phpTemplate from 'highlight.js/lib/languages/php-template'
import shell from 'highlight.js/lib/languages/shell'

const languages = {
  bash,
  c,
  cpp,
  csharp,
  css,
  dart,
  diff,
  dockerfile,
  go,
  ini,
  java,
  javascript,
  json,
  kotlin,
  less,
  lua,
  makefile,
  markdown,
  nginx,
  objectivec,
  perl,
  php,
  'php-template': phpTemplate,
  plaintext,
  powershell,
  python,
  r,
  ruby,
  rust,
  scss,
  shell,
  sql,
  swift,
  typescript,
  vbnet,
  xml,
  yaml,
}

Object.keys( languages ).forEach( function ( name ) {
  hljs.registerLanguage( name, languages[ name ] )
} )

hljs.registerAliases( [ 'html', 'xhtml', 'svg', 'vue', 'plist', 'rss' ], { languageName: 'xml' } )
hljs.registerAliases( [ 'sh', 'zsh', 'console', 'shell-session' ], { languageName: 'bash' } )
hljs.registerAliases( [ 'js', 'jsx', 'mjs', 'cjs' ], { languageName: 'javascript' } )
hljs.registerAliases( [ 'ts', 'tsx' ], { languageName: 'typescript' } )
hljs.registerAliases( [ 'py', 'pycon' ], { languageName: 'python' } )
hljs.registerAliases( [ 'yml' ], { languageName: 'yaml' } )
hljs.registerAliases( [ 'toml' ], { languageName: 'ini' } )
hljs.registerAliases( [ 'cs' ], { languageName: 'csharp' } )
hljs.registerAliases( [ 'kt', 'kts' ], { languageName: 'kotlin' } )
hljs.registerAliases( [ 'md' ], { languageName: 'markdown' } )
hljs.registerAliases( [ 'postgres', 'postgresql', 'mysql' ], { languageName: 'sql' } )
hljs.registerAliases( [ 'objc', 'obj-c' ], { languageName: 'objectivec' } )
hljs.registerAliases( [ 'pwsh', 'ps1' ], { languageName: 'powershell' } )
hljs.registerAliases( [ 'golang' ], { languageName: 'go' } )
hljs.registerAliases( [ 'rs' ], { languageName: 'rust' } )

/**
 * Languages kept in the bundle; exposed so the settings screen can list them.
 */
export const shippedLanguages = Object.keys( languages )

export default hljs
