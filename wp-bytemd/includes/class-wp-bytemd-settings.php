<?php
/**
 * Settings screen (Settings → ByteMD).
 *
 * @package WP_ByteMD
 */

defined( 'ABSPATH' ) || exit;

/**
 * Settings API integration.
 */
class WP_ByteMD_Settings {

	const PAGE       = 'newbee-markdown-editor';
	const GROUP      = 'wp_bytemd_group';
	const CAPABILITY = 'manage_options';

	/**
	 * Constructor.
	 */
	public function __construct() {
		add_action( 'admin_menu', array( $this, 'add_menu' ) );
		add_action( 'admin_init', array( $this, 'register_settings' ) );
	}

	/**
	 * Add the options page.
	 *
	 * @return void
	 */
	public function add_menu() {
		add_options_page(
			__( 'Newbee Markdown 设置', 'newbee-markdown-editor' ),
			__( 'Newbee Markdown', 'newbee-markdown-editor' ),
			self::CAPABILITY,
			self::PAGE,
			array( $this, 'render_page' )
		);
	}

	/**
	 * Field definitions, grouped by section.
	 *
	 * @return array
	 */
	private function fields() {
		$plugins = WP_ByteMD_Options::available_plugins();

		return array(
			'general'  => array(
				'title'  => __( '基本设置', 'newbee-markdown-editor' ),
				'intro'  => __( '选择哪些内容类型使用 ByteMD，以及是否接管经典编辑界面。', 'newbee-markdown-editor' ),
				'fields' => array(
					array(
						'id'    => 'post_types',
						'type'  => 'post_types',
						'title' => __( '启用的内容类型', 'newbee-markdown-editor' ),
						'desc'  => __( '只有勾选的内容类型才会加载 ByteMD。', 'newbee-markdown-editor' ),
					),
					array(
						'id'    => 'classic_takeover',
						'type'  => 'checkbox',
						'title' => __( '接管经典编辑界面', 'newbee-markdown-editor' ),
						'desc'  => __( '在经典编辑界面（非区块编辑器）用 ByteMD 替换默认内容编辑器。作者可随时一键切回 WordPress 编辑器。', 'newbee-markdown-editor' ),
					),
					array(
						'id'    => 'force_classic',
						'type'  => 'checkbox',
						'title' => __( '对上述内容类型禁用区块编辑器', 'newbee-markdown-editor' ),
						'desc'  => __( '开启后，勾选的内容类型会强制走经典编辑界面（等价于 Classic Editor 插件对该类型的效果），ByteMD 才能生效。WordPress 7.1 起 Classic 区块已从区块插入器中移除，这是让 ByteMD 完整取代编辑器的推荐做法。', 'newbee-markdown-editor' ),
					),
					array(
						'id'    => 'enable_block',
						'type'  => 'checkbox',
						'title' => __( '注册「Newbee Markdown」区块', 'newbee-markdown-editor' ),
						'desc'  => __( '在区块编辑器中提供 bytemd/editor 区块，Markdown 存在区块属性里，前端由服务端渲染。', 'newbee-markdown-editor' ),
					),
				),
			),
			'editor'   => array(
				'title'  => __( '编辑器', 'newbee-markdown-editor' ),
				'intro'  => __( '外观与编辑器插件。ByteMD 1.22.0 已随插件打包，不依赖任何外部 CDN。', 'newbee-markdown-editor' ),
				'fields' => array(
					array(
						'id'      => 'editor_mode',
						'type'    => 'select',
						'title'   => __( '显示模式', 'newbee-markdown-editor' ),
						'options' => array(
							'split' => __( '分屏：左编辑右预览', 'newbee-markdown-editor' ),
							'tab'   => __( '标签页：编辑 / 预览切换', 'newbee-markdown-editor' ),
							'auto'  => __( '自动：窄屏标签页、宽屏分屏', 'newbee-markdown-editor' ),
						),
					),
					array(
						'id'    => 'editor_height',
						'type'  => 'number',
						'title' => __( '编辑器高度（px）', 'newbee-markdown-editor' ),
						'desc'  => __( '范围 240 – 2000，默认 640。', 'newbee-markdown-editor' ),
						'min'   => 240,
						'max'   => 2000,
					),
					array(
						'id'      => 'theme',
						'type'    => 'select',
						'title'   => __( '配色', 'newbee-markdown-editor' ),
						'options' => array(
							'auto'  => __( '跟随 WordPress 后台配色', 'newbee-markdown-editor' ),
							'light' => __( '始终浅色', 'newbee-markdown-editor' ),
							'dark'  => __( '始终深色', 'newbee-markdown-editor' ),
						),
					),
					array(
						'id'      => 'locale',
						'type'    => 'select',
						'title'   => __( '界面语言', 'newbee-markdown-editor' ),
						'options' => array(
							'auto'    => __( '自动（跟随用户语言）', 'newbee-markdown-editor' ),
							'zh_Hans' => '简体中文',
							'en'      => 'English',
						),
					),
					array(
						'id'      => 'plugins',
						'type'    => 'plugins',
						'title'   => __( '编辑器插件', 'newbee-markdown-editor' ),
						'desc'    => __( '插件会同时影响编辑器预览与前端渲染结果。', 'newbee-markdown-editor' ),
						'options' => $plugins,
					),
				),
			),
			'frontend' => array(
				'title'  => __( '前端渲染', 'newbee-markdown-editor' ),
				'intro'  => __( 'Markdown 原文存在 post_content 中，发布时按这里的策略转成 HTML。', 'newbee-markdown-editor' ),
				'fields' => array(
					array(
						'id'      => 'frontend_render',
						'type'    => 'select',
						'title'   => __( '渲染方式', 'newbee-markdown-editor' ),
						'options' => array(
							'server' => __( '服务端渲染（Parsedown，推荐：利于 SEO、无需前端 JS）', 'newbee-markdown-editor' ),
							'client' => __( '浏览器渲染（ByteMD Viewer，与编辑器预览完全一致）', 'newbee-markdown-editor' ),
							'none'   => __( '不渲染（按纯文本段落输出）', 'newbee-markdown-editor' ),
						),
						'desc'    => __( '两种方式的差异：服务端更快更利于收录；浏览器端能 100% 复现 ByteMD 预览（含 Mermaid / KaTeX）。', 'newbee-markdown-editor' ),
					),
					array(
						'id'      => 'frontend_theme',
						'type'    => 'select',
						'title'   => __( '正文配色', 'newbee-markdown-editor' ),
						'options' => array(
							'auto'  => __( '自动（跟随访问者的系统偏好）', 'newbee-markdown-editor' ),
							'light' => __( '始终浅色', 'newbee-markdown-editor' ),
							'dark'  => __( '始终深色', 'newbee-markdown-editor' ),
						),
					),
					array(
						'id'    => 'allow_raw_html',
						'type'  => 'checkbox',
						'title' => __( '允许 Markdown 中的原始 HTML', 'newbee-markdown-editor' ),
						'desc'  => __( '不勾选时启用 Parsedown 安全模式，raw HTML 会被转义（拥有 unfiltered_html 权限的用户始终允许）。', 'newbee-markdown-editor' ),
					),
					array(
						'id'    => 'frontend_math',
						'type'  => 'checkbox',
						'title' => __( '前端渲染数学公式（KaTeX）', 'newbee-markdown-editor' ),
						'desc'  => __( '服务端渲染模式下，页面中出现 $…$ / $$…$$ 时才加载插件内置的 KaTeX 资源。', 'newbee-markdown-editor' ),
					),
					array(
						'id'    => 'frontend_mermaid',
						'type'  => 'checkbox',
						'title' => __( '前端渲染 Mermaid 图表', 'newbee-markdown-editor' ),
						'desc'  => __( '页面中出现 ```mermaid 代码块时才加载插件内置的 Mermaid（约 3.3 MB，不占用普通页面）。', 'newbee-markdown-editor' ),
					),
					array(
						'id'    => 'enable_shortcode',
						'type'  => 'checkbox',
						'title' => __( '启用 [bytemd] 短代码', 'newbee-markdown-editor' ),
						'desc'  => __( '可在任意文章/页面中用 [bytemd]…[/bytemd] 包裹 Markdown 片段。', 'newbee-markdown-editor' ),
					),
					array(
						'id'    => 'strip_markdown_excerpt',
						'type'  => 'checkbox',
						'title' => __( '自动剥离摘要中的 Markdown 标记', 'newbee-markdown-editor' ),
						'desc'  => __( '列表页/搜索页的摘要不再出现 ##、[]() 之类的语法符号。', 'newbee-markdown-editor' ),
					),
				),
			),
			'advanced' => array(
				'title'  => __( '关于外部资源', 'newbee-markdown-editor' ),
				'intro'  => __( '本插件不向任何第三方服务器发起请求：ByteMD、highlight.js、KaTeX、Mermaid 全部随插件打包，仅在实际用到时才加载对应文件。所谓「高级设置」在这里没有存在的必要。', 'newbee-markdown-editor' ),
				'fields' => array(),
			),
		);
	}

