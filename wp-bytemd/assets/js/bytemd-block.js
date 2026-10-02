/**
 * ByteMD for WordPress — block editor integration.
 *
 * Registers `bytemd/editor` (dynamic block: the Markdown source lives in the
 * block attributes, the front end is rendered by PHP).
 *
 * The ByteMD runtime (~1.1 MB) is *not* a script dependency: it is injected
 * only when the block is actually rendered in the editor, which keeps every
 * other block-editor screen fast.
 *
 * @package WP_ByteMD
 */

( function ( blocks, element, blockEditor, i18n ) {
	'use strict';

	var el = element.createElement;
	var useEffect = element.useEffect;
	var useRef = element.useRef;
	var useState = element.useState;
	var __ = i18n.__;

	/** Config passed down from PHP (see WP_ByteMD_Admin::localize_block_editor_config). */
	var config = window.wpByteMDBlock || {};
	var runtime = config.runtime || {};

	var runtimePromise = null;

	/**
	 * Load the ByteMD runtime on demand.
	 *
	 * @return {Promise<Object>} Resolves with `window.WPByteMD`.
	 */
	function ensureRuntime() {
		if ( window.WPByteMD && window.WPByteMD.Editor ) {
			return Promise.resolve( window.WPByteMD );
		}

		if ( runtimePromise ) {
			return runtimePromise;
		}

		runtimePromise = new Promise( function ( resolve, reject ) {
			if ( ! runtime.script ) {
				reject( new Error( 'ByteMD 运行时地址缺失（请检查插件设置或重新构建资源）' ) );
				return;
			}

			var suffix = runtime.version ? '?ver=' + encodeURIComponent( runtime.version ) : '';

			if ( runtime.style && ! document.getElementById( 'wp-bytemd-runtime-css' ) ) {
				var link = document.createElement( 'link' );
				link.id = 'wp-bytemd-runtime-css';
				link.rel = 'stylesheet';
				link.href = runtime.style + suffix;
				document.head.appendChild( link );
			}

			var script = document.createElement( 'script' );
			script.src = runtime.script + suffix;
			script.async = true;
			script.onload = function () {
				if ( window.WPByteMD && window.WPByteMD.Editor ) {
					resolve( window.WPByteMD );
				} else {
					reject( new Error( 'ByteMD 运行时加载完成，但未挂载全局对象' ) );
				}
			};
			script.onerror = function () {
				reject( new Error( 'ByteMD 运行时加载失败：' + runtime.script ) );
			};
			document.head.appendChild( script );
		} );

		return runtimePromise;
	}

	/**
	 * Build the plugin list from the PHP config.
	 *
	 * @param {Object} rt Runtime object.
	 * @return {Array} Plugin list.
	 */
	function buildPlugins( rt ) {
		return rt.buildPlugins(
			config.plugins || {},
			config.mermaid && config.mermaid.enabled ? { mermaid: config.mermaid } : {}
		);
	}

	/**
	 * Media-library upload handler (same behaviour as the classic screen).
	 *
	 * @param {FileList|File[]} files Files.
	 * @return {Promise<string[]>} URLs.
	 */
	function uploadImages( files ) {
		if ( ! config.restEndpoint || ! config.restNonce ) {
			return Promise.reject( new Error( 'REST 接口不可用' ) );
		}
		return window.WPByteMD.uploadToMediaLibrary( Array.prototype.slice.call( files || [] ), {
			endpoint: config.restEndpoint,
			nonce: config.restNonce,
		} );
	}

	/**
	 * Editor component.
	 *
	 * @param {Object} props Block props.
	 * @return {Object} Element.
	 */
	function Edit( props ) {
		var host = useRef( null );
		var instance = useRef( null );
		var lastValue = useRef( props.attributes.content );
		var statusState = useState( 'loading' );
		var status = statusState[ 0 ];
		var setStatus = statusState[ 1 ];
		var errorState = useState( '' );
		var error = errorState[ 0 ];
		var setError = errorState[ 1 ];

		useEffect( function () {
			var cancelled = false;

			ensureRuntime()
				.then( function ( rt ) {
					if ( cancelled || ! host.current ) {
						return;
					}

					instance.current = new rt.Editor( {
						target: host.current,
						props: {
							value: props.attributes.content || '',
							plugins: buildPlugins( rt ),
							mode: config.editorMode || 'split',
							locale: ( rt.locales && rt.locales[ config.locale ] ) || undefined,
							placeholder: '开始写 Markdown…',
							uploadImages: uploadImages,
							editorConfig: { lineWrapping: true, autofocus: false },
						},
					} );

					instance.current.$on( 'change', function ( event ) {
						var value = event && event.detail ? event.detail.value : '';
						lastValue.current = value;
						props.setAttributes( { content: value } );
					} );

					setStatus( 'ready' );
				} )
				.catch( function ( err ) {
					if ( cancelled ) {
						return;
					}
					setError( err.message || String( err ) );
					setStatus( 'error' );
				} );

			return function () {
				cancelled = true;
				if ( instance.current ) {
					try {
						instance.current.$destroy();
					} catch ( e ) {
						// Already gone.
					}
					instance.current = null;
				}
			};
			// eslint-disable-next-line react-hooks/exhaustive-deps
		}, [] );

		// Keep the editor in sync with undo / redo / block transforms.
		useEffect(
			function () {
				if ( ! instance.current ) {
					return;
				}
				var next = props.attributes.content || '';
				if ( next !== lastValue.current ) {
					lastValue.current = next;
					instance.current.$set( { value: next } );
				}
			},
			[ props.attributes.content ]
		);

		var children = [];

		if ( 'error' === status ) {
			children.push(
				el(
					'div',
					{ className: 'wp-bytemd-block-error', key: 'err' },
					__( 'ByteMD 运行时加载失败：', 'wp-bytemd' ) + error
				)
			);
		}

		children.push(
			el( 'div', {
				key: 'host',
				ref: host,
				className: 'wp-bytemd-block-host',
				style: { '--wp-bytemd-height': ( props.attributes.height || 520 ) + 'px' },
			} )
		);

		if ( 'loading' === status ) {
			children.push(
				el(
					'p',
					{ className: 'wp-bytemd-block-hint', key: 'hint' },
					__( '正在加载 ByteMD 编辑器…', 'wp-bytemd' )
				)
			);
		}

		return el(
			'div',
			blockEditor.useBlockProps( { className: 'wp-bytemd-block' } ),
			children
		);
	}

	blocks.registerBlockType( 'bytemd/editor', {
		apiVersion: 3,
		title: __( 'ByteMD Markdown', 'wp-bytemd' ),
		description: __( '使用 ByteMD 编写 Markdown，前端按 Markdown 渲染。', 'wp-bytemd' ),
		category: 'text',
		icon: 'editor-code',
		keywords: [
			__( 'Markdown', 'wp-bytemd' ),
			'ByteMD',
			__( '写作', 'wp-bytemd' ),
		],
		supports: {
			html: false,
			multiple: false,
			align: [ 'wide', 'full' ],
			anchor: true,
		},
		attributes: {
			content: { type: 'string', default: '' },
			height: { type: 'number', default: 520 },
			align: { type: 'string', default: '' },
		},
		edit: Edit,
		// Dynamic block: the markup is produced by PHP (WP_ByteMD_Block::render).
		save: function () {
			return null;
		},
	} );
} )(
	window.wp.blocks,
	window.wp.element,
	window.wp.blockEditor,
	window.wp.i18n
);
