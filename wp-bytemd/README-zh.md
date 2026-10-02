# Newbee Markdown Editor (ByteMD)

把 **ByteMD**（字节跳动开源的 Markdown 编辑器，最新版 **1.22.0**）集成到 **WordPress 7.1.2** 的完整插件。slug：`newbee-markdown-editor-bytemd`。

> 名称说明：ByteMD v2 已改名为 HashMD，因此 `bytemd` 这条线的最新版本就是 **1.22.0**（核心包与全部官方插件同版本号）。本插件锁定并打包 1.22.0。
>
> 名称说明：`Newbee` 是唯一的品牌前缀，用来满足 WordPress.org 的命名要求——新插件不得在名称或永久链接中使用受限词 `wp`，也不得用他人项目名（ByteMD）开头（指南第 17 条），因此 `ByteMD` 只能放在括号里。slug 由插件名自动生成，且必须与 text domain 一致。

- 插件目录：`wp-bytemd/`
- 安装包：`dist/wp-bytemd-<version>.zip`
- 依赖：PHP ≥ 7.4，WordPress ≥ 6.5（在 7.1.x 上开发与验证）

---

## 1. 为什么这样做架构

WordPress 7.1 的编辑体系有两个关键事实：

1. **Classic 区块被弃用**——7.1 起它不再出现在区块插入器里，后续版本 TinyMCE 会变成可选加载。
2. **经典编辑界面本身没有被移除**——不使用区块编辑器的内容类型（以及 Classic Editor 插件）依旧走经典编辑页面，页面上仍然有一个朴素的 `<textarea id="content">`。

所以插件用两条腿走路：

| 路径 | 适用场景 | 做法 |
| --- | --- | --- |
| **经典界面接管**（主路径） | 想完全用 Markdown 写作 | 把 ByteMD 挂到 `#content` 文本框上，文本框保留在 DOM 中并实时同步 |
| **`bytemd/editor` 区块** | 必须留在区块编辑器里 | 动态区块，Markdown 存在区块属性中，前端由 PHP 渲染 |

关键工程细节（这些是踩过坑的地方）：

- **必须先销毁 TinyMCE**。WordPress 在提交/自动保存前会调用 `tinymce.triggerSave()`，它会把 TinyMCE 里那份陈旧内容写回 textarea，直接覆盖 Markdown。插件在挂载前移除 `content` 上的实例，`triggerSave()` 就变成空操作。
- **textarea 是唯一事实来源**。每次 `change` 都同步回 textarea 并派发 `input`/`change` 事件，所以**保存、自动保存、预览、修订版本、REST、WP-CLI、其他插件全部无感兼容**。
- **不劫持保存流程**。“按 Markdown 渲染本文”是一个真实的 `wp_bytemd_markdown` 复选框，随表单正常 POST。
- **不误伤老文章**。只有写入 `_wp_bytemd_markdown` 元数据的文章才会按 Markdown 渲染；旧 HTML 文章编辑时该选项默认不勾选，不会被重新解析。
- **一张表单两个编辑器的退路**。工具栏上的「切换到 WordPress 编辑器」会带 `?bytemd=off` 重载，并在表单里插入隐藏的 `wp_bytemd_active=1` + `wp_bytemd_markdown=0`，从而正确清除标记。

---

## 2. 安装

### 方式 A：装发行包（推荐）

`dist/wp-bytemd-<version>.zip` 已包含编译好的 `assets/vendor/`，服务器上不需要 Node：

1. 后台「插件 → 安装插件 → 上传插件」，选择该 zip。
2. 启用。
3. 打开「设置 → ByteMD」，勾选要启用的内容类型。

### 方式 B：源码安装

```bash
cd wp-content/plugins/wp-bytemd/build
npm install          # 安装 bytemd 1.22.0 + 各官方插件 + esbuild
npm run build        # 产出 ../assets/vendor/*
node i18n.mjs        # 可选：重新生成 languages/wp-bytemd.pot
```

---

## 3. 设置项

**基本设置**

