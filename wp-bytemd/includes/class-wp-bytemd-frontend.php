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
	 * Does this post need the front-end runtime script?
	 *
	 * The script does three things: highlight fenced code blocks in
	 * server-rendered output, add a copy button to every code block, and
	 * lazily pull in the KaTeX / Mermaid runtimes. So it is needed whenever the
	 * post contains a code block at all — not only when maths or a diagram is
	 * present.
	 *
	 * It also has to be enqueued for the *block* path, where the post content
	 * holds block markup rather than Markdown.
	 *
	 * @param WP_Post $post Post.
	 * @return bool
	 */
	private function needs_runtime_scripts( $post ) {
		$content = (string) $post->post_content;

		// Client rendering always needs the script, whatever the content is.
		if ( 'client' === WP_ByteMD_Options::get( 'frontend_render', 'server' ) ) {
			return true;
		}

		if ( WP_ByteMD_Options::is_on( 'frontend_mermaid' ) && false !== strpos( $content, '```mermaid' ) ) {
			return true;
		}

		if ( WP_ByteMD_Options::is_on( 'frontend_math' ) && preg_match( '/\$\$?[^\s$]/', $content ) ) {
			return true;
		}

		// Code highlighting and the copy button. Any fenced block counts,
		// including a fence with no info string (``` on its own line).
		if ( WP_ByteMD_Options::is_on( 'frontend_highlight' ) && self::has_fenced_code( $content ) ) {
			return true;
		}

		// The dynamic block renders through PHP; scan its Markdown attribute.
		if ( function_exists( 'has_block' ) && has_block( WP_ByteMD_Block::BLOCK, $post ) ) {
			return WP_ByteMD_Options::is_on( 'frontend_highlight' );
		}

		return false;
	}

	/**
	 * Does this content contain a fenced code block?
	 *
	 * Deliberately permissive: a fence is three or more backticks (or tildes)
	 * at the start of a line, optionally indented up to three spaces and
	 * optionally followed by an info string. An unclosed fence still produces a
	 * `<pre><code>` block in Parsedown, so it counts.
	 *
	 * @param string $content Markdown or block markup.
	 * @return bool
	 */
	private static function has_fenced_code( $content ) {
		return (bool) preg_match( '/^[ \t]{0,3}(`{3,}|~{3,})/m', $content );
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

		// Already rendered (a theme called the filter twice, or a template
		// pre-rendered it). Match on the wrapper's actual HTML attributes — a
		// plain-text check would false-positive on posts that merely *mention*
		// these strings, e.g. an article showing the plugin's markup.
		if ( preg_match( '/<div[^>]*data-bytemd-(?:rendered|viewer)[=\s>]/', (string) $content ) ) {
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
}
