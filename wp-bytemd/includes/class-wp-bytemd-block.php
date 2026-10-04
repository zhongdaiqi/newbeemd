<?php
/**
 * Block editor integration.
 *
 * Registers a dynamic `bytemd/editor` block whose Markdown source lives in the
 * block attributes. The block is *always* registered so existing content keeps
 * rendering, but its editor script is only attached when the feature is on.
 *
 * @package WP_ByteMD
 */

defined( 'ABSPATH' ) || exit;

/**
 * `bytemd/editor` block.
 */
class WP_ByteMD_Block {

	/**
	 * Block name.
	 */
	const BLOCK = 'bytemd/editor';

	/**
	 * Constructor.
	 */
	public function __construct() {
		add_action( 'init', array( $this, 'register_block' ), 15 );
	}

	/**
	 * Register the dynamic block.
	 *
	 * @return void
	 */
	public function register_block() {
		$args = array(
			'api_version'     => 3,
			'title'           => __( 'Newbee Markdown', 'newbee-markdown-editor' ),
			'category'        => 'text',
			'icon'            => 'editor-code',
			'description'     => __( '用 Markdown 写作，前端按 Markdown 渲染。由 ByteMD 驱动。', 'newbee-markdown-editor' ),
			'keywords'        => array( 'markdown', 'bytemd', 'md' ),
			'supports'        => array(
				'html'     => false,
				'multiple' => false,
				'align'    => array( 'wide', 'full' ),
				'anchor'   => true,
			),
			'attributes'      => array(
				'content' => array(
					'type'    => 'string',
					'default' => '',
				),
				'height'  => array(
					'type'    => 'number',
					'default' => (int) WP_ByteMD_Options::get( 'editor_height', 640 ),
				),
				'align'   => array(
					'type'    => 'string',
					'default' => '',
				),
			),
			'render_callback' => array( $this, 'render' ),
		);

		if ( WP_ByteMD_Options::is_on( 'enable_block' ) ) {
			$args['editor_script'] = WP_ByteMD_Assets::HANDLE_BLOCK;
			$args['editor_style']  = WP_ByteMD_Assets::HANDLE_ADMIN . '-css';
			$args['style']         = WP_ByteMD_Assets::HANDLE_CONTENT_CSS;
		}

		register_block_type( self::BLOCK, $args );
	}

	/**
	 * Front-end / REST rendering.
	 *
	 * @param array $attributes Block attributes.
	 * @return string
	 */
	public function render( $attributes ) {
		$markdown = isset( $attributes['content'] ) ? (string) $attributes['content'] : '';

		if ( '' === trim( $markdown ) ) {
			return '';
		}

		$html = WP_ByteMD_Markdown::render( $markdown, array( 'wrap' => false ) );

		$mode  = (string) WP_ByteMD_Options::get( 'frontend_render', 'server' );
		$theme = (string) WP_ByteMD_Options::get( 'frontend_theme', 'auto' );
		$class = 'wp-bytemd-content markdown-body';

		if ( in_array( $theme, array( 'light', 'dark' ), true ) ) {
			$class .= ' bytemd-theme-' . $theme;
		}

		$wrapper = get_block_wrapper_attributes(
			array(
				'class'                => $class,
				'data-bytemd-rendered' => $mode,
			)
		);

		return '<div ' . $wrapper . '>' . $html . '</div>';
	}
}