| 项 | 说明 |
| --- | --- |
| 启用的内容类型 | 只有勾选的类型才加载 ByteMD |
| 接管经典编辑界面 | 在经典编辑页用 ByteMD 替换默认编辑器 |
| 对上述内容类型禁用区块编辑器 | 通过 `use_block_editor_for_post_type` 让该类型走经典界面——这是让 ByteMD 完整取代编辑器的推荐做法 |
| 注册 `bytemd/editor` 区块 | 区块编辑器用户可选 |

**编辑器**

| 项 | 说明 |
| --- | --- |
| 显示模式 | `分屏` / `标签页` / `自动` |
| 编辑器高度 | 240–2000px，默认 640 |
| 配色 | 跟随后台配色 / 始终浅色 / 始终深色（自动检测后台亮度） |
| 界面语言 | 自动（跟随用户语言）/ `zh_Hans` / `en` |
| 编辑器插件 | GFM、代码高亮、KaTeX 公式、软换行、Emoji、图片缩放、Mermaid、Front matter |

**前端渲染**

| 项 | 说明 |
| --- | --- |
| 渲染方式 | 服务端（Parsedown，默认）/ 浏览器（ByteMD Viewer）/ 不渲染 |
| 正文配色 | 自动（跟随系统偏好）/ 浅色 / 深色 |
| 允许原始 HTML | 关闭时启用 Parsedown 安全模式，raw HTML 被转义（有 `unfiltered_html` 权限的用户始终允许） |
| 前端渲染数学公式 | 检出 `$…$` / `$$…$$` 才加载插件内置的 KaTeX |
| 前端渲染 Mermaid | 检出 ```mermaid 才加载插件内置的 Mermaid（约 3.3MB，只在该页面加载） |
| 启用 `[bytemd]` 短代码 | 任意文章里包裹 Markdown 片段 |
| 自动剥离摘要中的 Markdown | 列表/搜索页摘要不再出现 `##`、`[]()` |

**关于外部资源**：插件不提供 CDN 之类的设置项，因为它根本不会向第三方服务器发起请求。旧版本曾暴露「CDN 根地址 / KaTeX 版本 / Mermaid 版本」三个选项，1.1.0 起已移除——所有运行时资源都随插件分发，保存设置时这些历史值也会被清掉。

---

## 4. 打包体积

`npm run build` 后的实测结果（minified）：

