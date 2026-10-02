<?php
/**
 * Admin integration: classic editor screen takeover.
 *
 * WordPress ≤ 7.0 shipped a "classic" edit screen behind
 * `use_block_editor_for_post_type`; WordPress 7.1 keeps it for post types that
 * don't use the block editor (and for the Classic Editor plugin). That screen
 * still exposes a plain `<textarea id="content">`, which is exactly the anchor
 * ByteMD needs.
 *
 * @package WP_ByteMD
 */

defined( 'ABSPATH' ) || exit;

/**
 * Replaces the WordPress content editor with ByteMD on classic screens.
 */
class WP_ByteMD_Admin {

	/**
	 * Constructor.
	 */
	public function __construct() {
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue' ) );
		add_action( 'admin_notices', array( $this, 'maybe_print_notices' ) );
		add_filter( 'admin_body_class', array( $this, 'body_class' ) );
		add_action( 'save_post', array( $this, 'save_markdown_flag' ), 10, 2 );
	}

	/**
	 * Filters that must be registered long before the edit screen renders.
	 *
	 * @return void
	 */
	public function register_filters() {
		add_filter( 'use_block_editor_for_post_type', array( $this, 'filter_use_block_editor' ), 20, 2 );
		add_action( 'edit_form_after_title', array( $this, 'print_form_markers' ) );
	}

	/**
	 * Optionally force the classic screen for the configured post types.
	 *
	 * @param bool   $use       Whether the block editor should be used.
	 * @param string $post_type Post type slug.
	 * @return bool
	 */
	public function filter_use_block_editor( $use, $post_type ) {
		if ( ! WP_ByteMD_Options::is_on( 'force_classic' ) ) {
			return $use;
		}

		if ( WP_ByteMD_Options::is_enabled_for( $post_type ) && WP_ByteMD_Options::is_on( 'classic_takeover' ) ) {
			return false;
		}

		return $use;
	}

