=== Newbee Markdown Editor ===
Contributors: zhongdaiqi
Tags: markdown, markdown editor, editor, gfm, katex
Requires at least: 6.5
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 1.3.1
License: MIT
License URI: https://opensource.org/licenses/MIT

Write and publish Markdown in WordPress with ByteMD: a split-pane editor with GFM tables, code highlighting, KaTeX maths and Mermaid diagrams.

== Description ==

This plugin brings the [ByteMD](https://github.com/bytedance/bytemd) Markdown editor to WordPress. ByteMD 1.22.0 is bundled with the plugin, so nothing has to be fetched from the internet while you write.

**Two ways to write**

1. **Classic editor takeover** — on the post types you select, ByteMD replaces the default content editor. The original textarea stays in the DOM and is kept in sync on every keystroke, so saving, previewing, autosave, revisions, the REST API and WP-CLI all keep working. Authors can switch back to the WordPress editor with one click at any time.
2. **Editor block** — a `bytemd/editor` block named "ByteMD Markdown" is registered for the block editor. The Markdown lives in the block attributes and is rendered on the server, so no generated HTML is stored in the database.

**Three ways to render the front end**

Markdown is stored as-is in `post_content`, and the public output is produced according to your setting:

* **Server-side** (default) — Parsedown + ParsedownExtra. Good for SEO, no JavaScript required.
* **Client-side** — ByteMD's Viewer, so the public page matches the editor preview exactly.
* **None** — the Markdown is output as plain paragraphs.

KaTeX and Mermaid are still applied on top of server-rendered output, but only on pages that actually contain maths or a diagram.

**Also included**

* Drag, paste or pick images; they are uploaded straight into the Media Library.
* GFM tables, task lists, strikethrough, autolinks.
* Code highlighting through highlight.js.
* A `[bytemd]…[/bytemd]` shortcode for Markdown fragments anywhere on a site.
* Optional stripping of Markdown syntax from excerpts.
* A per-post "Render this post as Markdown" toggle, so converting a site does not touch existing HTML posts.

**Privacy**

This plugin never contacts an external server. The editor, highlight.js, KaTeX and Mermaid all ship inside the plugin and are loaded only on pages that need them. There is no telemetry, no third-party CDN request, and no account.

**Source code and build tools**

Development happens on GitHub: https://github.com/zhongdaiqi/newbeemd

The files in `assets/vendor/` are compiled from that repository. To rebuild them from source:

    git clone https://github.com/zhongdaiqi/newbeemd
    cd newbeemd/wp-bytemd/build
    npm install
    npm run build

The build tooling is not part of the plugin archive, because none of it is needed to run the plugin.

**Credits and licence**

ByteMD is an open source project by ByteDance, released under the MIT licence. This plugin is an independent, unofficial integration and is not affiliated with or endorsed by ByteDance. The full list of bundled components and their licences is in `THIRD-PARTY-NOTICES.md` inside the plugin.

== Installation ==

1. Install it from **Plugins → Add New**, or upload the ZIP through **Plugins → Add New → Upload Plugin**.
2. Activate the plugin.
3. Go to **Settings → ByteMD** and select the post types you want to write in Markdown.
4. If those post types still use the block editor, tick **Disable the block editor for the post types above** so that the classic editing screen — and therefore ByteMD — appears.

Prebuilt assets are included, so no Node.js installation is required on the server.

== Frequently Asked Questions ==

= Do I need the Classic Editor plugin? =

No. This plugin can disable the block editor for the post types you choose by itself.

= WordPress 7.1 removed the Classic block. Does that break anything? =

No. 7.1 only removed the Classic block from the block inserter. Post types that do not use the block editor still open the classic editing screen, and that is the screen ByteMD takes over.

= Will my existing posts break? =

No. Only posts carrying the `_wp_bytemd_markdown` flag are rendered as Markdown. The "Render this post as Markdown" checkbox controls that flag per post, and posts written in the block editor are never touched.

= How do images get uploaded? =

Drag, paste, or use the image button in the editor toolbar. Files are sent to the Media Library through the WordPress REST API, so the same capability checks apply as anywhere else in the admin.

= Does it need internet access or a CDN? =

No. Every asset is served from the plugin directory, which also makes the plugin safe to use on intranets and offline installations.

= Where can I get help? =

Please use this plugin's support forum, or open an issue at https://github.com/zhongdaiqi/newbeemd/issues

== Changelog ==

= 1.3.1 =
* 默认浅色编辑器（修复后台配色误判）；插入链接等工具提示改为可读配色；前台服务端渲染新增代码高亮与复制按钮；修复含特定字样的文章被跳过 Markdown 渲染的问题。

= 1.3.0 =
* Renamed to **Newbee Markdown Editor**. The display name no longer carries the ByteMD project name, so the name reads as one independent integration instead of an official ByteMD product. The slug and text domain are now `newbee-markdown-editor`. ByteMD stays credited in the description, and the plugin remains an unofficial integration that is not affiliated with or endorsed by ByteDance.
* Every asset now goes through the WordPress enqueue API. A stylesheet that had to load after the head was printed with a hand-written `<link>` tag; WordPress already prints late-enqueued styles itself through `print_late_styles()`, so the tag is gone - which also fixes that stylesheet being loaded twice on those pages.
* Removed a hand-written `<script>` tag that carried the viewer configuration as a fallback. It was unreachable in practice, and the script it configured is not loaded in that situation either.
* Removed `load_plugin_textdomain()`, which has not been needed for plugins hosted on WordPress.org since WordPress 4.6.
* The block editor script still used a retired text domain, so none of its strings were translatable. The domain is corrected and `wp_set_script_translations()` is registered for it.
* The settings page and the editor block now use the plugin's own name instead of the ByteMD project name.
* Fixed the "Settings" link on the Plugins screen, which pointed at a page slug that no longer existed.
* Repository links updated to https://github.com/zhongdaiqi/newbeemd.

= 1.2.1 =
* 修掉 WordPress.org 自动预检拦下的一条 ERROR，并减少一条告警。
* **ERROR `plugin_header_tested_up_to_not_allowed`**：`wp-bytemd.php` 头部同时声明了 `Tested up to: 7.1`。Plugin Directory 要求该字段**只写在 `readme.txt`**——两处并存会在后续版本里静默失去同步。已从插件头部删除，readme 保留；打包脚本新增断言，头部一旦再出现该字段就直接打包失败。
* 发行包不再包含 `README-zh.md`（Plugin Check 告警 `unexpected_markdown_file`）。它是仓库文档，插件运行不需要，面向上层用户的说明以 `readme.txt` 为准。
* `THIRD-PARTY-NOTICES.md` **保留**：内置组件的 MIT / ISC / BSD 许可证要求版权声明随软件一并分发，该文件正是履行这项义务的载体，属于 Plugin Check 的误报。

= 1.2.0 =
* 为提交 WordPress.org 插件目录做了一次改名。
* 展示名：`WP Markdown Editor (ByteMD)` → **`Newbee Markdown Editor (ByteMD)`**
* text domain 与 slug：`wp-bytemd` → `newbee-markdown-editor-bytemd`
* 起因是 wp.org 的名称校验直接拒绝了原名称：**新提交的插件不得在显示名或永久链接中使用受限词 `wp`**（`wp-*` 这类老插件属于历史遗留，不适用于新提交）。同时 wp.org 强制要求 text domain 必须等于 slug，而 slug 由插件名自动生成，因此 96 处 `__( ..., 'wp-bytemd' )` 全部随之更新。
* `Newbee` 作为唯一品牌前缀，既避开受限词，也满足「名称不得只由通用词构成」的要求；`ByteMD` 放在括号里位于名称末尾，不触发指南第 17 条「不得以他人项目名开头」。
* 未改动：插件目录名 `wp-bytemd/`、主文件 `wp-bytemd.php`、`WP_ByteMD_*` 类与 `WP_BYTEMD_*` 常量、发行包文件名 `dist/wp-bytemd-<version>.zip` —— 这些是代码标识与打包路径，不是展示名，也不影响 wp.org 的安装路径（wp.org 一律装进 `<slug>/`）。
* 其他：
* 翻译模板重建为 `languages/newbee-markdown-editor-bytemd.pot`（96 条）
* 第三方声明重新生成，组件清单不变（仍为 171 个，许可证全部 GPL 兼容）
* readme 安装说明改为不依赖具体目录名

= 1.1.1 =
* The release package no longer ships the build tooling in `build/`. It now contains only the files WordPress needs to run the plugin, which is what the Plugin Directory requires of a submission.
* Build scripts, the npm lockfile and the esbuild configuration stay in the GitHub repository, where the bundled runtime can still be rebuilt from source.
* `package.mjs` now fails the build if `build/` ever ends up back in the archive.
* The readme points at the repository for build instructions instead of at a folder inside the plugin.

= 1.1.0 =
* Bundle KaTeX and Mermaid locally and remove every third-party CDN request.
* WordPress.org guideline 8 requires all non-service related JavaScript and CSS to be included locally, and guideline 7 forbids offloading assets to a third party. KaTeX and Mermaid used to be fetched from jsDelivr at runtime, which broke both.
* KaTeX and Mermaid now ship inside the plugin as their own files and are loaded only on pages that actually use them.
* The CDN override settings (`cdn_base`, `katex_version`, `mermaid_version`) are gone, and stale values are removed the next time settings are saved.
* Mermaid runs with `securityLevel: strict` instead of `loose`, so HTML labels and click handlers are disabled.
* Code highlighting, maths and diagram assets are never requested from an external server, which also makes the plugin safe on intranets and offline installs.
* `readme.txt` is now in English and follows the WordPress.org readme standard, including the source code and build instructions.
* The display name, text domain and permalink were aligned with the Plugin Directory naming rules.
* The per-post Markdown flag is written only when the request carries a valid post nonce.
* Third-party notices regenerated: 171 components, all under GPL-compatible licences (MIT 134, ISC 29, BSD-3-Clause 6, MPL-2.0-or-Apache-2.0 1, Unlicense 1).

= 1.0.1 =
* Fixed the release archive: entry names used a backslash as the path separator, which made WordPress extract no plugin folder at all and report "Plugin file does not exist" on activation.
* Bundling is now done in pure Node, with a read-back check of every entry and CRC.
* Added `THIRD-PARTY-NOTICES.md`, plus the Parsedown licence files that were missing.
* Build intermediates (the esbuild metafile) no longer end up in the archive.

= 1.0.0 =
* First release: ByteMD 1.22.0, classic editor takeover, editor block, server/client rendering, image uploads, KaTeX, Mermaid, shortcode.

== Upgrade Notice ==

= 1.3.0 =
Renamed to Newbee Markdown Editor, with all assets moved to the WordPress enqueue API. No configuration changes are required.

= 1.0.1 =
Fixes activation failing with "Plugin file does not exist" on servers whose unzip implementation follows the ZIP specification strictly.
