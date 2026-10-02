<?php
/**
 * Option handling + defaults.
 *
 * @package WP_ByteMD
 */

defined( 'ABSPATH' ) || exit;

/**
 * Reads / writes the single `wp_bytemd_options` array.
 */
class WP_ByteMD_Options {

	/**
	 * Option name.
	 */
	const OPTION = 'wp_bytemd_options';

	/**
	 * Post meta flag: "this post content is Markdown".
	 */
	const META_MARKDOWN = '_wp_bytemd_markdown';

	/**
	 * Cached options for the current request.
	 *
	 * @var array|null
	 */
	private static $cache = null;

	/**
	 * Editor plugin slug => label.
	 *
	 * @return array<string, string>
	 */
	public static function available_plugins() {
		return array(
			'gfm'         => __( 'GFM（表格 / 任务列表 / 删除线 / 自动链接）', 'newbee-markdown-editor-bytemd' ),
			'highlight'   => __( '代码高亮（highlight.js）', 'newbee-markdown-editor-bytemd' ),
			'math'        => __( '数学公式（KaTeX，$…$ 与 $$…$$）', 'newbee-markdown-editor-bytemd' ),
			'breaks'      => __( '回车换行（GitHub 风格软换行）', 'newbee-markdown-editor-bytemd' ),
			'gemoji'      => __( 'Emoji 短代码（:smile:）', 'newbee-markdown-editor-bytemd' ),
			'mediumZoom'  => __( '图片缩放（medium-zoom，点击放大）', 'newbee-markdown-editor-bytemd' ),
			'mermaid'     => __( 'Mermaid 图表（随插件打包，仅在含图表的页面加载）', 'newbee-markdown-editor-bytemd' ),
			'frontmatter' => __( 'Front matter（YAML 头部，仅解析不显示）', 'newbee-markdown-editor-bytemd' ),
		);
	}

	/**
	 * Default option values.
	 *
	 * @return array
	 */
	public static function defaults() {
		return array(
			// Which post types get the editor.
			'post_types'             => array( 'post' ),

			// Admin behaviour.
			'classic_takeover'       => 1,
			'force_classic'          => 0,
			'enable_block'           => 1,

			// Editor look & feel.
			'editor_mode'            => 'split',
			'editor_height'          => 640,
			'locale'                 => 'auto',
			'theme'                  => 'auto',

			// Editor plugins.
			'plugins'                => array(
				'gfm'         => 1,
				'highlight'   => 1,
				'math'        => 1,
				'breaks'      => 1,
				'gemoji'      => 1,
				'mediumZoom'  => 1,
				'mermaid'     => 0,
				'frontmatter' => 0,
			),

			// Front-end output.
			'frontend_render'        => 'server',
			'allow_raw_html'         => 0,
			'frontend_math'          => 1,
			'frontend_mermaid'       => 1,
			'frontend_theme'         => 'auto',
			'enable_shortcode'       => 1,
			'strip_markdown_excerpt' => 1,
		);
	}

	/**
	 * All options, merged with defaults.
	 *
	 * @return array
	 */
	public static function all() {
		if ( null === self::$cache ) {
			$stored = get_option( self::OPTION, array() );
			if ( ! is_array( $stored ) ) {
				$stored = array();
			}
			$options = array_merge( self::defaults(), $stored );

			$default_plugins = self::defaults()['plugins'];
			if ( ! is_array( $options['plugins'] ) ) {
				$options['plugins'] = $default_plugins;
			} else {
				$options['plugins'] = array_merge( $default_plugins, $options['plugins'] );
			}

			if ( ! is_array( $options['post_types'] ) ) {
				$options['post_types'] = array( 'post' );
			}

			self::$cache = $options;
		}

		return self::$cache;
	}

	/**
	 * Single option.
	 *
	 * @param string $key      Option key.
	 * @param mixed  $fallback Fallback when missing.
	 * @return mixed
	 */
	public static function get( $key, $fallback = null ) {
		$options = self::all();
		return array_key_exists( $key, $options ) ? $options[ $key ] : $fallback;
	}

