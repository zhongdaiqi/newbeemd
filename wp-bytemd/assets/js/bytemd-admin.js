/**
 * ByteMD for WordPress — classic edit screen takeover.
 *
 * Anchors on the plain `<textarea id="content">` that WordPress still renders on
 * classic screens (post types that don't use the block editor, or when the
 * Classic Editor plugin is active).
 *
 * Design notes
 * ------------
 * 1. TinyMCE is destroyed on purpose. WordPress calls `tinymce.triggerSave()`
 *    before submit / autosave, which would copy TinyMCE's stale content over
 *    our Markdown. With no instance on `content`, triggerSave is a no-op.
 * 2. The textarea stays in the DOM (hidden) and is kept in sync on every
 *    change, so rev-slider previews, autosave, REST, WP-CLI and every other
 *    plugin keep working with zero awareness of ByteMD.
 * 3. A real checkbox `wp_bytemd_markdown` lives inside the form, so the
 *    "render as Markdown" flag is saved through the normal POST path.
 *
 * @package WP_ByteMD
 */

( function () {
	'use strict';

	var cfg = window.wpByteMD;

	if ( ! cfg ) {
		return;
	}

	/** Config passed down from PHP. */
	var config = cfg;

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
	 * Remove every TinyMCE instance bound to the content field.
	 */
	function destroyLegacyEditor() {
		var target = document.getElementById( 'content' );

		if ( target && window.tinymce ) {
			var instance = window.tinymce.get( 'content' );
			if ( instance ) {
				try {
					instance.remove();
				} catch ( e ) {
					// Nothing we can do; the textarea is still authoritative.
				}
			}
		}

		if ( window.wp && window.wp.editor && 'function' === typeof window.wp.editor.remove ) {
			try {
				window.wp.editor.remove( 'content' );
			} catch ( e ) {
				// Ignore: no editor was initialised.
			}
		}
	}

	/**
	 * Decide whether the surrounding admin UI is dark, so the editor can follow.
	 *
	 * @return {boolean} True when the admin chrome is dark.
	 */
	function adminIsDark() {
		if ( 'dark' === config.theme ) {
			return true;
		}
		if ( 'light' === config.theme ) {
			return false;
		}

		var el = document.getElementById( 'wpwrap' ) || document.body;
		var bg = window.getComputedStyle( el ).backgroundColor;
		var match = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec( bg );

		if ( ! match ) {
			return false;
		}

		var luminance = ( 0.299 * +match[ 1 ] + 0.587 * +match[ 2 ] + 0.114 * +match[ 3 ] ) / 255;

		return luminance < 0.5;
	}

	/**
	 * Validate a file before sending it to the media library.
	 *
	 * @param {File} file File to validate.
	 * @return {string} Error message, or an empty string when valid.
	 */
	function validateFile( file ) {
		if ( 0 !== file.type.indexOf( 'image/' ) ) {
			return config.strings.notImage;
		}
		if ( config.maxUploadSize && file.size > config.maxUploadSize ) {
			return config.strings.tooLarge;
		}
		return '';
	}

	/**
	 * `uploadImages` handler for ByteMD: straight into the media library.
	 *
	 * @param {FileList|File[]} files Selected files.
	 * @return {Promise<string[]>} Public URLs.
	 */
	function uploadImages( files ) {
		var list = Array.prototype.slice.call( files || [] );
		var accepted = [];
		var rejected = [];

		list.forEach( function ( file ) {
			var error = validateFile( file );
			if ( error ) {
				rejected.push( file.name + '：' + error );
			} else {
				accepted.push( file );
			}
		} );

		if ( rejected.length ) {
			window.alert( rejected.join( '\n' ) );
		}

		if ( ! accepted.length ) {
			return Promise.resolve( [] );
		}

		if ( ! config.restEndpoint || ! config.restNonce ) {
			return Promise.reject( new Error( 'WordPress REST 接口不可用' ) );
		}

		return window.WPByteMD
			.uploadToMediaLibrary( accepted, {
				endpoint: config.restEndpoint,
				nonce: config.restNonce,
			} )
			.catch( function ( error ) {
				window.alert( config.strings.uploadFailed + '：' + error.message );
				throw error;
			} );
	}

	/**
	 * Build the toolbar that sits above the editor.
	 *
	 * @param {HTMLTextAreaElement} textarea Content field.
	 * @param {Object}              state    Shared state object.
	 * @return {HTMLElement} Toolbar element.
	 */
	function buildToolbar( textarea, state ) {
		var bar = document.createElement( 'div' );
		bar.className = 'wp-bytemd-toolbar';

		var left = document.createElement( 'div' );
		left.className = 'wp-bytemd-toolbar-left';

		var badge = document.createElement( 'span' );
		badge.className = 'wp-bytemd-badge';
		badge.textContent = 'ByteMD ' + config.bytemdVersion;
		left.appendChild( badge );

		var label = document.createElement( 'strong' );
		label.textContent = config.strings.editorLabel;
		left.appendChild( label );

		var right = document.createElement( 'div' );
		right.className = 'wp-bytemd-toolbar-right';

		// "Render as Markdown" checkbox — a real form field.
		var existing = document.querySelector( 'input[name="wp_bytemd_markdown"]' );
		var checkLabel = document.createElement( 'label' );
		checkLabel.className = 'wp-bytemd-toggle';

		var checkbox = existing || document.createElement( 'input' );
		checkbox.type = 'checkbox';
		checkbox.name = 'wp_bytemd_markdown';
		checkbox.value = '1';
		checkbox.checked = !! config.markdownDefault;

		if ( ! existing ) {
			checkLabel.appendChild( checkbox );
		}

		var checkText = document.createElement( 'span' );
		checkText.textContent = ' 按 Markdown 渲染本文';
		checkText.title = '勾选后，前端会把这篇文章按 Markdown 解析；取消勾选则按普通 HTML 输出。';
		checkLabel.appendChild( checkText );

		// Marker proving this save came from a ByteMD screen.
		if ( ! document.querySelector( 'input[name="wp_bytemd_active"]' ) ) {
			var marker = document.createElement( 'input' );
			marker.type = 'hidden';
			marker.name = 'wp_bytemd_active';
			marker.value = '1';
			bar.appendChild( marker );
		}

		right.appendChild( checkLabel );

		var count = document.createElement( 'span' );
		count.className = 'wp-bytemd-count';
		right.appendChild( count );

		var switchLink = document.createElement( 'a' );
		switchLink.className = 'wp-bytemd-switch';
		switchLink.href = '#';
		switchLink.textContent = config.strings.switchToWp;
		switchLink.addEventListener( 'click', function ( event ) {
			event.preventDefault();
			if ( window.onbeforeunload ) {
				// Let WordPress ask about unsaved changes.
			}
			var url = new window.URL( window.location.href );
			url.searchParams.set( 'bytemd', 'off' );
			window.location.href = url.toString();
		} );
		right.appendChild( switchLink );

		bar.appendChild( left );
		bar.appendChild( right );

		state.countEl = count;
		state.checkbox = checkbox;
		state.textarea = textarea;

		return bar;
	}

	/**
	 * Update the character counter.
	 *
	 * @param {Object} state State object.
	 * @param {string} value Current value.
	 */
	function updateCount( state, value ) {
		if ( ! state.countEl ) {
			return;
		}
		var length = value ? value.length : 0;
		state.countEl.textContent = length.toLocaleString() + ' ' + config.strings.chars;
	}

	/**
	 * Mount ByteMD over the content field.
	 *
	 * @param {HTMLTextAreaElement} textarea Content field.
	 */
	function mount( textarea ) {
		if ( '1' === textarea.dataset.wpBytemdInit ) {
			return;
		}

		if ( ! window.WPByteMD || 'function' !== typeof window.WPByteMD.Editor ) {
			// eslint-disable-next-line no-console
			console.warn( '[wp-bytemd] 运行时未加载，已保留 WordPress 原生编辑器。' );
			return;
		}

		textarea.dataset.wpBytemdInit = '1';

		destroyLegacyEditor();

		var postdiv = document.getElementById( 'postdivrich' );
		var legacy = document.getElementById( 'wp-content-wrap' );
		var host = postdiv || textarea.parentNode;

		var wrap = document.createElement( 'div' );
		wrap.className = 'wp-bytemd-wrap';
		wrap.style.setProperty( '--wp-bytemd-height', ( config.height || 640 ) + 'px' );

		if ( adminIsDark() ) {
			wrap.classList.add( 'wp-bytemd-dark' );
		}

		var state = { value: textarea.value };

		var bar = buildToolbar( textarea, state );
		wrap.appendChild( bar );

		var editorHost = document.createElement( 'div' );
		editorHost.className = 'wp-bytemd-editor';
		wrap.appendChild( editorHost );

		var hint = document.createElement( 'p' );
		hint.className = 'wp-bytemd-hint';
		hint.textContent = config.strings.unsavedHint;
		wrap.appendChild( hint );

		if ( legacy && legacy.parentNode ) {
			legacy.parentNode.insertBefore( wrap, legacy );
			legacy.style.display = 'none';
		} else if ( host ) {
			host.insertBefore( wrap, host.firstChild );
			textarea.style.display = 'none';
		}

		var plugins = window.WPByteMD.buildPlugins(
			config.plugins || {},
			config.mermaid && config.mermaid.enabled ? { mermaid: config.mermaid } : {}
		);

		var editor = new window.WPByteMD.Editor( {
			target: editorHost,
			props: {
				value: textarea.value,
				plugins: plugins,
				mode: config.editorMode || 'split',
				locale: ( window.WPByteMD.locales && window.WPByteMD.locales[ config.locale ] ) || undefined,
				placeholder: '开始写 Markdown…（支持 GFM 表格、任务列表、公式、Mermaid、图片拖拽上传）',
				uploadImages: uploadImages,
				editorConfig: {
					lineWrapping: true,
					autofocus: false,
				},
			},
		} );

		editor.$on( 'change', function ( event ) {
			var value = event && event.detail ? event.detail.value : '';
			state.value = value;

			if ( textarea.value !== value ) {
				textarea.value = value;
			}

			// Let WordPress and every other plugin see a normal edit.
			textarea.dispatchEvent( new window.Event( 'input', { bubbles: true } ) );
			textarea.dispatchEvent( new window.Event( 'change', { bubbles: true } ) );

			updateCount( state, value );
		} );

		// Force-sync right before the form goes out.
		var form = textarea.form || document.getElementById( 'post' );
		if ( form ) {
			form.addEventListener(
				'submit',
				function () {
					textarea.value = state.value;
				},
				true
			);
		}

		updateCount( state, textarea.value );

		// Expose for debugging / third-party integrations.
		window.wpByteMDInstance = {
			editor: editor,
			textarea: textarea,
			state: state,
		};

		/**
		 * Fires after ByteMD has been mounted on the classic screen.
		 */
		document.dispatchEvent( new window.CustomEvent( 'wp-bytemd:ready', { detail: window.wpByteMDInstance } ) );
	}

	ready( function () {
		var textarea = document.getElementById( 'content' );
		if ( textarea ) {
			mount( textarea );
		}
	} );
} )();