	/**
	 * Register the option, sections and fields.
	 *
	 * @return void
	 */
	public function register_settings() {
		register_setting(
			self::GROUP,
			WP_ByteMD_Options::OPTION,
			array(
				'type'              => 'array',
				'description'       => __( 'ByteMD 集成设置', 'newbee-markdown-editor' ),
				'sanitize_callback' => array( $this, 'sanitize' ),
				'default'           => WP_ByteMD_Options::defaults(),
				'show_in_rest'      => false,
			)
		);

		foreach ( $this->fields() as $section_id => $section ) {
			add_settings_section(
				'wp_bytemd_' . $section_id,
				$section['title'],
				function () use ( $section ) {
					if ( ! empty( $section['intro'] ) ) {
						printf( '<p class="description">%s</p>', esc_html( $section['intro'] ) );
					}
				},
				self::PAGE
			);

			foreach ( $section['fields'] as $field ) {
				add_settings_field(
					'wp_bytemd_' . $field['id'],
					esc_html( $field['title'] ),
					array( $this, 'render_field' ),
					self::PAGE,
					'wp_bytemd_' . $section_id,
					$field
				);
			}
		}
	}

	/**
	 * Render a single field.
	 *
	 * @param array $field Field definition.
	 * @return void
	 */
	public function render_field( $field ) {
		$options = WP_ByteMD_Options::all();
		$id      = $field['id'];
		$name    = WP_ByteMD_Options::OPTION . '[' . $id . ']';
		$value   = isset( $options[ $id ] ) ? $options[ $id ] : null;

		switch ( $field['type'] ) {
			case 'checkbox':
				printf(
					'<label><input type="checkbox" name="%s" value="1" %s /> %s</label>',
					esc_attr( $name ),
					checked( (bool) $value, true, false ),
					esc_html__( '启用', 'newbee-markdown-editor' )
				);
				break;

			case 'number':
				printf(
					'<input type="number" class="small-text" name="%s" value="%s" min="%d" max="%d" step="10" />',
					esc_attr( $name ),
					esc_attr( (string) $value ),
					(int) ( isset( $field['min'] ) ? $field['min'] : 240 ),
					(int) ( isset( $field['max'] ) ? $field['max'] : 2000 )
				);
				break;

			case 'text':
				printf(
					'<input type="text" class="regular-text code" name="%s" value="%s" />',
					esc_attr( $name ),
					esc_attr( (string) $value )
				);
				break;

			case 'select':
				printf( '<select name="%s">', esc_attr( $name ) );
				foreach ( $field['options'] as $key => $label ) {
					printf(
						'<option value="%s" %s>%s</option>',
						esc_attr( $key ),
						selected( (string) $value, (string) $key, false ),
						esc_html( $label )
					);
				}
				echo '</select>';
				break;

			case 'post_types':
				$post_types = get_post_types( array( 'show_ui' => true ), 'objects' );
				unset( $post_types['attachment'] );
				$selected = (array) $value;

				echo '<fieldset>';
				foreach ( $post_types as $slug => $object ) {
					printf(
						'<label style="display:block;margin-bottom:4px"><input type="checkbox" name="%s[]" value="%s" %s /> %s <code>%s</code></label>',
						esc_attr( $name ),
						esc_attr( $slug ),
						checked( in_array( $slug, $selected, true ), true, false ),
						esc_html( $object->labels->name ),
						esc_html( $slug )
					);
				}
				echo '</fieldset>';
				break;

			case 'plugins':
				echo '<fieldset>';
				foreach ( $field['options'] as $slug => $label ) {
					printf(
						'<label style="display:block;margin-bottom:4px"><input type="checkbox" name="%s[%s]" value="1" %s /> %s</label>',
						esc_attr( $name ),
						esc_attr( $slug ),
						checked( ! empty( $value[ $slug ] ), true, false ),
						esc_html( $label )
					);
				}
				echo '</fieldset>';
				break;
		}

		if ( ! empty( $field['desc'] ) ) {
			printf( '<p class="description">%s</p>', wp_kses_post( $field['desc'] ) );
		}
	}