	/**
	 * Boolean helper.
	 *
	 * @param string $key Option key.
	 * @return bool
	 */
	public static function is_on( $key ) {
		return (bool) self::get( $key, false );
	}

	/**
	 * Persist options (already sanitised) and reset the cache.
	 *
	 * @param array $values Values to merge in.
	 * @return void
	 */
	public static function update( array $values ) {
		$merged = array_merge( self::all(), $values );
		update_option( self::OPTION, $merged );
		self::$cache = null;
	}

	/**
	 * Post types the editor is enabled for.
	 *
	 * @return string[]
	 */
	public static function enabled_post_types() {
		$types = (array) self::get( 'post_types', array( 'post' ) );
		$types = array_values( array_filter( array_map( 'sanitize_key', $types ) ) );

		/**
		 * Filter the post types handled by ByteMD.
		 *
		 * @param string[] $types Post type slugs.
		 */
		$types = (array) apply_filters( 'wp_bytemd_post_types', $types );

		return array_values( array_unique( $types ) );
	}

	/**
	 * Is ByteMD enabled for a given post type?
	 *
	 * @param string $post_type Post type slug.
	 * @return bool
	 */
	public static function is_enabled_for( $post_type ) {
		if ( ! $post_type ) {
			return false;
		}
		return in_array( $post_type, self::enabled_post_types(), true );
	}

	/**
	 * Enabled editor plugin slugs.
	 *
	 * @return string[]
	 */
	public static function enabled_editor_plugins() {
		$plugins = (array) self::get( 'plugins', array() );
		$out     = array();

		foreach ( self::available_plugins() as $slug => $label ) {
			if ( ! empty( $plugins[ $slug ] ) ) {
				$out[] = $slug;
			}
		}

		/**
		 * Filter which ByteMD plugins are activated.
		 *
		 * @param string[] $out Plugin slugs.
		 */
		return (array) apply_filters( 'wp_bytemd_editor_plugins', $out );
	}

	/**
	 * URLs of the runtime assets that are loaded on demand.
	 *
	 * Everything is served from the plugin itself. WordPress.org guideline 8
	 * requires that all non-service related JavaScript and CSS be bundled
	 * locally, so there is deliberately no CDN fallback here.
	 *
	 * @return array<string, string>
	 */
	public static function asset_urls() {
		return array(
			'mermaid'   => self::vendor_url( 'bytemd-mermaid.js' ),
			'katex_js'  => self::vendor_url( 'bytemd-katex.js' ),
			'katex_css' => self::vendor_url( 'bytemd-katex.css' ),
		);
	}

	/**
	 * Build a cache-busted URL for a file in `assets/vendor/`.
	 *
	 * @param string $file File name.
	 * @return string
	 */
	private static function vendor_url( $file ) {
		$path = WP_BYTEMD_DIR . 'assets/vendor/' . $file;
		$url  = WP_BYTEMD_URL . 'assets/vendor/' . $file;

		if ( file_exists( $path ) ) {
			$url = add_query_arg( 'ver', WP_BYTEMD_VERSION . '.' . filemtime( $path ), $url );
		}

		return $url;
	}

	/**
	 * Is a bundled runtime asset present on disk?
	 *
	 * @param string $file File name inside `assets/vendor/`.
	 * @return bool
	 */
	public static function vendor_asset_exists( $file ) {
		return file_exists( WP_BYTEMD_DIR . 'assets/vendor/' . $file );
	}

	/**
	 * Keep the markdown meta key warm (used by WP_Query meta queries).
	 *
	 * @return void
	 */
	public static function ensure_markdown_meta_key() {
		// Nothing to do for a meta key without registered meta — kept as a
		// hook point in case the plugin later needs to prime a cache.
		do_action( 'wp_bytemd_markdown_meta_ready', self::META_MARKDOWN );
	}
}
