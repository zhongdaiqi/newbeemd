<?php
/**
 * Plugin Name:       Newbee Markdown Editor (ByteMD)
 * Plugin URI:        https://github.com/zhongdaiqi/wpbytemd
 * Description:       Markdown editing for WordPress powered by ByteMD. Split-pane editor with GFM, code highlighting, KaTeX and Mermaid, plus server- or client-side rendering of the stored Markdown.
 * Version:           1.2.0
 * Requires at least: 6.5
 * Requires PHP:      7.4
 * Author:            钟代麒
 * Author URI:        https://github.com/zhongdaiqi
 * License:           MIT
 * License URI:       https://opensource.org/licenses/MIT
 * Text Domain:       newbee-markdown-editor-bytemd
 * Domain Path:       /languages
 *
 * @package WP_ByteMD
 */

defined( 'ABSPATH' ) || exit;

define( 'WP_BYTEMD_VERSION', '1.2.0' );
define( 'WP_BYTEMD_BYTEMD_VERSION', '1.22.0' );
define( 'WP_BYTEMD_FILE', __FILE__ );
define( 'WP_BYTEMD_DIR', plugin_dir_path( __FILE__ ) );
define( 'WP_BYTEMD_URL', plugin_dir_url( __FILE__ ) );
define( 'WP_BYTEMD_BASENAME', plugin_basename( __FILE__ ) );

require_once WP_BYTEMD_DIR . 'includes/class-wp-bytemd-options.php';
require_once WP_BYTEMD_DIR . 'includes/class-wp-bytemd-markdown.php';
require_once WP_BYTEMD_DIR . 'includes/class-wp-bytemd-assets.php';
require_once WP_BYTEMD_DIR . 'includes/class-wp-bytemd-admin.php';
require_once WP_BYTEMD_DIR . 'includes/class-wp-bytemd-block.php';
require_once WP_BYTEMD_DIR . 'includes/class-wp-bytemd-frontend.php';
require_once WP_BYTEMD_DIR . 'includes/class-wp-bytemd-settings.php';
require_once WP_BYTEMD_DIR . 'includes/class-wp-bytemd.php';

register_activation_hook( __FILE__, array( 'WP_ByteMD', 'activate' ) );
register_deactivation_hook( __FILE__, array( 'WP_ByteMD', 'deactivate' ) );

/**
 * Boot the plugin.
 *
 * @return WP_ByteMD
 */
function wp_bytemd() {
	return WP_ByteMD::instance();
}

wp_bytemd();
