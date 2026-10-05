# Newbee Markdown Editor

把 [ByteMD](https://github.com/bytedance/bytemd)（字节跳动开源的 Markdown 编辑器，最新版 **1.22.0**）完整集成进 **WordPress** 的插件（slug：`newbee-markdown-editor`）。既有经典编辑界面接管，也提供 `bytemd/editor` 区块；Markdown 存库，前端可服务端渲染。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![ByteMD](https://img.shields.io/badge/ByteMD-1.22.0-informational)](https://github.com/bytedance/bytemd)
[![WordPress](https://img.shields.io/badge/WordPress-%E2%89%A5%206.5-21759b)](https://wordpress.org/)
[![Release](https://img.shields.io/github/v/release/zhongdaiqi/newbeemd)](https://github.com/zhongdaiqi/newbeemd/releases/latest)

> **非官方声明**：本项目是第三方非官方集成，与字节跳动（ByteDance）及 ByteMD 项目官方**无隶属或背书关系**。"ByteMD" 为其开源项目名称，此处仅用于说明所集成的编辑器组件。
>
> **Independence notice**: Newbee Markdown Editor is an independent project and is not affiliated with any similarly named company.

---

## 特性

- **经典编辑界面接管** —— 把 ByteMD 挂到 `#content` 上，工具栏可一键切回 WordPress 原生编辑器。`<textarea>` 始终保留在 DOM 中并实时同步，因此保存、自动保存、预览、修订版本、REST、WP-CLI 和其他插件**全部无感兼容**。
- **`bytemd/editor` 区块** —— 动态区块，Markdown 存在区块属性里，前端由 PHP 渲染，不会把生成的 HTML 写进数据库。
- **前端渲染三选一** —— 服务端 Parsedown（默认，SEO 友好）/ 浏览器 ByteMD Viewer（与编辑器预览 100% 一致）/ 不渲染。
- **图片拖拽粘贴直传媒体库** —— 走 REST 接口，复用 WordPress 的权限与类型校验。
- **不误伤老文章** —— 只有带 `_wp_bytemd_markdown` 标记的文章才按 Markdown 渲染，旧 HTML 文章编辑时该选项默认不选。
- **零外部请求** —— ByteMD、highlight.js、KaTeX、Mermaid 全部随插件打包，运行时不联系任何第三方服务器（含字体）。KaTeX 与 Mermaid 只在页面上真的出现公式/图表时才加载。
- 完整 i18n（`newbee-markdown-editor.pot`）、7 个扩展钩子、简体中文文档。

## 环境要求

| 项 | 版本 |
| --- | --- |
| PHP | ≥ 7.4 |
| WordPress | ≥ 6.5（在 **7.1.x** 上开发与验证） |
| 服务器 Node | **不需要**（发行包已含编译产物） |

> WordPress 7.1 把 Classic 区块从区块插入器中移除了，但**经典编辑界面本身仍在**（不使用区块编辑器的内容类型、以及 Classic Editor 插件照旧走经典页面）。插件对两条路径都做了适配。

## 安装

### 方式 A：发行包（推荐）

1. 从 [最新 Release](https://github.com/zhongdaiqi/newbeemd/releases/latest) 下载 `wp-bytemd-<version>.zip`；
2. 后台 **插件 → 安装插件 → 上传插件**，选择该 zip；
3. 启用；
4. 打开 **设置 → Newbee Markdown**，勾选要启用的内容类型。

### 方式 B：源码

```bash
cd wp-content/plugins/wp-bytemd/build
npm install          # bytemd 1.22.0 + 官方插件 + esbuild
npm run build        # 产出 ../assets/vendor/*
```

`wp-bytemd/assets/vendor/` 已随仓库提交，直接拷贝 `wp-bytemd/` 目录到 `wp-content/plugins/` 也能用。

> **让经典界面出现 ByteMD**：若目标内容类型仍在用区块编辑器，请在设置里勾选「对上述内容类型禁用区块编辑器」。

## 效果演示

仓库根目录的 [`demo.html`](demo.html) 直接引用插件内的同一份 bundle，**双击即可用浏览器打开**，不需要 WordPress 环境，方便肉眼验收编辑器与渲染效果。

## 配置

设置页分四组：基本设置（内容类型、接管经典界面、禁用区块编辑器、注册区块）、编辑器（显示模式、高度、配色、界面语言、各功能插件开关）、前端渲染（渲染方式、正文配色、原始 HTML、KaTeX / Mermaid 按需加载、短代码、摘要剥离），以及一段「关于外部资源」的说明——本插件不向任何第三方服务器发起请求，所以没有 CDN 之类的可调项。

完整设置项与钩子列表见 **[wp-bytemd/README-zh.md](wp-bytemd/README-zh.md)**。

## 开发与构建

```bash
cd wp-bytemd/build

npm install

node build.mjs        # esbuild 双 entry 打包 → ../assets/vendor（含字体瘦身）
node i18n.mjs         # 生成 languages/newbee-markdown-editor.pot
node lint-php.mjs     # PHP 语法检查（需 npm i --no-save php-parser）
node notices.mjs      # 生成 THIRD-PARTY-NOTICES.md
node package.mjs      # 打包 dist/wp-bytemd-<version>.zip（自带结构校验）
```

### 发版

一条命令跑完「改版本 → 重建 → 打包 → 提交 → 打 tag → 推送 → 建 Release 挂附件 → 验证下载」：

```bash
cd wp-bytemd/build
node release.mjs patch --notes "修复：xxx"          # patch / minor / major / 1.2.3
node release.mjs 1.0.2 --notes release-notes.md    # 说明也可以是一个文件
```

常用参数：`--dry-run`（只到打包为止，不提交不推送）、`--no-release`（推送但不建 Release）、`--yes`（跳过确认）、`--allow-dirty`（容忍未提交改动）。

发版前的工作区必须是干净的，tag 不能已存在，新版本必须大于当前版本——这些都会在改动任何文件之前检查完。版本号会同步改写 5 处（`package.json`、插件头 `Version:`、`WP_BYTEMD_VERSION`、`readme.txt` 的 `Stable tag`、`editor.js`），并在 `readme.txt` 顶部插入对应 changelog 条目。

打包体积（minified）：

| 文件 | 体积 | 说明 |
| --- | --- | --- |
| `bytemd-editor.js` | **1160 KB** | 后台编辑器，仅在编辑页加载 |
| `bytemd-viewer.js` | **878 KB** | 仅"浏览器渲染"模式的前端才加载 |
| `bytemd-katex.js` / `.css` | 261 KB / 21 KB | 仅服务端渲染且页面含公式时加载 |
| `bytemd-mermaid.js` | **3410 KB** | 仅页面含 ```mermaid 代码块时加载 |
| `fonts/` | 254 KB / 20 个 | KaTeX 字体，只保留 woff2 |

三处显著瘦身：`highlight.js` 通过 esbuild `onResolve` 只打包 37 种常用语言（否则会把 190+ 种语法内联、约 1.1 MB）；KaTeX 字体剔除 woff/ttf 只留 woff2（-40 个文件 / -600 KB）；字体瘦身放在 esbuild 的 `onLoad` 阶段完成，让旧格式文件**根本不生成**，而不是生成后再删。

> 为什么 Mermaid 要单独成文件而不是塞进编辑器 bundle：它体积是其余所有产物之和。拆出来后，不含图表的页面一个字节都不会多下载。

## 目录结构

```
.
├── wp-bytemd/                  插件本体（发行包内目录名仍是 wp-bytemd，代码标识不随展示名变化）
│   ├── includes/               8 个 PHP 类，WP_ByteMD_*
│   ├── assets/js|css/          手写脚本与样式
│   ├── assets/vendor/          esbuild 产物（已入库，勿手改）
│   ├── build/                  esbuild 构建工程
│   ├── vendor/parsedown/       Parsedown + ParsedownExtra（服务端渲染）
│   ├── languages/              newbee-markdown-editor.pot
│   └── THIRD-PARTY-NOTICES.md  第三方组件声明（自动生成）
├── dist/                       打包输出（不入库，见 Releases）
├── demo.html                   效果演示页
└── LICENSE
```

## 常见问题

**启用了但经典界面没出现 ByteMD？**
该内容类型还在用区块编辑器。到设置页勾上「对上述内容类型禁用区块编辑器」，或安装 Classic Editor 插件。

**编辑器和前端长得不一样？**
默认走服务端渲染（Parsedown），与 ByteMD 预览的解析器不同，表格、公式这类细节会有差异。想要完全一致就把渲染方式改成「浏览器渲染」。

**公式和图表不显示？**
检查设置页顶部的「运行状态」面板，确认 `bytemd-katex.js` / `bytemd-mermaid.js` 都显示为「已就绪」；再看前端渲染那组开关有没有关掉。顺带一提：本插件不请求任何外部资源，所以在内网/离线环境同样能正常工作，不需要配镜像。

## 致谢

- [ByteMD](https://github.com/bytedance/bytemd) —— 编辑器本体，由字节跳动开源
- [Parsedown](https://github.com/erusev/parsedown) / [ParsedownExtra](https://github.com/erusev/parsedown-extra) —— 服务端 Markdown 渲染
- [KaTeX](https://katex.org/)、[highlight.js](https://highlightjs.org/)、[CodeMirror](https://codemirror.net/)

## 名称与商标

`Newbee Markdown Editor` 是本项目的自有名称，仅作为 WordPress 插件的产品名使用。本项目是独立开发的开源项目，**与任何名称相近的公司、产品或商标持有人均无隶属、赞助、许可或背书关系**（Newbee Markdown Editor is an independent project and is not affiliated with any similarly named company）。项目名不主张对 `Newbee` 一词的排他权利，也不意图与任何在先商标产生混淆。

## 许可

本项目代码以 **MIT** 协议发布，全文见 [LICENSE](LICENSE)。

打包进发行物的第三方组件及其完整许可证文本见 **[wp-bytemd/THIRD-PARTY-NOTICES.md](wp-bytemd/THIRD-PARTY-NOTICES.md)**。共 **171 个组件**，全部为 GPL 兼容许可：

| 许可 | 数量 | 代表组件 |
| --- | --- | --- |
| MIT | 134 | bytemd、katex、mermaid、codemirror-ssr |
| ISC | 29 | d3 系列、delaunator、internmap |
| BSD-3-Clause | 6 | highlight.js、d3-array / d3-shape / d3-sankey |
| MPL-2.0 OR Apache-2.0（双许可，取 MPL-2.0） | 1 | dompurify |
| Unlicense（等同公有领域） | 1 | robust-predicates |

由于构建时使用 esbuild 的 `legalComments: 'none'`，产物内部不含任何许可注释，该文档即为承担声明义务的载体，由 `node build/notices.mjs` 从 esbuild metafile 自动生成。
