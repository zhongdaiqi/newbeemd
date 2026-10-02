=== ByteMD for WordPress ===
Contributors: zhongdaiqi
Tags: markdown, editor, bytemd, gfm, katex
Requires at least: 6.5
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 1.0.1
License: MIT
License URI: https://opensource.org/licenses/MIT

ByteMD（字节跳动开源的 Markdown 编辑器）集成插件：经典编辑界面接管、区块编辑器区块、Markdown 存储与前端渲染。

== Description ==

把 ByteMD 1.22.0 完整搬进 WordPress，运行时不依赖任何 CDN（KaTeX / Mermaid 等重型库按需从 CDN 加载）。

**两种集成方式**

1. **经典编辑界面接管** — 在内容类型对应的编辑页面上，用 ByteMD 替换 WordPress 默认编辑器。文本框仍在 DOM 中并实时同步，因此保存、预览、自动保存、修订版本、REST、WP-CLI 全部照常工作。作者可随时点“切换到 WordPress 编辑器”回到原生编辑器。
2. **区块编辑器区块** — 提供 `bytemd/editor` 区块（可见名“ByteMD Markdown”）。Markdown 存在区块属性里，前端由 PHP 渲染，是动态区块，不会把生成的 HTML 写进数据库。

**前端渲染**

Markdown 原文保存在 `post_content` 中，发布时按设置转成 HTML：

* 服务端渲染（默认，Parsedown + ParsedownExtra，利于 SEO，无需前端 JS）
* 浏览器渲染（ByteMD Viewer，与编辑器预览 100% 一致）
* 不渲染（按纯文本段落输出）

还支持 `[bytemd]…[/bytemd]` 短代码、摘要自动剥离 Markdown 标记、KaTeX 公式与 Mermaid 图表按需加载。

== Installation ==

1. 上传 `wp-bytemd` 目录到 `/wp-content/plugins/`。
2. 在“插件”页面启用。
3. 打开“设置 → ByteMD”，勾选需要启用的内容类型。
4. 若该内容类型仍在用区块编辑器，勾选“对上述内容类型禁用区块编辑器”，经典编辑界面即会出现 ByteMD。

发行包中已包含编译好的 `assets/vendor/` 资源，无需 Node 环境。若从源码安装，请先执行：

    cd wp-content/plugins/wp-bytemd/build
    npm install
    npm run build

== Frequently Asked Questions ==

= 需要安装 Classic Editor 插件吗？ =

不需要。本插件可以自行对指定内容类型关闭区块编辑器。

= WordPress 7.1 移除了 Classic 区块，会影响吗？ =

不影响。7.1 只是把 Classic 区块从区块插入器里移除；不使用区块编辑器的内容类型仍然走经典编辑界面，ByteMD 正是接管这个界面。

= 启用后已有文章会乱掉吗？ =

不会。只有被写入 `_wp_bytemd_markdown` 标记的文章才会按 Markdown 渲染。编辑界面上“按 Markdown 渲染本文”勾选框可逐个控制。

= 图片怎么上传？ =

在编辑器里拖拽、粘贴或点工具栏图片按钮，文件会通过 REST 接口直接进入 WordPress 媒体库。

== Changelog ==

= 1.0.1 =
* 修复：发行包 zip 的条目名使用了反斜杠作为路径分隔符，导致 WordPress 解压后生不出插件目录、启用时报「插件文件不存在」。
* 打包流程改为纯 Node 实现，不再依赖外部压缩工具；打包后回读压缩包逐条校验 CRC 与条目名。
* 新增 `THIRD-PARTY-NOTICES.md`（115 个第三方组件的许可声明）；补齐 Parsedown / ParsedownExtra 的 LICENSE 文件。
* `Plugin URI` 指向本插件仓库，并声明为非官方集成。
* 不再把构建中间产物（esbuild metafile）打进发行包，压缩包体积由约 1.5 MB 降至 0.98 MB。

= 1.0.0 =
* 首个版本：ByteMD 1.22.0、经典界面接管、区块、服务端/浏览器渲染、图片直传、KaTeX、Mermaid、短代码。
