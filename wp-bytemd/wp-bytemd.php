<?php
/**
 * Plugin Name:       ByteMD for WordPress
 * Plugin URI:        https://github.com/zhongdaiqi/wpbytemd
 * Description:       将字节跳动开源的 ByteMD Markdown 编辑器集成进 WordPress：经典编辑界面接管、区块编辑器区块、Markdown 存储与前端渲染、图片直传媒体库。
 * Version:           1.0.0
 * Requires at least: 6.5
 * Tested up to:      7.1
 * Requires PHP:      7.4
 * Author:            钟代麒
 * Author URI:        https://dingzhixia.com
 * License:           MIT
 * License URI:       https://opensource.org/licenses/MIT
 * Text Domain:       wp-bytemd
 * Domain Path:       /languages
 *
 * @package WP_ByteMD
 */

defined( 'ABSPATH' ) || exit;

define( 'WP_BYTEMD_VERSION', '1.0.1' );
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