| 文件 | 体积 | 说明 |
| --- | --- | --- |
| `assets/vendor/bytemd-editor.js` | **1160 KB** | 后台编辑器，仅在编辑页加载 |
| `assets/vendor/bytemd-editor.css` | 36 KB | |
| `assets/vendor/bytemd-viewer.js` | **878 KB** | 仅“浏览器渲染”模式的前端才加载 |
| `assets/vendor/bytemd-viewer.css` | 36 KB | |
| `assets/vendor/bytemd-katex.js` | 261 KB | 仅服务端渲染且页面含公式时加载 |
| `assets/vendor/bytemd-katex.css` | 21 KB | |
| `assets/vendor/bytemd-mermaid.js` | **3410 KB** | 仅页面含 ```mermaid 代码块时加载 |
| `assets/vendor/fonts/` | 254 KB / 20 个 | KaTeX 字体，只留 woff2 |

做过三处显著瘦身：

1. **highlight.js 只打包 37 种语言**。`@bytemd/plugin-highlight` 里写的是 `await import('highlight.js')`，esbuild 会把 190+ 种语法全部内联（约 1.1MB）。构建脚本用 esbuild 的 `onResolve` 把它重定向到 `build/src/hljs.js`——只注册常用语言并补好 `html→xml`、`sh→bash`、`js→javascript` 等别名。编辑器包从 1939KB 降到 1160KB。
2. **KaTeX 字体只留 woff2**。借助 esbuild 的 `onLoad` 在**读取 CSS 时**就把 `@font-face` 里的 woff/ttf 源删掉，旧格式文件因此根本不生成，省下 40 个文件、约 600KB。（早期做法是构建后再删，会触发沙箱的批量删除限制，而且删失败被 `catch` 吞掉后会**静默把旧字体打进发行包**。）
3. **Mermaid 独立成文件**。它的体积比其余所有产物加起来还大，所以不编进编辑器/查看器 bundle，而是单独产出 `bytemd-mermaid.js`，只在页面真的出现图表时才 `enqueue`。

> 为什么不再从 CDN 加载：WordPress.org 官方指南第 8 条明确要求「所有非服务相关的 JavaScript 和 CSS 必须在本地包含」，第 7 条也把「把脚本等资源卸载到第三方」列为禁止的追踪行为。要提交插件目录，这两条是硬门槛。

---

## 5. 代码结构

```
wp-bytemd/
├── wp-bytemd.php                  插件头、常量、引导
├── includes/
│   ├── class-wp-bytemd.php        单例、模块装配、激活/卸载
│   ├── class-wp-bytemd-options.php 选项读写、默认值、内置资源 URL 推导
│   ├── class-wp-bytemd-assets.php  资源注册、asset_version 缓存戳、JS 配置对象
│   ├── class-wp-bytemd-admin.php   经典界面接管、save_post 写标记、通知
│   ├── class-wp-bytemd-block.php   bytemd/editor 动态区块注册与渲染
│   ├── class-wp-bytemd-markdown.php Markdown 解析（服务端/浏览器）、摘要剥离
│   ├── class-wp-bytemd-frontend.php the_content/feed/excerpt 过滤、短代码
│   └── class-wp-bytemd-settings.php 设置页 + 运行状态面板
├── assets/
│   ├── js/bytemd-admin.js          经典界面接管
│   ├── js/bytemd-block.js          Gutenberg 区块（运行时按需注入）
│   ├── js/bytemd-frontend.js       前端 Viewer 挂载 + KaTeX/Mermaid 按需加载
│   ├── css/bytemd-admin.css        后台样式 + 深色适配
│   ├── css/bytemd-content.css      前端 Markdown 主题（支持 prefers-color-scheme）
│   └── vendor/                     ← npm run build 产出
├── build/                          esbuild 构建工程（发布包中不含 node_modules）
├── vendor/parsedown/               Parsedown + ParsedownExtra（MIT）
├── languages/wp-bytemd.pot         100 条可翻译字符串
└── uninstall.php
```

---

## 6. 发版流程

`build/release.mjs` 把整条发版链路串成一条命令：

```powershell
cd build
node release.mjs patch --notes "修复：xxx"        # patch / minor / major / 1.2.3
node release.mjs 1.0.2 --notes release-notes.md  # 说明也可以指向一个文件
```

它按顺序做五件事：

1. **预检** —— 工作区干净、tag 未被占用（本地与远程都查）、新版本严格大于当前版本、`readme.txt` 里还没有该版本的 changelog 条目。任何一条不过就在**动任何文件之前**中止。
2. **改版本** —— 同步 5 处声明：`build/package.json`、插件头 `Version:`、`WP_BYTEMD_VERSION` 常量、`readme.txt` 的 `Stable tag`、`build/src/editor.js`。漏改任意一处都会让后台显示的版本号与实际不符（`package.mjs` 打包前也会再断言一遍）。
3. **重建产物** —— 依次跑 `build.mjs` → `i18n.mjs` → `notices.mjs` → `lint-php.mjs` → `package.mjs`，任一步失败即停止，工作区留有改动可修正后重跑。
4. **提交并推送** —— 提交、打附注 tag、推分支与 tag。
5. **建 Release** —— 用 `git credential fill` 取已缓存的 GitHub 凭据调 API，建 Release 并上传 zip 附件，最后**把附件下载回来与本地 zip 逐字节比对**，不一致就报错。

常用参数：

| 参数 | 作用 |
| --- | --- |
| `--notes <文件\|文本>` | **必填**。版本说明脚本不替你写；纯文本行会自动转成 changelog 条目 |
| `--dry-run` | 打完包就停，不提交、不推送（版本号与 changelog 的改动会留在工作区，需自行 `git checkout -- .`） |
| `--no-release` | 提交、打 tag、推送，但不建 GitHub Release |
| `--yes` / `-y` | 跳过人工确认 |
| `--allow-dirty` | 容忍未提交改动（仅在特殊情况下用） |

> 凭据来自 Windows 凭据管理器里已缓存的 `git:https://github.com`。第一次用前先手动 `git push` 一次让凭据助手缓存令牌即可，无需在脚本里存 token。