	/**
	 * Sanitise every submitted value.
	 *
	 * @param mixed $input Raw input.
	 * @return array
	 */
	public function sanitize( $input ) {
		$defaults = WP_ByteMD_Options::defaults();

		if ( ! is_array( $input ) ) {
			return $defaults;
		}

		$out = array();

		// --- Post types -------------------------------------------------.
		$valid_types = array_keys( get_post_types( array( 'show_ui' => true ), 'names' ) );
		$out['post_types'] = array();
		if ( isset( $input['post_types'] ) && is_array( $input['post_types'] ) ) {
			foreach ( $input['post_types'] as $type ) {
				$type = sanitize_key( $type );
				if ( in_array( $type, $valid_types, true ) ) {
					$out['post_types'][] = $type;
				}
			}
		}
		if ( empty( $out['post_types'] ) ) {
			$out['post_types'] = array( 'post' );
		}

		// --- Booleans ---------------------------------------------------
		$booleans = array(
			'classic_takeover',
			'force_classic',
			'enable_block',
			'allow_raw_html',
			'frontend_math',
			'frontend_mermaid',
			'enable_shortcode',
			'strip_markdown_excerpt',
		);
		foreach ( $booleans as $key ) {
			$out[ $key ] = empty( $input[ $key ] ) ? 0 : 1;
		}

		// --- Editor plugins --------------------------------------------
		$out['plugins'] = array();
		foreach ( array_keys( WP_ByteMD_Options::available_plugins() ) as $slug ) {
			$out['plugins'][ $slug ] = ( ! empty( $input['plugins'][ $slug ] ) ) ? 1 : 0;
		}

		// --- Enumerations ----------------------------------------------
		$out['editor_mode'] = in_array(
			isset( $input['editor_mode'] ) ? $input['editor_mode'] : '',
			array( 'split', 'tab', 'auto' ),
			true
		) ? $input['editor_mode'] : $defaults['editor_mode'];

		$out['frontend_render'] = in_array(
			isset( $input['frontend_render'] ) ? $input['frontend_render'] : '',
			array( 'server', 'client', 'none' ),
			true
		) ? $input['frontend_render'] : $defaults['frontend_render'];

		$out['theme'] = in_array(
			isset( $input['theme'] ) ? $input['theme'] : '',
			array( 'auto', 'light', 'dark' ),
			true
		) ? $input['theme'] : $defaults['theme'];

		$out['frontend_theme'] = $out['theme'];

		$out['locale'] = in_array(
			isset( $input['locale'] ) ? $input['locale'] : '',
			array( 'auto', 'zh_Hans', 'en' ),
			true
		) ? $input['locale'] : 'auto';

		// --- Scalars ----------------------------------------------------
		$out['editor_height'] = max( 240, min( 2000, absint( isset( $input['editor_height'] ) ? $input['editor_height'] : $defaults['editor_height'] ) ) );

		// Options that previous versions exposed for CDN overrides. They are
		// gone in 1.1.0 because all runtime assets ship with the plugin; drop
		// them so a stale value can never linger in the database.
		unset( $out['cdn_base'], $out['katex_version'], $out['mermaid_version'] );

		/**
		 * Filter the sanitised settings before saving.
		 *
		 * @param array $out   Sanitised values.
		 * @param array $input Raw input.
		 */
		return apply_filters( 'wp_bytemd_sanitize_settings', array_merge( $defaults, $out ), $input );
	}

