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
		$cdn     = WP_ByteMD_Options::cdn_urls();

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
				'enabled' => ! empty( $toggles['mermaid'] ),
				'src'     => $cdn['mermaid'],
				'theme'   => ( 'dark' === WP_ByteMD_Options::get( 'theme', 'auto' ) ) ? 'dark' : 'default',
			),
			'restEndpoint'   => esc_url_raw( rest_url( 'wp/v2/media' ) ),
			'restNonce'      => wp_create_nonce( 'wp_rest' ),
			'maxUploadSize'  => (int) wp_max_upload_size(),
			'mediaTitle'     => __( '从 ByteMD 上传', 'wp-bytemd' ),
			'strings'        => array(
				'editorLabel'  => __( 'ByteMD Markdown 编辑器', 'wp-bytemd' ),
				'chars'        => __( '字符', 'wp-bytemd' ),
				'switchToWp'   => __( '切换到 WordPress 编辑器', 'wp-bytemd' ),
				'switchToMd'   => __( '切换到 ByteMD Markdown 编辑器', 'wp-bytemd' ),
				'uploadFailed' => __( '图片上传失败', 'wp-bytemd' ),
				'tooLarge'     => __( '文件超过服务器上传上限', 'wp-bytemd' ),
				'notImage'     => __( '只允许上传图片', 'wp-bytemd' ),
				'emptyValue'   => __( '（空文档）', 'wp-bytemd' ),
				'unsavedHint'  => __( '内容已同步到 WordPress 编辑器，可正常保存 / 预览 / 自动保存。', 'wp-bytemd' ),
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
		$cdn     = WP_ByteMD_Options::cdn_urls();

		return array(
			'renderMode' => (string) WP_ByteMD_Options::get( 'frontend_render', 'server' ),
			'plugins'    => array_map( 'boolval', (array) $toggles ),
			'math'       => array(
				'enabled' => (bool) WP_ByteMD_Options::is_on( 'frontend_math' ),
				'css'     => $cdn['katex_css'],
				'js'      => $cdn['katex_js'],
				'render'  => $cdn['katex_re'],
			),
			'mermaid'    => array(
				'enabled' => (bool) WP_ByteMD_Options::is_on( 'frontend_mermaid' ),
				'src'     => $cdn['mermaid'],
				'theme'   => 'default',
			),
			'strings'    => array(
				'mermaidError' => __( '图表渲染失败', 'wp-bytemd' ),
			),
		);
	}

	/**
	 * Print a tiny inline global so the front-end script knows its config even
	 * when nothing else has been localised yet.
	 *
	 * @param string $object_name Global variable name.
	 * @param array  $config      Config array.
	 * @return void
	 */
	public static function print_config( $object_name, array $config ) {
		printf(
			"<script id=\"%s\">window.%s=%s;</script>\n",
			esc_attr( $object_name . '-config' ),
			esc_js( $object_name ),
			wp_json_encode( $config )
		);
	}
}
