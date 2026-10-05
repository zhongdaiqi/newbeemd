<?php
/**
 * Asset registration + the config objects handed to JavaScript.
 *
 * @package WP_ByteMD
 */

defined( 'ABSPATH' ) || exit;

/**
 * Registers every script/style handle the plugin uses.
 */
class WP_ByteMD_Assets {

	const HANDLE_VENDOR_EDITOR = 'wp-bytemd-vendor-editor';
	const HANDLE_VENDOR_VIEWER = 'wp-bytemd-vendor-viewer';
	const HANDLE_ADMIN         = 'wp-bytemd-admin';
	const HANDLE_BLOCK         = 'wp-bytemd-block';
	const HANDLE_FRONTEND      = 'wp-bytemd-frontend';
	const HANDLE_CONTENT_CSS   = 'wp-bytemd-content';
	const HANDLE_KATEX_CSS     = 'wp-bytemd-katex';

	/** Text domain, which WordPress.org requires to equal the plugin slug. */
	const TEXTDOMAIN = 'newbee-markdown-editor';

	/**
	 * Constructor.
	 */
	public function __construct() {
		add_action( 'init', array( $this, 'register_assets' ), 5 );
	}

	/**
	 * Register all handles up-front so any module can enqueue them.
	 *
	 * @return void
	 */
	public function register_assets() {
		$url = WP_BYTEMD_URL . 'assets/';

		// --- ByteMD runtime (bundled, IIFE) ------------------------------.
		wp_register_script(
			self::HANDLE_VENDOR_EDITOR,
			$url . 'vendor/bytemd-editor.js',
			array(),
			self::asset_version( 'vendor/bytemd-editor.js' ),
			true
		);

		wp_register_script(
			self::HANDLE_VENDOR_VIEWER,
			$url . 'vendor/bytemd-viewer.js',
			array(),
			self::asset_version( 'vendor/bytemd-viewer.js' ),
			true
		);

		wp_register_style(
			self::HANDLE_VENDOR_EDITOR . '-css',
			$url . 'vendor/bytemd-editor.css',
			array(),
			self::asset_version( 'vendor/bytemd-editor.css' )
		);

		wp_register_style(
			self::HANDLE_VENDOR_VIEWER . '-css',
			$url . 'vendor/bytemd-viewer.css',
			array(),
			self::asset_version( 'vendor/bytemd-viewer.css' )
		);

		// --- Plugin glue -------------------------------------------------.
		wp_register_script(
			self::HANDLE_ADMIN,
			$url . 'js/bytemd-admin.js',
			array( self::HANDLE_VENDOR_EDITOR ),
			self::asset_version( 'js/bytemd-admin.js' ),
			true
		);

		wp_register_style(
			self::HANDLE_ADMIN . '-css',
			$url . 'css/bytemd-admin.css',
			array( self::HANDLE_VENDOR_EDITOR . '-css' ),
			self::asset_version( 'css/bytemd-admin.css' )
		);

		wp_register_script(
			self::HANDLE_BLOCK,
			$url . 'js/bytemd-block.js',
			array( 'wp-blocks', 'wp-element', 'wp-block-editor', 'wp-components', 'wp-i18n', self::HANDLE_VENDOR_EDITOR ),
			self::asset_version( 'js/bytemd-block.js' ),
			true
		);

		// The block script is the only one with translated strings; without this
		// call its `__()` lookups would never resolve.
		wp_set_script_translations( self::HANDLE_BLOCK, self::TEXTDOMAIN, WP_BYTEMD_DIR . 'languages' );

		wp_register_script(
			self::HANDLE_FRONTEND,
			$url . 'js/bytemd-frontend.js',
			array(),
			self::asset_version( 'js/bytemd-frontend.js' ),
			true
		);

		wp_register_style(
			self::HANDLE_CONTENT_CSS,
			$url . 'css/bytemd-content.css',
			array(),
			self::asset_version( 'css/bytemd-content.css' )
		);
	}

	/**
	 * Cache-busting version for a file inside `assets/`.
	 *
	 * @param string $relative Path relative to the assets directory.
	 * @return string
	 */
	public static function asset_version( $relative ) {
		$path = WP_BYTEMD_DIR . 'assets/' . ltrim( $relative, '/' );

		if ( file_exists( $path ) ) {
			return WP_BYTEMD_VERSION . '.' . filemtime( $path );
		}

		return WP_BYTEMD_VERSION;
	}

	/**
	 * Is the bundled ByteMD runtime present?
	 *
	 * @return bool
	 */
	public static function vendor_available() {
		return file_exists( WP_BYTEMD_DIR . 'assets/vendor/bytemd-editor.js' );
	}