	/**
	 * Settings page markup.
	 *
	 * @return void
	 */
	public function render_page() {
		if ( ! current_user_can( self::CAPABILITY ) ) {
			return;
		}
		?>
		<div class="wrap wp-bytemd-settings">
			<h1><?php esc_html_e( 'ByteMD 集成设置', 'newbee-markdown-editor' ); ?></h1>
			<p class="description">
				<?php
				printf(
					/* translators: 1: ByteMD version, 2: plugin version */
					esc_html__( '编辑器内核 ByteMD %1$s（已打包，无需 CDN）；插件版本 %2$s。', 'newbee-markdown-editor' ),
					esc_html( WP_BYTEMD_BYTEMD_VERSION ),
					esc_html( WP_BYTEMD_VERSION )
				);
				?>
			</p>

			<?php $this->render_diagnostics(); ?>

			<form action="options.php" method="post">
				<?php
				settings_fields( self::GROUP );
				do_settings_sections( self::PAGE );
				submit_button();
				?>
			</form>
		</div>
		<?php
	}

	/**
	 * Diagnostics panel: is everything actually in place?
	 *
	 * @return void
	 */
	private function render_diagnostics() {
		$manifest_path = WP_BYTEMD_DIR . 'assets/vendor/MANIFEST.json';
		$manifest      = null;

		if ( file_exists( $manifest_path ) ) {
			$decoded = json_decode( (string) file_get_contents( $manifest_path ), true ); // phpcs:ignore WordPress.WP.AlternativeFunctions
			if ( is_array( $decoded ) ) {
				$manifest = $decoded;
			}
		}

		/**
		 * Describe one bundled runtime file.
		 *
		 * @param string $file    File name inside `assets/vendor/`.
		 * @param string $missing Message to show when the file is absent.
		 * @return string
		 */
		$describe = static function ( $file, $missing ) {
			$path = WP_BYTEMD_DIR . 'assets/vendor/' . $file;

			if ( ! file_exists( $path ) ) {
				return $missing;
			}

			return sprintf(
				'%s — %s KB',
				$file,
				number_format_i18n( round( filesize( $path ) / 1024, 1 ), 1 )
			);
		};

		$rows = array(
			__( 'WordPress 版本', 'newbee-markdown-editor' )      => get_bloginfo( 'version' ),
			__( 'PHP 版本', 'newbee-markdown-editor' )            => PHP_VERSION,
			__( 'ByteMD 内核', 'newbee-markdown-editor' )         => $manifest && ! empty( $manifest['bytemd'] ) ? $manifest['bytemd'] : WP_BYTEMD_BYTEMD_VERSION,
			__( '编辑器资源', 'newbee-markdown-editor' )          => $describe( 'bytemd-editor.js', __( '缺失（请执行 npm run build）', 'newbee-markdown-editor' ) ),
			__( '前端渲染资源', 'newbee-markdown-editor' )        => $describe( 'bytemd-viewer.js', __( '缺失（仅影响浏览器渲染模式）', 'newbee-markdown-editor' ) ),
			__( 'KaTeX 资源', 'newbee-markdown-editor' )          => $describe( 'bytemd-katex.js', __( '缺失（公式不会在前端渲染）', 'newbee-markdown-editor' ) ),
			__( 'Mermaid 资源', 'newbee-markdown-editor' )        => $describe( 'bytemd-mermaid.js', __( '缺失（图表不会在前端渲染）', 'newbee-markdown-editor' ) ),
			__( 'Parsedown', 'newbee-markdown-editor' )           => file_exists( WP_BYTEMD_DIR . 'vendor/parsedown/Parsedown.php' )
				? __( '已就绪（服务端渲染可用）', 'newbee-markdown-editor' )
				: __( '缺失（将退化为纯文本输出）', 'newbee-markdown-editor' ),
			__( '区块编辑器', 'newbee-markdown-editor' )          => WP_ByteMD_Options::is_on( 'force_classic' )
				? __( '已对启用的内容类型关闭', 'newbee-markdown-editor' )
				: __( '保持启用', 'newbee-markdown-editor' ),
			__( 'Markdown 文章数', 'newbee-markdown-editor' )     => (string) $this->count_markdown_posts(),
		);
		?>
		<div class="card" style="max-width:100%;margin:16px 0 24px">
			<h2><?php esc_html_e( '运行状态', 'newbee-markdown-editor' ); ?></h2>
			<table class="widefat striped" style="max-width:820px">
				<tbody>
				<?php foreach ( $rows as $label => $value ) : ?>
					<tr>
						<th style="width:180px"><?php echo esc_html( $label ); ?></th>
						<td><?php echo esc_html( $value ); ?></td>
					</tr>
				<?php endforeach; ?>
				</tbody>
			</table>
			<?php if ( $manifest && ! empty( $manifest['dependencies'] ) ) : ?>
				<p class="description" style="margin-top:10px">
					<?php
					$pairs = array();
					foreach ( $manifest['dependencies'] as $name => $version ) {
						$pairs[] = $name . '@' . $version;
					}
					echo esc_html( implode( ' · ', $pairs ) );
					?>
				</p>
			<?php endif; ?>
		</div>
		<?php
	}

	/**
	 * Number of posts flagged as Markdown.
	 *
	 * @return int
	 */
	private function count_markdown_posts() {
		$query = new WP_Query(
			array(
				'post_type'      => WP_ByteMD_Options::enabled_post_types(),
				'post_status'    => array( 'publish', 'draft', 'pending', 'future', 'private' ),
				'posts_per_page' => 1,
				'fields'         => 'ids',
				'no_found_rows'  => false,
				'meta_query'     => array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query
					array(
						'key'   => WP_ByteMD_Options::META_MARKDOWN,
						'value' => '1',
					),
				),
			)
		);

		return (int) $query->found_posts;
	}
}
