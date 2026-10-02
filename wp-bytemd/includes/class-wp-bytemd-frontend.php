<?php
/**
 * Front-end output: rendering Markdown posts, excerpts, feeds and the
 * `[bytemd]` shortcode.
 *
 * @package WP_ByteMD
 */

defined( 'ABSPATH' ) || exit;

/**
 * Front-end integration.
 */
class WP_ByteMD_Frontend {

	/**
	 * Constructor.
	 */
	public function __construct() {
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue' ) );
		add_filter( 'the_content', array( $this, 'filter_the_content' ), 9 );
		add_filter( 'the_content_feed', array( $this, 'filter_the_content' ), 9 );
		add_filter( 'get_the_excerpt', array( $this, 'filter_excerpt' ), 9, 2 );
		add_action( 'wp_footer', array( $this, 'late_styles' ), 1 );

		if ( WP_ByteMD_Options::is_on( 'enable_shortcode' ) ) {
			add_shortcode( 'bytemd', array( $this, 'shortcode' ) );
		}
	}

	/**
	 * Pre-enqueue assets for the common case (a single Markdown post).
	 *
	 * @return void
	 */
	public function enqueue() {
		if ( 'none' === WP_ByteMD_Options::get( 'frontend_render', 'server' ) ) {
			return;
		}

		$post = is_singular() ? get_queried_object() : null;

		if ( ! ( $post instanceof WP_Post ) ) {
			return;
		}

		$is_markdown = WP_ByteMD_Markdown::is_markdown_post( $post );
		$has_block   = function_exists( 'has_block' ) && has_block( WP_ByteMD_Block::BLOCK, $post );

		if ( ! $is_markdown && ! $has_block ) {
			return;
		}

		wp_enqueue_style( WP_ByteMD_Assets::HANDLE_CONTENT_CSS );

		if ( 'client' === WP_ByteMD_Options::get( 'frontend_render', 'server' ) ) {
			WP_ByteMD_Markdown::$needs_client_assets = true;
			wp_enqueue_style( WP_ByteMD_Assets::HANDLE_VENDOR_VIEWER . '-css' );
			wp_enqueue_script( WP_ByteMD_Assets::HANDLE_VENDOR_VIEWER );
		}

		if ( $this->needs_runtime_scripts( $post ) ) {
			wp_enqueue_script( WP_ByteMD_Assets::HANDLE_FRONTEND );
			wp_localize_script(
				WP_ByteMD_Assets::HANDLE_FRONTEND,
				'wpByteMDViewer',
				WP_ByteMD_Assets::frontend_config()
			);
		}
	}

	/**
	 * Does this post need the KaTeX / Mermaid runtime?
	 *
	 * @param WP_Post $post Post.
	 * @return bool
	 */
	private function needs_runtime_scripts( $post ) {
		$content = (string) $post->post_content;

		if ( WP_ByteMD_Options::is_on( 'frontend_mermaid' ) && false !== strpos( $content, '```mermaid' ) ) {
			return true;
		}

		if ( WP_ByteMD_Options::is_on( 'frontend_math' ) && preg_match( '/\$\$?[^\s$]/', $content ) ) {
			return true;
		}

		return ( 'client' === WP_ByteMD_Options::get( 'frontend_render', 'server' ) );
	}

	/**
	 * Render Markdown post content.
	 *
	 * @param string $content Post content.
	 * @return string
	 */
	public function filter_the_content( $content ) {
		if ( '' === trim( (string) $content ) ) {
			return $content;
		}

		// Already rendered (theme called the filter twice, or the content came
		// from a template that pre-rendered it).
		if ( false !== strpos( $content, 'wp-bytemd-content' ) || false !== strpos( $content, 'data-bytemd-viewer' ) ) {
			return $content;
		}

		$post = get_post();

		if ( ! $post instanceof WP_Post ) {
			return $content;
		}

		// Dynamic blocks render themselves through their own callback.
		if ( function_exists( 'has_block' ) && has_block( WP_ByteMD_Block::BLOCK, $post ) ) {
			return $content;
		}

		if ( ! WP_ByteMD_Markdown::is_markdown_post( $post ) ) {
			return $content;
		}

		if ( ! is_singular() && ! is_feed() && ! $this->is_rest_request() ) {
			// Archives / search: keep the raw Markdown out of the loop.
			return WP_ByteMD_Markdown::render( $content, array( 'mode' => 'server' ) );
		}

		return WP_ByteMD_Markdown::render( $content, array( 'post' => $post ) );
	}

	/**
	 * Is this a REST request?
	 *
	 * @return bool
	 */
	private function is_rest_request() {
		return ( defined( 'REST_REQUEST' ) && REST_REQUEST );
	}

	/**
	 * Strip Markdown syntax from excerpt output.
	 *
	 * @param string  $excerpt Excerpt.
	 * @param WP_Post $post    Post.
	 * @return string
	 */
	public function filter_excerpt( $excerpt, $post = null ) {
		if ( ! WP_ByteMD_Options::is_on( 'strip_markdown_excerpt' ) ) {
			return $excerpt;
		}

		if ( ! WP_ByteMD_Markdown::is_markdown_post( $post ) ) {
			return $excerpt;
		}

		$plain = WP_ByteMD_Markdown::to_plain( (string) $post->post_content );

		if ( '' === $plain ) {
			return $excerpt;
		}

		$length = (int) apply_filters( 'excerpt_length', 55 );

		return wp_trim_words( $plain, $length, '…' );
	}

	/**
	 * `[bytemd]` shortcode: render Markdown written directly inside a post.
	 *
	 * @param array  $atts    Shortcode attributes.
	 * @param string $content Enclosed content.
	 * @return string
	 */
	public function shortcode( $atts, $content = '' ) {
		$atts = shortcode_atts(
			array(
				'mode' => '',
			),
			$atts,
			'bytemd'
		);

		$content = (string) $content;

		if ( '' === trim( $content ) ) {
			return '';
		}

		$args = array();
		if ( $atts['mode'] ) {
			$args['mode'] = sanitize_key( $atts['mode'] );
		}

		return WP_ByteMD_Markdown::render( $content, $args );
	}

	/**
	 * Late safety net: if client rendering was requested after `wp_head` ran,
	 * print the stylesheet from the footer.
	 *
	 * @return void
	 */
	public function late_styles() {
		foreach ( array( WP_ByteMD_Assets::HANDLE_CONTENT_CSS, WP_ByteMD_Assets::HANDLE_VENDOR_VIEWER . '-css' ) as $handle ) {
			if ( ! wp_style_is( $handle, 'registered' ) ) {
				continue;
			}

			if ( wp_style_is( $handle, 'enqueued' ) && ! wp_style_is( $handle, 'done' ) ) {
				$src = wp_styles()->registered[ $handle ]->src;

				if ( ! $src ) {
					continue;
				}

				if ( wp_styles()->registered[ $handle ]->ver ) {
					$src = add_query_arg( 'ver', wp_styles()->registered[ $handle ]->ver, $src );
				}

				printf(
					'<link rel="stylesheet" id="%s-late-css" href="%s" media="all" />' . "\n",
					esc_attr( $handle ),
					esc_url( $src )
				);
			}
		}
	}
}
