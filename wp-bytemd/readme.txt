=== WP Markdown Editor (ByteMD) ===
Contributors: zhongdaiqi
Tags: markdown, markdown editor, editor, gfm, katex
Requires at least: 6.5
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 1.1.0
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

Development happens on GitHub: https://github.com/zhongdaiqi/wpbytemd

The files in `assets/vendor/` are compiled from that repository. To rebuild them from source:

    git clone https://github.com/zhongdaiqi/wpbytemd
    cd wpbytemd/wp-bytemd/build
    npm install
    npm run build

The build tooling is not part of the plugin archive, because none of it is needed to run the plugin.

**Credits and licence**

ByteMD is an open source project by ByteDance, released under the MIT licence. This plugin is an independent, unofficial integration and is not affiliated with or endorsed by ByteDance. The full list of bundled components and their licences is in `THIRD-PARTY-NOTICES.md` inside the plugin.

== Installation ==

1. Upload the `wp-bytemd` folder to `/wp-content/plugins/`, or install the ZIP through **Plugins → Add New → Upload Plugin**.
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

Please use this plugin's support forum, or open an issue at https://github.com/zhongdaiqi/wpbytemd/issues

== Changelog ==

= 1.1.0 =
* Bundle KaTeX and Mermaid locally and remove every third-party CDN request.
* WordPress.org guideline 8 requires all non-service related JavaScript and CSS to be included locally, and guideline 7 forbids offloading assets to a third party. KaTeX and Mermaid used to be fetched from jsDelivr at runtime, which broke both.
* KaTeX and Mermaid now ship inside the plugin as their own files and are loaded only on pages that actually use them.
* The CDN override settings (`cdn_base`, `katex_version`, `mermaid_version`) are gone, and stale values are removed the next time settings are saved.
* Mermaid runs with `securityLevel: strict` instead of `loose`, so HTML labels and click handlers are disabled.
* Code highlighting, maths and diagram assets are never requested from an external server, which also makes the plugin safe on intranets and offline installs.
* `readme.txt` is now in English and follows the WordPress.org readme standard, including the source code and build instructions.
* The plugin display name is now "WP Markdown Editor (ByteMD)". The slug and text domain stay `wp-bytemd`.
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

= 1.0.1 =
Fixes activation failing with "Plugin file does not exist" on servers whose unzip implementation follows the ZIP specification strictly.