	/**
	 * Locale slug understood by ByteMD.
	 *
	 * @return string
	 */
	public static function locale() {
		$locale = WP_ByteMD_Options::get( 'locale', 'auto' );

		if ( 'auto' === $locale || ! $locale ) {
			$wp_locale = function_exists( 'get_user_locale' ) ? get_user_locale() : get_locale();
			$locale    = ( 0 === strpos( $wp_locale, 'zh' ) ) ? 'zh_Hans' : 'en';
		}

		/**
		 * Filter the ByteMD locale.
		 *
		 * @param string $locale Locale slug (`zh_Hans` or `en`).
		 */
		return (string) apply_filters( 'wp_bytemd_locale', $locale );
	}

	/**
	 * Config object for the admin (classic screen) editor.
	 *
	 * @return array
	 */
	public static function admin_config() {
		$toggles = WP_ByteMD_Options::get( 'plugins', array() );
		$assets  = WP_ByteMD_Options::asset_urls();

		$allowed = array();
		foreach ( get_allowed_mime_types() as $ext => $mime ) {
			if ( 0 === strpos( $mime, 'image/' ) ) {
				$allowed[ $mime ] = $ext;
			}
		}

		return array(
			'bytemdVersion'  => WP_BYTEMD_BYTEMD_VERSION,
			'pluginVersion'  => WP_BYTEMD_VERSION,
			'editorMode'     => (string) WP_ByteMD_Options::get( 'editor_mode', 'split' ),
			'height'         => (int) WP_ByteMD_Options::get( 'editor_height', 640 ),
			'locale'         => self::locale(),
			'theme'          => (string) WP_ByteMD_Options::get( 'theme', 'auto' ),
			'plugins'        => array_map( 'boolval', (array) $toggles ),
			'mermaid'        => array(
				'enabled' => ! empty( $toggles['mermaid'] ) && WP_ByteMD_Options::vendor_asset_exists( 'bytemd-mermaid.js' ),
				'src'     => $assets['mermaid'],
				'theme'   => ( 'dark' === WP_ByteMD_Options::get( 'theme', 'auto' ) ) ? 'dark' : 'default',
			),
			'restEndpoint'   => esc_url_raw( rest_url( 'wp/v2/media' ) ),
			'restNonce'      => wp_create_nonce( 'wp_rest' ),
			'maxUploadSize'  => (int) wp_max_upload_size(),
			'mediaTitle'     => __( '从 ByteMD 上传', 'newbee-markdown-editor' ),
			'strings'        => array(
				'editorLabel'  => __( 'ByteMD Markdown 编辑器', 'newbee-markdown-editor' ),
				'chars'        => __( '字符', 'newbee-markdown-editor' ),
				'switchToWp'   => __( '切换到 WordPress 编辑器', 'newbee-markdown-editor' ),
				'switchToMd'   => __( '切换到 ByteMD Markdown 编辑器', 'newbee-markdown-editor' ),
				'uploadFailed' => __( '图片上传失败', 'newbee-markdown-editor' ),
				'tooLarge'     => __( '文件超过服务器上传上限', 'newbee-markdown-editor' ),
				'notImage'     => __( '只允许上传图片', 'newbee-markdown-editor' ),
				'emptyValue'   => __( '（空文档）', 'newbee-markdown-editor' ),
				'unsavedHint'  => __( '内容已同步到 WordPress 编辑器，可正常保存 / 预览 / 自动保存。', 'newbee-markdown-editor' ),
			),
		);
	}

	/**
	 * Config object for the front-end viewer script.
	 *
	 * @return array
	 */
	public static function frontend_config() {
		$toggles = WP_ByteMD_Options::get( 'plugins', array() );
		$assets  = WP_ByteMD_Options::asset_urls();

		return array(
			'renderMode' => (string) WP_ByteMD_Options::get( 'frontend_render', 'server' ),
			'plugins'    => array_map( 'boolval', (array) $toggles ),
			'highlight'  => array(
				'enabled' => (bool) WP_ByteMD_Options::is_on( 'frontend_highlight' ) && WP_ByteMD_Options::vendor_asset_exists( 'bytemd-hljs.js' ),
				'js'      => $assets['hljs_js'],
				'css'     => $assets['hljs_css'],
			),
			'math'       => array(
				'enabled' => (bool) WP_ByteMD_Options::is_on( 'frontend_math' ) && WP_ByteMD_Options::vendor_asset_exists( 'bytemd-katex.js' ),
				'css'     => $assets['katex_css'],
				'js'      => $assets['katex_js'],
			),
			'mermaid'    => array(
				'enabled' => (bool) WP_ByteMD_Options::is_on( 'frontend_mermaid' ) && WP_ByteMD_Options::vendor_asset_exists( 'bytemd-mermaid.js' ),
				'src'     => $assets['mermaid'],
				'theme'   => 'default',
			),
			'strings'    => array(
				'mermaidError' => __( '图表渲染失败', 'newbee-markdown-editor' ),
				'copy'         => __( '复制', 'newbee-markdown-editor' ),
				'copied'       => __( '已复制', 'newbee-markdown-editor' ),
				'copyFailed'   => __( '复制失败', 'newbee-markdown-editor' ),
				'copyAria'     => __( '复制代码', 'newbee-markdown-editor' ),
			),
		);
	}
}
