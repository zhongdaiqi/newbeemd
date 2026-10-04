<?php
/**
 * Markdown storage + rendering.
 *
 * Two rendering strategies are supported:
 *
 *  - `server` (default): Parsedown runs in PHP. Best for SEO, excerpts, feeds,
 *    and it needs no JavaScript on the front end.
 *  - `client`: ByteMD's own `Viewer` renders in the browser, which guarantees
 *    a pixel-identical result to the editor preview (KaTeX / Mermaid / all
 *    ByteMD plugins included), at the cost of client-side rendering.
 *
 * @package WP_ByteMD
 */

defined( 'ABSPATH' ) || exit;

/**
 * Turns stored Markdown into front-end HTML.
 */
class WP_ByteMD_Markdown {

	/**
	 * Parsedown instance.
	 *
	 * @var Parsedown|null
	 */
	private static $parser = null;

	/**
	 * Rendered output cache for the current request.
	 *
	 * @var array<string, string>
	 */
	private static $cache = array();

	/**
	 * Set to true when client rendering was requested for this request.
	 *
	 * @var bool
	 */
	public static $needs_client_assets = false;

	/**
	 * Is this post stored as Markdown?
	 *
	 * @param int|WP_Post|null $post Post.
	 * @return bool
	 */
	public static function is_markdown_post( $post = null ) {
		$post = get_post( $post );

		if ( ! $post instanceof WP_Post ) {
			return false;
		}

		if ( ! WP_ByteMD_Options::is_enabled_for( $post->post_type ) ) {
			return false;
		}

		$flag = get_post_meta( $post->ID, WP_ByteMD_Options::META_MARKDOWN, true );

		/**
		 * Filter whether a post should be treated as Markdown.
		 *
		 * @param bool    $is_markdown Whether the post is Markdown.
		 * @param WP_Post $post        Post object.
		 */
		return (bool) apply_filters( 'wp_bytemd_is_markdown_post', ( '' !== $flag && (bool) $flag ), $post );
	}

	/**
	 * Render Markdown to HTML according to the configured strategy.
	 *
	 * @param string $markdown Markdown source.
	 * @param array  $args     {
	 *     Optional. Rendering arguments.
	 *
	 *     @type string $mode   `server` | `client` | `none`. Defaults to the option.
	 *     @type WP_Post $post  Post the content belongs to.
	 *     @type bool   $wrap   Whether to wrap the output in `.wp-bytemd-content`.
	 * }
	 * @return string
	 */
	public static function render( $markdown, $args = array() ) {
		$markdown = (string) $markdown;

		if ( '' === trim( $markdown ) ) {
			return '';
		}

		$defaults = array(
			'mode' => (string) WP_ByteMD_Options::get( 'frontend_render', 'server' ),
			'post' => null,
			'wrap' => true,
		);
		$args     = wp_parse_args( $args, $defaults );

		/**
		 * Filter the render mode (`server`, `client`, `none`).
		 *
		 * @param string $mode Render mode.
		 * @param string $markdown Source.
		 */
		$mode = (string) apply_filters( 'wp_bytemd_render_mode', $args['mode'], $markdown );

		if ( 'none' === $mode ) {
			$html = wpautop( esc_html( self::strip_frontmatter( $markdown ) ) );
		} elseif ( 'client' === $mode ) {
			$html = self::render_client( $markdown );
		} else {
			$html = self::render_server( $markdown );
		}

		if ( $args['wrap'] ) {
			$theme = (string) WP_ByteMD_Options::get( 'frontend_theme', 'auto' );
			$extra = in_array( $theme, array( 'light', 'dark' ), true ) ? ' bytemd-theme-' . $theme : '';

			$html = sprintf(
				'<div class="wp-bytemd-content markdown-body%s" data-bytemd-rendered="%s">%s</div>',
				esc_attr( $extra ),
				esc_attr( $mode ),
				$html
			);
		}

		return $html;
	}

	/**
	 * Server-side rendering through Parsedown + ParsedownExtra.
	 *
	 * @param string $markdown Source.
	 * @return string
	 */
	public static function render_server( $markdown ) {
		$markdown = self::strip_frontmatter( $markdown );
		$key      = 's:' . md5( $markdown );

		if ( isset( self::$cache[ $key ] ) ) {
			return self::$cache[ $key ];
		}

		$parser = self::parser();
		$html   = $parser ? $parser->text( $markdown ) : wpautop( esc_html( $markdown ) );

		/**
		 * Filter the server-rendered Markdown HTML.
		 *
		 * @param string $html     Rendered HTML.
		 * @param string $markdown Markdown source.
		 */
		$html = (string) apply_filters( 'wp_bytemd_rendered_html', $html, $markdown );

		self::$cache[ $key ] = $html;

		return $html;
	}

