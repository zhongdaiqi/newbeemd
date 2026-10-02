/**
 * ByteMD for WordPress — front-end runtime.
 *
 * Two jobs, both opt-in through `window.wpByteMDViewer`:
 *
 *  1. Client rendering — mount ByteMD's `Viewer` into every
 *     `[data-bytemd-viewer]` placeholder that PHP printed.
 *  2. Post-processing for server-rendered Markdown — KaTeX for `$…$` / `$$…$$`
 *     and Mermaid for ```mermaid fences, loaded from a CDN *only* when the page
 *     actually contains them.
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
	 * Inject a script once, keyed by id.
	 *
	 * @param {string} id  Element id used for de-duplication.
	 * @param {string} src Script URL.
	 * @return {Promise<void>} Resolves when loaded.
	 */
	function loadScript( id, src ) {
		return new Promise( function ( resolve, reject ) {
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
				reject( new Error( '加载失败：' + src ) );
			};
			document.head.appendChild( script );
		} );
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
	 * Load the Mermaid ESM build outside of any bundler.
	 *
	 * @return {Promise<Object>} Mermaid instance.
	 */
	function loadMermaid() {
		var mem = '__wpByteMDMermaid';

		if ( window[ mem ] ) {
			return window[ mem ];
		}

		var importer = new Function( 'u', 'return import(u)' );

		window[ mem ] = importer( config.mermaid.src )
			.then( function ( mod ) {
				var mermaid = mod.default || mod;
				mermaid.initialize( {
					startOnLoad: false,
					securityLevel: 'loose',
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

		return loadScript( 'wp-bytemd-katex-js', config.math.js )
			.then( function () {
				return loadScript( 'wp-bytemd-katex-render', config.math.render );
			} )
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
			var roots = document.querySelectorAll( '.wp-bytemd-content[data-bytemd-rendered="server"]' );

			Array.prototype.forEach.call( roots, function ( root ) {
				renderMermaid( root ).then( function () {
					return renderMath( root );
				} );
			} );
		} );
	} );
} )();
