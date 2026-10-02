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
			'gfm'         => __( 'GFM（表格 / 任务列表 / 删除线 / 自动链接）', 'wp-bytemd' ),
			'highlight'   => __( '代码高亮（highlight.js）', 'wp-bytemd' ),
			'math'        => __( '数学公式（KaTeX，$…$ 与 $$…$$）', 'wp-bytemd' ),
			'breaks'      => __( '回车换行（GitHub 风格软换行）', 'wp-bytemd' ),
			'gemoji'      => __( 'Emoji 短代码（:smile:）', 'wp-bytemd' ),
			'mediumZoom'  => __( '图片缩放（medium-zoom，点击放大）', 'wp-bytemd' ),
			'mermaid'     => __( 'Mermaid 图表（按需从 CDN 加载，不打包）', 'wp-bytemd' ),
			'frontmatter' => __( 'Front matter（YAML 头部，仅解析不显示）', 'wp-bytemd' ),
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

			// Assets.
			'cdn_base'               => 'https://cdn.jsdelivr.net/npm',
			'mermaid_version'        => '11',
			'katex_version'          => '0.16.25',
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
	 * KaTeX / Mermaid / auto-render URLs derived from the configured CDN.
	 *
	 * @return array<string, string>
	 */
	public static function cdn_urls() {
		$base  = untrailingslashit( (string) self::get( 'cdn_base', 'https://cdn.jsdelivr.net/npm' ) );
		$base  = '' === $base ? 'https://cdn.jsdelivr.net/npm' : $base;
		$merm  = (string) self::get( 'mermaid_version', '11' );
		$katex = (string) self::get( 'katex_version', '0.16.25' );

		return array(
			'mermaid'  => $base . '/mermaid@' . $merm . '/dist/mermaid.esm.min.mjs',
			'katex_js' => $base . '/katex@' . $katex . '/dist/katex.min.js',
			'katex_re' => $base . '/katex@' . $katex . '/dist/contrib/auto-render.min.js',
			'katex_css' => $base . '/katex@' . $katex . '/dist/katex.min.css',
		);
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