	/**
	 * Client-side rendering: emit a placeholder that `bytemd-frontend.js` mounts.
	 *
	 * @param string $markdown Source.
	 * @return string
	 */
	public static function render_client( $markdown ) {
		self::$needs_client_assets = true;

		$markdown = self::strip_frontmatter( $markdown );

		wp_enqueue_style( WP_ByteMD_Assets::HANDLE_VENDOR_VIEWER . '-css' );
		wp_enqueue_script( WP_ByteMD_Assets::HANDLE_VENDOR_VIEWER );
		wp_enqueue_script( WP_ByteMD_Assets::HANDLE_FRONTEND );
		wp_enqueue_style( WP_ByteMD_Assets::HANDLE_CONTENT_CSS );

		// The viewer configuration reaches the page through
		// `wp_localize_script()` in WP_ByteMD_Frontend::enqueue(). Nothing is
		// printed here: if the script handle is not registered then the script
		// itself is never output either, so there would be nothing to configure.

		return sprintf(
			'<div class="wp-bytemd-viewer-host" data-bytemd-viewer="1" data-bytemd-payload="%s"></div>',
			esc_attr( base64_encode( $markdown ) )
		);
	}

	/**
	 * Lazily build the Parsedown instance.
	 *
	 * @return Parsedown|null
	 */
	private static function parser() {
		if ( null !== self::$parser ) {
			return self::$parser;
		}

		$base  = WP_BYTEMD_DIR . 'vendor/parsedown/Parsedown.php';
		$extra = WP_BYTEMD_DIR . 'vendor/parsedown/ParsedownExtra.php';

		if ( ! file_exists( $base ) ) {
			return null;
		}

		require_once $base;

		if ( file_exists( $extra ) ) {
			require_once $extra;
			$class = 'ParsedownExtra';
		} else {
			$class = 'Parsedown';
		}

		if ( ! class_exists( $class ) ) {
			return null;
		}

		/** @var Parsedown $parser */
		$parser = new $class();

		// GitHub-style soft line breaks, matching ByteMD's `breaks` plugin.
		$plugins = WP_ByteMD_Options::get( 'plugins', array() );
		$parser->setBreaksEnabled( ! empty( $plugins['breaks'] ) );

		/**
		 * Raw HTML in Markdown is only allowed for users who may post
		 * unfiltered HTML (or when the site owner explicitly opts in), which
		 * keeps Parsedown's safe mode as the secure default.
		 */
		$allow_raw = WP_ByteMD_Options::is_on( 'allow_raw_html' ) || current_user_can( 'unfiltered_html' );

		/**
		 * Filter whether raw HTML inside Markdown is preserved.
		 *
		 * @param bool $allow_raw Whether to allow raw HTML.
		 */
		$allow_raw = (bool) apply_filters( 'wp_bytemd_allow_raw_html', $allow_raw );

		$parser->setSafeMode( ! $allow_raw );

		self::$parser = $parser;

		return self::$parser;
	}

	/**
	 * Drop a leading YAML front matter block.
	 *
	 * @param string $markdown Source.
	 * @return string
	 */
	public static function strip_frontmatter( $markdown ) {
		$plugins = WP_ByteMD_Options::get( 'plugins', array() );

		if ( empty( $plugins['frontmatter'] ) ) {
			return (string) $markdown;
		}

		$pattern = '/\A---\r?\n.*?\r?\n---\r?\n/s';

		if ( preg_match( $pattern, $markdown ) ) {
			return (string) preg_replace( $pattern, '', $markdown, 1 );
		}

		return (string) $markdown;
	}

	/**
	 * Very small Markdown → plain text converter (excerpts, meta descriptions).
	 *
	 * @param string $markdown Source.
	 * @return string
	 */
	public static function to_plain( $markdown ) {
		$text = self::strip_frontmatter( $markdown );

		// Fenced code blocks.
		$text = preg_replace( '/```.*?```/s', ' ', $text );
		// Inline code.
		$text = preg_replace( '/`([^`]*)`/', '$1', (string) $text );
		// Images: `![alt](url)` -> alt.
		$text = preg_replace( '/!\[([^\]]*)\]\([^)]*\)/', '$1', (string) $text );
		// Links: `[text](url)` -> text.
		$text = preg_replace( '/\[([^\]]*)\]\([^)]*\)/', '$1', (string) $text );
		// Headings / blockquote / list markers.
		$text = preg_replace( '/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s*/m', '', (string) $text );
		// Emphasis & underscores used as markers.
		$text = preg_replace( '/(\*\*|__|\*|_|~~)/', '', (string) $text );
		// Tables / rules.
		$text = preg_replace( '/^\s*\|?[\s:|-]{4,}\|?\s*$/m', ' ', (string) $text );
		$text = preg_replace( '/(^|\s)\|(\s|$)/', ' ', (string) $text );

		$text = strip_shortcodes( (string) $text );
		$text = wp_strip_all_tags( (string) $text );

		return trim( (string) preg_replace( '/\s+/u', ' ', $text ) );
	}
}
