<?php
/**
 * Plugin bootstrap: wires every sub-module together.
 *
 * @package WP_ByteMD
 */

defined( 'ABSPATH' ) || exit;

/**
 * Main plugin class (singleton).
 */
final class WP_ByteMD {

	/**
	 * Singleton instance.
	 *
	 * @var WP_ByteMD|null
	 */
	private static $instance = null;

	/**
	 * Sub-modules.
	 *
	 * @var array<string, object>
	 */
	private $modules = array();

	/**
	 * Get the singleton.
	 *
	 * @return WP_ByteMD
	 */
	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Constructor: register hooks.
	 */
	private function __construct() {
		add_action( 'init', array( $this, 'load_textdomain' ), 1 );
		add_action( 'init', array( $this, 'init_modules' ), 5 );

		$this->modules['assets']   = new WP_ByteMD_Assets();
		$this->modules['admin']    = new WP_ByteMD_Admin();
		$this->modules['block']    = new WP_ByteMD_Block();
		$this->modules['frontend'] = new WP_ByteMD_Frontend();

		if ( is_admin() ) {
			$this->modules['settings'] = new WP_ByteMD_Settings();
		}

		add_filter( 'plugin_action_links_' . WP_BYTEMD_BASENAME, array( $this, 'action_links' ) );
	}

	/**
	 * Access a sub-module.
	 *
	 * @param string $name Module name.
	 * @return object|null
	 */
	public function module( $name ) {
		return isset( $this->modules[ $name ] ) ? $this->modules[ $name ] : null;
	}

	/**
	 * Load translations.
	 *
	 * @return void
	 */
	public function load_textdomain() {
		load_plugin_textdomain( 'newbee-markdown-editor-bytemd', false, dirname( WP_BYTEMD_BASENAME ) . '/languages' );
	}

	/**
	 * Modules that hook very early (the post-type editor filter must be in
	 * place long before the admin screen decides which editor to render).
	 *
	 * @return void
	 */
	public function init_modules() {
		$this->modules['admin']->register_filters();
	}

	/**
	 * Activation: seed default options.
	 *
	 * @return void
	 */
	public static function activate() {
		$existing = get_option( WP_ByteMD_Options::OPTION );

		if ( ! is_array( $existing ) ) {
			add_option( WP_ByteMD_Options::OPTION, WP_ByteMD_Options::defaults() );
		} else {
			update_option( WP_ByteMD_Options::OPTION, array_merge( WP_ByteMD_Options::defaults(), $existing ) );
		}

		WP_ByteMD_Options::ensure_markdown_meta_key();
	}

	/**
	 * Deactivation: nothing destructive, only a transient cleanup.
	 *
	 * @return void
	 */
	public static function deactivate() {
		delete_transient( 'wp_bytemd_asset_check' );
	}

	/**
	 * "设置" link on the plugins screen.
	 *
	 * @param array $links Existing links.
	 * @return array
	 */
	public function action_links( $links ) {
		$url = admin_url( 'options-general.php?page=wp-bytemd' );
		array_unshift(
			$links,
			sprintf( '<a href="%s">%s</a>', esc_url( $url ), esc_html__( '设置', 'newbee-markdown-editor-bytemd' ) )
		);
		return $links;
	}
}