	/**
	 * Current post type on the edit screen.
	 *
	 * @return string
	 */
	public function current_post_type() {
		global $post_type, $pagenow;

		if ( 'post-new.php' === $pagenow ) {
			// phpcs:ignore WordPress.Security.NonceVerification.Recommended
			if ( isset( $_GET['post_type'] ) ) {
				// phpcs:ignore WordPress.Security.NonceVerification.Recommended
				return sanitize_key( wp_unslash( $_GET['post_type'] ) );
			}
			return $post_type ? $post_type : 'post';
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$post_id = isset( $_GET['post'] ) ? absint( $_GET['post'] ) : 0;
		if ( $post_id ) {
			$post = get_post( $post_id );
			if ( $post ) {
				return $post->post_type;
			}
		}

		return $post_type ? $post_type : '';
	}

	/**
	 * Does this post type use the block editor right now?
	 *
	 * @param string $post_type Post type slug.
	 * @return bool
	 */
	public function uses_block_editor( $post_type ) {
		if ( ! function_exists( 'use_block_editor_for_post_type' ) ) {
			return false;
		}
		return (bool) use_block_editor_for_post_type( $post_type );
	}

	/**
	 * Has the user temporarily switched back to the WordPress editor?
	 *
	 * @return bool
	 */
	public function is_takeover_disabled() {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$flag = isset( $_GET['bytemd'] ) ? sanitize_key( wp_unslash( $_GET['bytemd'] ) ) : '';
		return ( 'off' === $flag );
	}

	/**
	 * Is the current request a classic edit screen managed by ByteMD?
	 *
	 * @return bool
	 */
	public function is_bytemd_screen() {
		global $pagenow;

		if ( ! in_array( $pagenow, array( 'post.php', 'post-new.php' ), true ) ) {
			return false;
		}

		$post_type = $this->current_post_type();

		if ( ! WP_ByteMD_Options::is_enabled_for( $post_type ) ) {
			return false;
		}

		if ( $this->uses_block_editor( $post_type ) ) {
			return false;
		}

		if ( ! WP_ByteMD_Options::is_on( 'classic_takeover' ) || $this->is_takeover_disabled() ) {
			return false;
		}

		return true;
	}

	/**
	 * Enqueue the editor on classic screens.
	 *
	 * @param string $hook Current admin page hook.
	 * @return void
	 */
	public function enqueue( $hook ) {
		global $pagenow;

		if ( ! in_array( $hook, array( 'post.php', 'post-new.php' ), true ) ) {
			return;
		}

		$post_type = $this->current_post_type();

		if ( ! WP_ByteMD_Options::is_enabled_for( $post_type ) ) {
			return;
		}

		if ( $this->uses_block_editor( $post_type ) ) {
			$this->localize_block_editor_config();
			return;
		}

		if ( ! $this->is_bytemd_screen() ) {
			return;
		}

		if ( ! WP_ByteMD_Assets::vendor_available() ) {
			return;
		}

		wp_enqueue_style( WP_ByteMD_Assets::HANDLE_ADMIN . '-css' );
		wp_enqueue_script( WP_ByteMD_Assets::HANDLE_ADMIN );

		$config                   = WP_ByteMD_Assets::admin_config();
		$config['markdownDefault'] = $this->default_markdown_flag( $post_type );

		wp_localize_script( WP_ByteMD_Assets::HANDLE_ADMIN, 'wpByteMD', $config );
	}

	/**
	 * Should the "render as Markdown" checkbox start checked?
	 *
	 * New posts: yes (the author is about to write Markdown).
	 * Existing posts: only when they were already flagged — this keeps legacy
	 * HTML articles from being re-interpreted as Markdown by accident.
	 *
	 * @param string $post_type Post type slug.
	 * @return bool
	 */
	public function default_markdown_flag( $post_type ) {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$post_id = isset( $_GET['post'] ) ? absint( $_GET['post'] ) : 0;

		if ( ! $post_id ) {
			return true;
		}

		$flag = get_post_meta( $post_id, WP_ByteMD_Options::META_MARKDOWN, true );

		return ( '' === $flag ) ? true : (bool) $flag;
	}

	/**
	 * Hand the block editor script its runtime URLs (lazy-loaded on demand).
	 *
	 * @return void
	 */
	private function localize_block_editor_config() {
		if ( ! WP_ByteMD_Options::is_on( 'enable_block' ) ) {
			return;
		}

		$config = WP_ByteMD_Assets::admin_config();

		$config['runtime'] = array(
			'script' => WP_BYTEMD_URL . 'assets/vendor/bytemd-editor.js',
			'style'  => WP_BYTEMD_URL . 'assets/vendor/bytemd-editor.css',
			'version' => WP_ByteMD_Assets::asset_version( 'vendor/bytemd-editor.js' ),
		);

		wp_localize_script( WP_ByteMD_Assets::HANDLE_BLOCK, 'wpByteMDBlock', $config );
	}

	/**
	 * Print the form markers that let `save_post` know who was in control.
	 *
	 * @param WP_Post $post Post being edited.
	 * @return void
	 */
	public function print_form_markers( $post ) {
		if ( ! WP_ByteMD_Options::is_enabled_for( $post->post_type ) ) {
			return;
		}

		if ( $this->uses_block_editor( $post->post_type ) ) {
			return;
		}

		if ( WP_ByteMD_Options::is_on( 'classic_takeover' ) && ! $this->is_takeover_disabled() ) {
			// The JS layer injects these itself (it renders inside the form);
			// nothing to print here.
			return;
		}

		// ByteMD was switched off for this screen: remember that the author
		// chose the WordPress editor, so the Markdown flag must be cleared.
		printf(
			'<input type="hidden" name="wp_bytemd_active" value="1" /><input type="hidden" name="wp_bytemd_markdown" value="0" />'
		);
	}

	/**
	 * Persist the "this post is Markdown" flag.
	 *
	 * @param int     $post_id Post ID.
	 * @param WP_Post $post    Post object.
	 * @return void
	 */
	public function save_markdown_flag( $post_id, $post ) {
		if ( wp_is_post_revision( $post_id ) || wp_is_post_autosave( $post_id ) ) {
			return;
		}

		if ( ! $post instanceof WP_Post || ! WP_ByteMD_Options::is_enabled_for( $post->post_type ) ) {
			return;
		}

		if ( ! current_user_can( 'edit_post', $post_id ) ) {
			return;
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- verified below.
		if ( ! isset( $_POST['wp_bytemd_active'] ) ) {
			// Not a save coming from a ByteMD-managed screen (Quick Edit, REST,
			// XML-RPC…): leave the flag alone.
			return;
		}

		// Anything claiming to come from a ByteMD screen must carry a valid
		// post nonce. `wp_verify_nonce` is pluggable, so the value is sanitised
		// before it is handed over.
		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- verified here.
		$nonce = isset( $_POST['_wpnonce'] ) ? sanitize_text_field( wp_unslash( $_POST['_wpnonce'] ) ) : '';

		if ( ! wp_verify_nonce( $nonce, 'update-post_' . $post_id ) ) {
			return;
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Missing
		$is_markdown = isset( $_POST['wp_bytemd_markdown'] ) && '0' !== (string) wp_unslash( $_POST['wp_bytemd_markdown'] );

		if ( $is_markdown ) {
			update_post_meta( $post_id, WP_ByteMD_Options::META_MARKDOWN, 1 );
		} else {
			delete_post_meta( $post_id, WP_ByteMD_Options::META_MARKDOWN );
		}

		/**
		 * Fires after the ByteMD markdown flag has been stored.
		 *
		 * @param int  $post_id     Post ID.
		 * @param bool $is_markdown Whether the post is Markdown.
		 */
		do_action( 'wp_bytemd_markdown_flag_saved', $post_id, $is_markdown );
	}

	/**
	 * Add a body class so the CSS can target the ByteMD screen only.
	 *
	 * @param string $classes Existing classes.
	 * @return string
	 */
	public function body_class( $classes ) {
		if ( $this->is_bytemd_screen() ) {
			$classes .= ' wp-bytemd-active ';
		}
		return $classes;
	}

	/**
	 * Admin notices: missing bundle, or "switched back to WP editor" hint.
	 *
	 * @return void
	 */
	public function maybe_print_notices() {
		global $pagenow;

		if ( ! in_array( $pagenow, array( 'post.php', 'post-new.php' ), true ) ) {
			return;
		}

		$post_type = $this->current_post_type();

		if ( ! WP_ByteMD_Options::is_enabled_for( $post_type ) ) {
			return;
		}

		if ( $this->uses_block_editor( $post_type ) ) {
			return;
		}

		if ( WP_ByteMD_Options::is_on( 'classic_takeover' ) && ! WP_ByteMD_Assets::vendor_available() ) {
			printf(
				'<div class="notice notice-error"><p><strong>ByteMD：</strong>%s</p><p><code>cd %s && npm install && npm run build</code></p></div>',
				esc_html__( '未找到打包好的 ByteMD 运行时资源（assets/vendor/bytemd-editor.js）。请在插件目录执行构建，或从发行包中重新安装。', 'wp-bytemd' ),
				esc_html( 'wp-content/plugins/' . dirname( WP_BYTEMD_BASENAME ) . '/build' )
			);
			return;
		}

		if ( $this->is_takeover_disabled() ) {
			$url = remove_query_arg( 'bytemd' );
			printf(
				'<div class="notice notice-info is-dismissible"><p>%s <a href="%s" class="button button-small">%s</a></p></div>',
				esc_html__( '当前使用 WordPress 原生编辑器（ByteMD 已在本次编辑中关闭）。', 'wp-bytemd' ),
				esc_url( $url ),
				esc_html__( '重新启用 ByteMD', 'wp-bytemd' )
			);
		}
	}
}
