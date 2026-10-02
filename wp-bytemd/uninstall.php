<?php
/**
 * Uninstall routine: remove options and the Markdown post meta flag.
 *
 * Note that the post *content* itself (the Markdown source) is never touched —
 * uninstalling ByteMD leaves every article readable, it just stops being
 * parsed as Markdown.
 *
 * @package WP_ByteMD
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

delete_option( 'wp_bytemd_options' );
delete_transient( 'wp_bytemd_asset_check' );

// Remove the per-post Markdown flag from every post type.
$wp_bytemd_post_types = get_post_types( array(), 'names' );

foreach ( $wp_bytemd_post_types as $wp_bytemd_type ) {
	$wp_bytemd_ids = get_posts(
		array(
			'post_type'      => $wp_bytemd_type,
			'post_status'    => 'any',
			'posts_per_page' => -1,
			'fields'         => 'ids',
			'meta_key'       => '_wp_bytemd_markdown', // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key
			'no_found_rows'  => true,
		)
	);

	foreach ( $wp_bytemd_ids as $wp_bytemd_id ) {
		delete_post_meta( $wp_bytemd_id, '_wp_bytemd_markdown' );
	}
}

// Site options in multisite installs.
if ( is_multisite() ) {
	$wp_bytemd_sites = get_sites( array( 'fields' => 'ids' ) );

	foreach ( $wp_bytemd_sites as $wp_bytemd_site_id ) {
		switch_to_blog( $wp_bytemd_site_id );
		delete_option( 'wp_bytemd_options' );
		delete_transient( 'wp_bytemd_asset_check' );
		restore_current_blog();
	}
}
