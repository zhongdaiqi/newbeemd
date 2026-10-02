# 第三方组件声明 / Third-Party Notices

**ByteMD for WordPress** 的发行包（`dist/wp-bytemd-*.zip`）与浏览器产物中，包含了下列第三方开源组件。

构建脚本使用 esbuild 把 ByteMD 及其依赖树打包进 `assets/vendor/*.js`，并设置了
`legalComments: 'none'`——该选项会移除输出中的所有注释，因此这些组件的版权与许可证声明
**不会出现在打包产物内部**，改由本文档统一承载。MIT 与 BSD-3-Clause 均要求版权声明随软件一并分发。

- 生成时间：2026-10-02T06:49:50.680Z
- 打包的 ByteMD 版本：1.22.0
- 组件总数：**115**
- 完整依赖清单见 `assets/vendor/MANIFEST.json`

> 本文档由 `node build/notices.mjs` 自动生成，请勿手工修改；新增或升级依赖后请重新生成。

---

## 一、组件清单

### MIT（114 个）

| 组件 | 版本 | 版权声明 |
| --- | --- | --- |
| `@bytemd/plugin-breaks` | 1.22.0 | Copyright (c) 2020 Rongjian Zhang |
| `@bytemd/plugin-frontmatter` | 1.22.0 | Copyright (c) 2020 Rongjian Zhang |
| `@bytemd/plugin-gemoji` | 1.22.0 | Copyright (c) 2020 Rongjian Zhang |
| `@bytemd/plugin-gfm` | 1.22.0 | Copyright (c) 2020 Rongjian Zhang |
| `@bytemd/plugin-highlight` | 1.22.0 | Copyright (c) 2020 Rongjian Zhang |
| `@bytemd/plugin-math` | 1.22.0 | Copyright (c) 2020 Rongjian Zhang |
| `@bytemd/plugin-medium-zoom` | 1.22.0 | Copyright (c) 2020 Rongjian Zhang |
| `@popperjs/core` | 2.11.8 | Copyright (c) 2019 Federico Zivolo |
| `bail` | 2.0.2 | Copyright (c) 2015 Titus Wormer <tituswormer@gmail.com> |
| `bytemd` | 1.22.0 | Copyright (c) 2020 Rongjian Zhang |
| `ccount` | 2.0.1 | Copyright (c) 2015 Titus Wormer <tituswormer@gmail.com> |
| `character-entities-html4` | 2.1.0 | Copyright (c) 2015 Titus Wormer <tituswormer@gmail.com> |
| `character-entities-legacy` | 3.0.0 | Copyright (c) 2015 Titus Wormer <tituswormer@gmail.com> |
| `codemirror-ssr` | 0.65.0 | Copyright (c) 2021 Rongjian Zhang |
| `comma-separated-tokens` | 2.0.3 | Copyright (c) 2016 Titus Wormer <tituswormer@gmail.com> |
| `decode-named-character-reference` | 1.3.0 | Copyright (c) Titus Wormer <tituswormer@gmail.com> |
| `escape-string-regexp` | 5.0.0 | Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (https://sindresorhus.com) |
| `extend` | 3.0.2 | Copyright (c) 2014 Stefan Thomas |
| `fault` | 2.0.1 | Copyright (c) 2015 Titus Wormer <tituswormer@gmail.com> |
| `format` | 0.2.2 | 作者：Sami Samhuri <sami@samhuri.net> |
| `gemoji` | 7.1.0 | Copyright (c) 2014 Titus Wormer <tituswormer@gmail.com> |
| `hast-util-from-parse5` | 7.1.2 | Copyright (c) 2016 Titus Wormer <tituswormer@gmail.com> |
| `hast-util-parse-selector` | 3.1.1 | Copyright (c) 2016 Titus Wormer <tituswormer@gmail.com> |
| `hast-util-raw` | 7.2.3 | Copyright (c) 2016 Titus Wormer <tituswormer@gmail.com> |
| `hast-util-sanitize` | 4.1.0 | Copyright (c) 2016 Titus Wormer <tituswormer@gmail.com> |
| `hast-util-to-html` | 8.0.4 | Copyright (c) 2016 Titus Wormer <tituswormer@gmail.com> |
| `hast-util-to-parse5` | 7.1.0 | Copyright (c) 2016 Titus Wormer <tituswormer@gmail.com> |
| `hast-util-whitespace` | 2.0.1 | Copyright (c) 2016 Titus Wormer <tituswormer@gmail.com> |
| `hastscript` | 7.2.0 | Copyright (c) 2016 Titus Wormer <tituswormer@gmail.com> |
| `html-void-elements` | 2.0.1 | Copyright (c) 2016 Titus Wormer <tituswormer@gmail.com> |
| `is-buffer` | 2.0.5 | Copyright (c) Feross Aboukhadijeh |
| `is-plain-obj` | 4.1.0 | Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (https://sindresorhus.com) |
| `js-yaml` | 4.3.2 | Copyright (C) 2011-2015 by Vitaly Puzrin |
| `katex` | 0.16.25 | Copyright (c) 2013-2020 Khan Academy and other contributors |
| `lodash-es` | 4.18.1 | Copyright OpenJS Foundation and other contributors <https://openjsf.org/> |
| `longest-streak` | 3.1.0 | Copyright (c) 2015 Titus Wormer <mailto:tituswormer@gmail.com> |
| `markdown-table` | 3.0.4 | Copyright (c) Titus Wormer <tituswormer@gmail.com> |
| `mdast-util-definitions` | 5.1.2 | Copyright (c) 2015-2016 Titus Wormer <tituswormer@gmail.com> |
| `mdast-util-find-and-replace` | 2.2.2 | Copyright (c) 2020 Titus Wormer <tituswormer@gmail.com> |
| `mdast-util-from-markdown` | 1.3.1 | Copyright (c) 2020 Titus Wormer <tituswormer@gmail.com> |
| `mdast-util-frontmatter` | 1.0.1 | Copyright (c) 2020 Titus Wormer <tituswormer@gmail.com> |
| `mdast-util-gfm` | 2.0.2 | Copyright (c) 2020 Titus Wormer <tituswormer@gmail.com> |
| `mdast-util-gfm-autolink-literal` | 1.0.3 | Copyright (c) 2020 Titus Wormer <tituswormer@gmail.com> |
| `mdast-util-gfm-footnote` | 1.0.2 | Copyright (c) 2021 Titus Wormer <tituswormer@gmail.com> |
| `mdast-util-gfm-strikethrough` | 1.0.3 | Copyright (c) 2020 Titus Wormer <tituswormer@gmail.com> |
| `mdast-util-gfm-table` | 1.0.7 | Copyright (c) 2020 Titus Wormer <tituswormer@gmail.com> |
| `mdast-util-gfm-task-list-item` | 1.0.2 | Copyright (c) 2020 Titus Wormer <tituswormer@gmail.com> |
| `mdast-util-math` | 2.0.2 | Copyright (c) 2020 Titus Wormer <tituswormer@gmail.com> |
| `mdast-util-newline-to-break` | 1.0.0 | Copyright (c) 2017 Titus Wormer <tituswormer@gmail.com> |
| `mdast-util-to-hast` | 12.3.0 | Copyright (c) 2016 Titus Wormer <tituswormer@gmail.com> |
| `mdast-util-to-markdown` | 1.5.0 | Copyright (c) 2020 Titus Wormer <tituswormer@gmail.com> |
| `mdast-util-to-string` | 3.2.0 | Copyright (c) 2015 Titus Wormer <tituswormer@gmail.com> |
| `medium-zoom` | 1.1.0 | Copyright (c) 2016-present François Chalifour |
| `micromark` | 3.2.0 | 作者：Titus Wormer <tituswormer@gmail.com> (https://wooorm.com) |
| `micromark-core-commonmark` | 1.1.0 | 作者：Titus Wormer <tituswormer@gmail.com> (https://wooorm.com) |
| `micromark-extension-frontmatter` | 1.1.1 | Copyright (c) 2020 Titus Wormer <tituswormer@gmail.com> |
| `micromark-extension-gfm` | 2.0.3 | Copyright (c) 2020 Titus Wormer <tituswormer@gmail.com> |
| `micromark-extension-gfm-autolink-literal` | 1.0.5 | Copyright (c) 2020 Titus Wormer <tituswormer@gmail.com> |
| `micromark-extension-gfm-footnote` | 1.1.2 | Copyright (c) 2021 Titus Wormer <tituswormer@gmail.com> |
| `micromark-extension-gfm-strikethrough` | 1.0.7 | Copyright (c) 2020 Titus Wormer <tituswormer@gmail.com> |
| `micromark-extension-gfm-table` | 1.0.7 | Copyright (c) 2020 Titus Wormer <tituswormer@gmail.com> |
| `micromark-extension-gfm-tagfilter` | 1.0.2 | Copyright (c) 2020 Titus Wormer <tituswormer@gmail.com> |
| `micromark-extension-gfm-task-list-item` | 1.0.5 | Copyright (c) 2020 Titus Wormer <tituswormer@gmail.com> |
| `micromark-extension-math` | 2.1.2 | Copyright (c) 2020 Titus Wormer <tituswormer@gmail.com> |
| `micromark-factory-destination` | 1.1.0 | 作者：Titus Wormer <tituswormer@gmail.com> (https://wooorm.com) |
| `micromark-factory-label` | 1.1.0 | 作者：Titus Wormer <tituswormer@gmail.com> (https://wooorm.com) |
| `micromark-factory-space` | 1.1.0 | 作者：Titus Wormer <tituswormer@gmail.com> (https://wooorm.com) |
| `micromark-factory-title` | 1.1.0 | 作者：Titus Wormer <tituswormer@gmail.com> (https://wooorm.com) |
| `micromark-factory-whitespace` | 1.1.0 | 作者：Titus Wormer <tituswormer@gmail.com> (https://wooorm.com) |
| `micromark-util-character` | 1.2.0 | 作者：Titus Wormer <tituswormer@gmail.com> (https://wooorm.com) |
| `micromark-util-chunked` | 1.1.0 | 作者：Titus Wormer <tituswormer@gmail.com> (https://wooorm.com) |
| `micromark-util-classify-character` | 1.1.0 | 作者：Titus Wormer <tituswormer@gmail.com> (https://wooorm.com) |
| `micromark-util-combine-extensions` | 1.1.0 | 作者：Titus Wormer <tituswormer@gmail.com> (https://wooorm.com) |
| `micromark-util-decode-numeric-character-reference` | 1.1.0 | 作者：Titus Wormer <tituswormer@gmail.com> (https://wooorm.com) |
| `micromark-util-decode-string` | 1.1.0 | 作者：Titus Wormer <tituswormer@gmail.com> (https://wooorm.com) |
| `micromark-util-encode` | 1.1.0 | 作者：Titus Wormer <tituswormer@gmail.com> (https://wooorm.com) |
| `micromark-util-html-tag-name` | 1.2.0 | 作者：Titus Wormer <tituswormer@gmail.com> (https://wooorm.com) |
| `micromark-util-normalize-identifier` | 1.1.0 | 作者：Titus Wormer <tituswormer@gmail.com> (https://wooorm.com) |
| `micromark-util-resolve-all` | 1.1.0 | 作者：Titus Wormer <tituswormer@gmail.com> (https://wooorm.com) |
| `micromark-util-sanitize-uri` | 1.2.0 | 作者：Titus Wormer <tituswormer@gmail.com> (https://wooorm.com) |
| `micromark-util-subtokenize` | 1.1.0 | 作者：Titus Wormer <tituswormer@gmail.com> (https://wooorm.com) |
| `parse5` | 6.0.1 | Copyright (c) 2013-2019 Ivan Nikulin (ifaaan@gmail.com, https://github.com/inikulin) |
| `Parsedown` | 1.8.0 | Copyright (c) 2013-2018 Emanuil Rusev, erusev.com |
| `ParsedownExtra` | 0.9.0 | Copyright (c) 2013 Emanuil Rusev, erusev.com |
| `property-information` | 6.5.0 | Copyright (c) 2015 Titus Wormer <mailto:tituswormer@gmail.com> |
| `rehype-raw` | 6.1.1 | Copyright (c) 2016 Titus Wormer <tituswormer@gmail.com> |
| `rehype-sanitize` | 5.0.1 | Copyright (c) 2016 Titus Wormer <tituswormer@gmail.com> |
| `rehype-stringify` | 9.0.4 | 作者：Titus Wormer <tituswormer@gmail.com> (https://wooorm.com) |
| `remark-breaks` | 3.0.3 | Copyright (c) 2017 Titus Wormer <tituswormer@gmail.com> |
| `remark-frontmatter` | 4.0.1 | Copyright (c) 2017 Titus Wormer <tituswormer@gmail.com> |
| `remark-gemoji` | 7.0.1 | Copyright (c) 2016 Titus Wormer |
| `remark-gfm` | 3.0.1 | Copyright (c) 2020 Titus Wormer <tituswormer@gmail.com> |
| `remark-math` | 5.1.1 | 作者：Junyoung Choi <fluke8259@gmail.com> (https://rokt33r.github.io) |
| `remark-parse` | 10.0.2 | Copyright (c) 2014-2020 Titus Wormer <tituswormer@gmail.com> Copyright (c) 2011-2014, Christopher Jeffrey (https://github.com/chjj/) |
| `remark-rehype` | 10.1.0 | Copyright (c) 2016 Titus Wormer <tituswormer@gmail.com> |
| `select-files` | 1.0.1 | Copyright © 2019 Vitor Luiz Cavalcanti |
| `space-separated-tokens` | 2.0.2 | Copyright (c) 2016 Titus Wormer <tituswormer@gmail.com> |
| `stringify-entities` | 4.0.4 | Copyright (c) 2015 Titus Wormer <mailto:tituswormer@gmail.com> |
| `tippy.js` | 6.3.7 | Copyright (c) 2017-present atomiks |
| `trim-lines` | 3.0.1 | Copyright (c) 2015 Titus Wormer <mailto:tituswormer@gmail.com> |
| `trough` | 2.2.0 | Copyright (c) 2016 Titus Wormer <tituswormer@gmail.com> |
| `unified` | 10.1.2 | Copyright (c) 2015 Titus Wormer <tituswormer@gmail.com> |
| `unist-util-generated` | 2.0.1 | Copyright (c) 2016 Titus Wormer <tituswormer@gmail.com> |
| `unist-util-is` | 5.2.1 | Copyright (c) 2015 Titus Wormer <tituswormer@gmail.com> |
| `unist-util-position` | 4.0.4 | Copyright (c) 2015 Titus Wormer <tituswormer@gmail.com> |
| `unist-util-stringify-position` | 3.0.3 | Copyright (c) 2016 Titus Wormer <tituswormer@gmail.com> |
| `unist-util-visit` | 4.1.2 | Copyright (c) 2015 Titus Wormer <tituswormer@gmail.com> |
| `unist-util-visit-parents` | 5.1.3 | Copyright (c) 2016 Titus Wormer <tituswormer@gmail.com> |
| `vfile` | 5.3.7 | Copyright (c) 2015 Titus Wormer <tituswormer@gmail.com> |
| `vfile-location` | 4.1.0 | Copyright (c) 2016 Titus Wormer <tituswormer@gmail.com> |
| `vfile-message` | 3.1.4 | Copyright (c) 2017 Titus Wormer <tituswormer@gmail.com> |
| `web-namespaces` | 2.0.1 | Copyright (c) 2016 Titus Wormer <tituswormer@gmail.com> |
| `word-count` | 0.2.2 | 作者：Hsiaoming Yang <me@lepture.com> |
| `zwitch` | 2.0.4 | Copyright (c) 2016 Titus Wormer <tituswormer@gmail.com> |

### BSD-3-Clause（1 个）

| 组件 | 版本 | 版权声明 |
| --- | --- | --- |
| `highlight.js` | 11.11.1 | Copyright (c) 2006, Ivan Sagalaev. |

---

## 二、许可证全文

### MIT

以下文本逐字取自 `@bytemd/plugin-breaks@1.22.0`。同类组件的许可证文本与本文件一致，
差异仅在于版权署名行——每个组件的版权署名见上表。

```text
MIT License

Copyright (c) 2020 Rongjian Zhang

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### BSD-3-Clause

以下文本逐字取自 `highlight.js@11.11.1`。同类组件的许可证文本与本文件一致，
差异仅在于版权署名行——每个组件的版权署名见上表。

```text
BSD 3-Clause License

Copyright (c) 2006, Ivan Sagalaev.
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice, this
  list of conditions and the following disclaimer.

* Redistributions in binary form must reproduce the above copyright notice,
  this list of conditions and the following disclaimer in the documentation
  and/or other materials provided with the distribution.

* Neither the name of the copyright holder nor the names of its
  contributors may be used to endorse or promote products derived from
  this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

---

## 三、关于名称与官方关系

本插件是**非官方**的第三方集成，与字节跳动（ByteDance）及 ByteMD 项目官方无隶属或背书关系。
“ByteMD”为其开源项目名称，此处仅用于说明本插件所集成的编辑器组件。
