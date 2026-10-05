/**
 * ByteMD for WordPress — front-end runtime.
 *
 * Three jobs, all opt-in through `window.wpByteMDViewer`:
 *
 *  1. Client rendering — mount ByteMD's `Viewer` into every
 *     `[data-bytemd-viewer]` placeholder that PHP printed.
 *  2. Post-processing for server-rendered Markdown — KaTeX for `$…$` / `$$…$$`,
 *     Mermaid for ```mermaid fences, and highlight.js for `pre > code`
 *     blocks (the server path emits plain code fences). Everything ships
 *     inside the plugin and is requested *only* when the page actually
 *     contains it; no third-party server is ever contacted.
 *  3. Copy buttons on code blocks, for both render paths.
 *
 * @package WP_ByteMD
 */

( function () {
	'use strict';

	var config = window.wpByteMDViewer;

	if ( ! config ) {
		return;
	}

	/**
	 * Run once the DOM is usable.
	 *
	 * @param {Function} fn Callback.
	 */
	function ready( fn ) {
		if ( 'loading' === document.readyState ) {
			document.addEventListener( 'DOMContentLoaded', fn );
		} else {
			fn();
		}
	}

	/**
	 * Inject a script once, keyed by id. Concurrent callers share the same
	 * promise: a second container on the same page must wait for the pending
	 * load instead of resolving against an unexecuted script.
	 *
	 * @param {string} id  Element id used for de-duplication.
	 * @param {string} src Script URL.
	 * @return {Promise<void>} Resolves when loaded.
	 */
	var scriptPromises = {};

	function loadScript( id, src ) {
		if ( scriptPromises[ id ] ) {
			return scriptPromises[ id ];
		}

		scriptPromises[ id ] = new Promise( function ( resolve, reject ) {
			if ( document.getElementById( id ) ) {
				resolve();
				return;
			}
			var script = document.createElement( 'script' );
			script.id = id;
			script.src = src;
			script.async = true;
			script.onload = function () {
				resolve();
			};
			script.onerror = function () {
				delete scriptPromises[ id ];
				reject( new Error( '加载失败：' + src ) );
			};
			document.head.appendChild( script );
		} );

		return scriptPromises[ id ];
	}

	/**
	 * Inject a stylesheet once, keyed by id.
	 *
	 * @param {string} id   Element id used for de-duplication.
	 * @param {string} href Stylesheet URL.
	 */
	function loadStyle( id, href ) {
		if ( document.getElementById( id ) ) {
			return;
		}
		var link = document.createElement( 'link' );
		link.id = id;
		link.rel = 'stylesheet';
		link.href = href;
		document.head.appendChild( link );
	}

	/**
	 * Decode a UTF-8 base64 string produced by PHP's `base64_encode()`.
	 *
	 * @param {string} value Base64 payload.
	 * @return {string} Decoded text.
	 */
	function decodePayload( value ) {
		var binary = window.atob( value );
		var bytes = new Uint8Array( binary.length );

		for ( var i = 0; i < binary.length; i += 1 ) {
			bytes[ i ] = binary.charCodeAt( i );
		}

		if ( 'undefined' !== typeof window.TextDecoder ) {
			return new window.TextDecoder( 'utf-8' ).decode( bytes );
		}

		return decodeURIComponent( window.escape( binary ) );
	}

	/**
	 * Load the Mermaid runtime bundled with the plugin.
	 *
	 * @return {Promise<Object>} Mermaid instance.
	 */
	function loadMermaid() {
		var mem = '__wpByteMDMermaid';

		if ( window[ mem ] ) {
			return window[ mem ];
		}

		window[ mem ] = loadScript( 'wp-bytemd-mermaid-js', config.mermaid.src )
			.then( function () {
				var mermaid = window.WPByteMDMermaid;

				if ( ! mermaid ) {
					throw new Error( 'Mermaid 运行时未定义' );
				}

				mermaid.initialize( {
					startOnLoad: false,
					// Post content may be written by lower-privileged users, so
					// `strict` stays on: it blocks HTML labels and click handlers.
					securityLevel: 'strict',
					theme: config.mermaid.theme || 'default',
				} );

				return mermaid;
			} )
			.catch( function ( error ) {
				window[ mem ] = null;
				throw error;
			} );

		return window[ mem ];
	}

	var mermaidSeq = 0;

	/**
	 * Copy plain text to the clipboard, with a fallback for non-secure
	 * contexts where `navigator.clipboard` is unavailable.
	 *
	 * @param {string} text Text to copy.
	 * @return {Promise<void>} Resolves on success.
	 */
	function copyText( text ) {
		if ( navigator.clipboard && navigator.clipboard.writeText ) {
			return navigator.clipboard.writeText( text );
		}

		return new Promise( function ( resolve, reject ) {
			try {
				var helper = document.createElement( 'textarea' );
				helper.value = text;
				helper.setAttribute( 'readonly', '' );
				helper.style.position = 'fixed';
				helper.style.opacity = '0';
				document.body.appendChild( helper );
				helper.select();
				var ok = document.execCommand( 'copy' );
				document.body.removeChild( helper );
				if ( ok ) {
					resolve();
				} else {
					reject( new Error( 'execCommand copy failed' ) );
				}
			} catch ( error ) {
				reject( error );
			}
		} );
	}

	/**
	 * Flash the copy button after a copy attempt.
	 *
	 * @param {HTMLElement} button    Button element.
	 * @param {boolean}     succeeded Whether the copy succeeded.
	 */
	function flashCopyButton( button, succeeded ) {
		if ( button.getAttribute( 'data-bytemd-busy' ) ) {
			return;
		}

		button.setAttribute( 'data-bytemd-busy', '1' );

		var original = button.textContent;
		var strings  = config.strings || {};

		if ( succeeded ) {
			button.classList.add( 'wp-bytemd-copy-ok' );
			button.textContent = strings.copied || 'Copied';
		} else {
			button.textContent = strings.copyFailed || original;
		}

		window.setTimeout( function () {
			button.classList.remove( 'wp-bytemd-copy-ok' );
			button.textContent = original;
			button.removeAttribute( 'data-bytemd-busy' );
		}, 2000 );
	}

	/**
	 * Add a copy button to a code block.
	 *
	 * @param {HTMLElement} pre  The wrapping <pre>.
	 * @param {HTMLElement} code The <code> inside it.
	 */
	function addCopyButton( pre, code ) {
		var button = document.createElement( 'button' );
		button.type = 'button';
		button.className = 'wp-bytemd-copy';
		button.textContent = ( config.strings && config.strings.copy ) || 'Copy';
		button.setAttribute( 'aria-label', ( config.strings && config.strings.copyAria ) || button.textContent );

		button.addEventListener( 'click', function ( event ) {
			event.preventDefault();
			copyText( code.textContent || '' ).then(
				function () {
					flashCopyButton( button, true );
				},
				function () {
					flashCopyButton( button, false );
				}
			);
		} );

		pre.appendChild( button );
	}

	/**
	 * Load the bundled slim highlight.js runtime once.
	 *
	 * @return {Promise<void>} Resolves when `window.WPByteMDHljs` is ready.
	 */
	function loadHighlighter() {
		if ( window.WPByteMDHljs ) {
			return Promise.resolve();
		}

		if ( config.highlight && config.highlight.css ) {
			loadStyle( 'wp-bytemd-hljs-css', config.highlight.css );
		}

		return loadScript( 'wp-bytemd-hljs-js', config.highlight.js ).then( function () {
			if ( ! window.WPByteMDHljs ) {
				throw new Error( 'highlight.js 运行时未定义' );
			}
		} );
	}

	/**
	 * Post-process code blocks: copy buttons everywhere, plus syntax
	 * highlighting for server-rendered blocks (the client-side Viewer already
	 * highlights its own output).
	 *
	 * @param {HTMLElement} root            Content container.
	 * @param {boolean}     allowHighlight  Whether to run highlight.js here.
	 * @return {Promise<void>} Resolves when highlighting finished (or failed).
	 */
	function enhanceCode( root, allowHighlight ) {
		var pres = root.querySelectorAll( 'pre' );
		var codes = [];

		Array.prototype.forEach.call( pres, function ( pre ) {
			if ( pre.getAttribute( 'data-bytemd-enhanced' ) ) {
				return;
			}

			var code = pre.querySelector( 'code' );

			if ( ! code ) {
				return;
			}

			// Mermaid fences are replaced with rendered diagrams; leave them alone.
			if ( /(^|\s)(language|lang)-mermaid(\s|$)/i.test( code.className ) ) {
				return;
			}

			pre.setAttribute( 'data-bytemd-enhanced', '1' );
			addCopyButton( pre, code );
			codes.push( code );
		} );

		if ( ! codes.length || ! allowHighlight || ! config.highlight || ! config.highlight.enabled ) {
			return Promise.resolve();
		}

		return loadHighlighter()
			.then( function () {
				Array.prototype.forEach.call( codes, function ( code ) {
					if ( code.classList.contains( 'hljs' ) ) {
						return;
					}
					try {
						window.WPByteMDHljs.highlightElement( code );
					} catch ( error ) {
						// A single unhighlightable block must not break the rest.
					}
				} );
			} )
			.catch( function ( error ) {
				// eslint-disable-next-line no-console
				console.warn( '[wp-bytemd] 代码高亮加载失败：', error.message );
			} );
	}


	/**
	 * Replace ```mermaid fences with rendered diagrams.
	 *
	 * @param {HTMLElement} root Container.
	 * @return {Promise<void>} Resolves when done.
	 */
	function renderMermaid( root ) {
		var blocks = root.querySelectorAll( 'pre > code.language-mermaid, pre > code.lang-mermaid' );

		if ( ! blocks.length || ! config.mermaid || ! config.mermaid.enabled ) {
			return Promise.resolve();
		}

		return loadMermaid().then( function ( mermaid ) {
			Array.prototype.forEach.call( blocks, function ( code ) {
				var pre = code.parentNode;
				var host = document.createElement( 'div' );
				host.className = 'wp-bytemd-mermaid';
				pre.parentNode.replaceChild( host, pre );

				var id = 'wp-bytemd-mermaid-' + ( mermaidSeq += 1 );

				Promise.resolve( mermaid.render( id, code.textContent || '' ) )
					.then( function ( result ) {
						host.innerHTML = result && result.svg ? result.svg : String( result || '' );
					} )
					.catch( function ( error ) {
						host.classList.add( 'wp-bytemd-mermaid-error' );
						host.textContent =
							( config.strings && config.strings.mermaidError ) + '：' + error.message;
					} );
			} );
		} );
	}

	/**
	 * Render `$…$` / `$$…$$` math with KaTeX's auto-render extension.
	 *
	 * @param {HTMLElement} root Container.
	 * @return {Promise<void>} Resolves when done.
	 */
	function renderMath( root ) {
		if ( ! config.math || ! config.math.enabled ) {
			return Promise.resolve();
		}

		if ( ! /(^|[^\\])\$\$?[^\s$]/.test( root.textContent || '' ) ) {
			return Promise.resolve();
		}

		loadStyle( 'wp-bytemd-katex-css', config.math.css );

		// `bytemd-katex.js` bundles KaTeX together with the auto-render
		// extension, so a single request covers both.
		return loadScript( 'wp-bytemd-katex-js', config.math.js )
			.then( function () {
				if ( 'function' !== typeof window.renderMathInElement ) {
					return;
				}
				window.renderMathInElement( root, {
					delimiters: [
						{ left: '$$', right: '$$', display: true },
						{ left: '$', right: '$', display: false },
						{ left: '\\(', right: '\\)', display: false },
						{ left: '\\[', right: '\\]', display: true },
					],
					ignoredTags: [ 'script', 'noscript', 'style', 'textarea', 'pre', 'code', 'option' ],
					throwOnError: false,
				} );
			} )
			.catch( function ( error ) {
				// eslint-disable-next-line no-console
				console.warn( '[wp-bytemd] KaTeX 加载失败：', error.message );
			} );
	}

	/**
	 * Mount ByteMD's Viewer into every client-render placeholder.
	 *
	 * @return {Promise<void>} Resolves when all viewers are mounted.
	 */
	function mountViewers() {
		var hosts = document.querySelectorAll( '[data-bytemd-viewer]' );

		if ( ! hosts.length ) {
			return Promise.resolve();
		}

		if ( ! window.WPByteMD || 'function' !== typeof window.WPByteMD.Viewer ) {
			// eslint-disable-next-line no-console
			console.warn( '[wp-bytemd] Viewer 运行时未加载，回退为纯文本输出。' );
			Array.prototype.forEach.call( hosts, function ( host ) {
				host.textContent = decodePayload( host.getAttribute( 'data-bytemd-payload' ) || '' );
			} );
			return Promise.resolve();
		}

		var plugins = window.WPByteMD.buildPlugins(
			config.plugins || {},
			config.mermaid && config.mermaid.enabled ? { mermaid: config.mermaid } : {}
		);

		Array.prototype.forEach.call( hosts, function ( host ) {
			if ( host.getAttribute( 'data-bytemd-mounted' ) ) {
				return;
			}
			host.setAttribute( 'data-bytemd-mounted', '1' );

			var value = decodePayload( host.getAttribute( 'data-bytemd-payload' ) || '' );

			/* eslint-disable no-new */
			new window.WPByteMD.Viewer( {
				target: host,
				props: {
					value: value,
					plugins: plugins,
				},
			} );
		} );

		return Promise.resolve();
	}

	ready( function () {
		mountViewers().then( function () {
			// Client-rendered containers: ByteMD's Viewer highlights its own
			// output through the highlight plugin, so only add copy buttons.
			Array.prototype.forEach.call(
				document.querySelectorAll( '.wp-bytemd-content[data-bytemd-rendered="client"]' ),
				function ( root ) {
					enhanceCode( root, false );
				}
			);

			// Server-rendered containers: Parsedown emits plain
			// `<pre><code class="language-…">` — highlight them here.
			Array.prototype.forEach.call(
				document.querySelectorAll( '.wp-bytemd-content[data-bytemd-rendered="server"]' ),
				function ( root ) {
					enhanceCode( root, true );
					renderMermaid( root ).then( function () {
						return renderMath( root );
					} );
				}
			);
		} );
	} );
} )();