---

## 7. 钩子

```php
// 加/减内容类型
add_filter( 'wp_bytemd_post_types', fn( $types ) => array_merge( $types, [ 'page' ] ) );

// 控制编辑器插件
add_filter( 'wp_bytemd_editor_plugins', function ( $plugins ) {
    return array_diff( $plugins, [ 'gemoji' ] );
} );

// 换渲染方式（可按文章条件判断）
add_filter( 'wp_bytemd_render_mode', fn( $mode, $md ) => 'client', 10, 2 );

// 处理服务端渲染结果
add_filter( 'wp_bytemd_rendered_html', fn( $html, $md ) => $html, 10, 2 );

// 逐篇控制是否按 Markdown 处理
add_filter( 'wp_bytemd_is_markdown_post', fn( $is, $post ) => $is, 10, 2 );

// 是否允许 Markdown 里的原始 HTML
add_filter( 'wp_bytemd_allow_raw_html', fn( $allow ) => true );

// 语言
add_filter( 'wp_bytemd_locale', fn( $locale ) => 'en' );
```

JS 侧：经典界面挂载完成后在 `document` 上派发 `wp-bytemd:ready`，`window.wpByteMDInstance` 暴露 `{ editor, textarea, state }`，可以直接 `editor.$set({ value })`。

---

## 8. 常见问题

**Q：启用了但经典界面没出现 ByteMD？**
A：该内容类型还在用区块编辑器。到「设置 → ByteMD」勾上「对上述内容类型禁用区块编辑器」，或装 Classic Editor 插件。

**Q：`assets/vendor/bytemd-editor.js` 不存在？**
A：源码安装没执行构建。设置页顶部的「运行状态」会直接标红提示，并在编辑页给出报错通知。

**Q：编辑器和前端长得不一样？**
A：默认走服务端渲染（Parsedown），和 ByteMD 预览的解析器不同，表格/公式这类细节会有差异。想要完全一致就把渲染方式改成「浏览器渲染」。

**Q：公式和图表不显示？**
A：先看设置页顶部的「运行状态」，确认 `bytemd-katex.js` / `bytemd-mermaid.js` 都显示「已就绪」；再看前端渲染那两组开关有没有被关掉。本插件不请求外部资源，内网 / 离线环境不需要任何额外配置。

**Q：能同时用在页面、自定义文章类型上吗？**
A：可以，设置页里勾选即可；也可以临时用 `wp_bytemd_post_types` 过滤器。

---

## 9. 许可

本插件代码以 **MIT** 协议发布，全文见仓库根目录 `LICENSE`。

打包进发行物的第三方组件及其完整许可证文本，见 **[THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)**（由 `node build/notices.mjs` 自动生成）。因为构建时设置了 esbuild 的 `legalComments: 'none'`，产物内部不含任何许可注释，这份文档即为承担声明义务的载体。

主要第三方组件：

| 组件 | 许可 |
| --- | --- |
| [ByteMD](https://github.com/bytedance/bytemd) 及其官方插件 | MIT |
| [Parsedown](https://github.com/erusev/parsedown) / [ParsedownExtra](https://github.com/erusev/parsedown-extra) | MIT |
| [KaTeX](https://katex.org/) | MIT |
| [Mermaid](https://mermaid.js.org/) | MIT |
| [CodeMirror](https://codemirror.net/)（经 `codemirror-ssr`） | MIT |
| [highlight.js](https://highlightjs.org/) | BSD-3-Clause |
| 其余传递依赖 | 均为 MIT |

组件总数与逐条版权署名以 `THIRD-PARTY-NOTICES.md` 为准：它由 `node build/notices.mjs` 读取 esbuild metafile 生成，只列出**真正进了产物**的包（esbuild 会 tree-shake，按 `package.json` 遍历会多算 26 个）。

**非官方声明**：本插件是第三方非官方集成，与字节跳动（ByteDance）及 ByteMD 项目官方无隶属或背书关系。“ByteMD”为其开源项目名称，此处仅用于说明所集成的编辑器组件。
