/**
 * Client-side half of the dsh-file-preview plugin.
 *
 * Runs in the browser via window.__ModuleLoader__. Registers a component in
 * the `details` slot that shows file previews. Right-click any file mention
 * button in the chat to open the context menu and select "在右侧预览".
 */
window.__ModuleLoader__.load({
	id: "dsh-file-preview",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");
		let primitives = require("@deepseek-ai/dsh-client-ui-primitives");

		const { useState, useEffect, useRef, useCallback, useMemo } = react;
		const jsx = react_jsx_runtime.jsx;
		const jsxs = react_jsx_runtime.jsxs;
		const { CodeBlock, IconCloseOutline16 } = primitives;

		// ── module-level preview state ──────────────────────────────────────
		const previewState = {
			path: null,
			content: null,
			type: null,
			lang: null,
			error: null,
			loading: false
		};

		function resolveWorkspacePath(cwd, path) {
			if (path.startsWith('/') || /^[A-Za-z]:[/\\]/.test(path) || path.startsWith('\\\\')) return path;
			if (!cwd) return path;
			return `${cwd.replace(/[/\\]+$/, '')}/${path.replace(/^[/\\]+/, '')}`;
		}

		/** Detect a file-mention button: <button> directly inside <code>, inside a chat message. */
		function isFileMentionButton(btn) {
			const code = btn.closest('code');
			if (!code) return false;
			// Must be inside the conversation flow area
			const flow = btn.closest('[data-chat-anchor-key], [data-chat-flow-kind]');
			if (!flow) return false;
			// Button text should look like a file path (contains dot or slash, bounded length)
			const text = (btn.textContent || '').trim();
			if (text.length === 0 || text.length > 300) return false;
			return text.includes('.') || text.includes('/') || text.includes('\\');
		}

		/** Load file content from the host endpoint. */
		async function loadFile(path) {
			try {
				const encoded = encodeURIComponent(path);
				const response = await fetch(`/api/file.read?path=${encoded}`);
				const result = await response.json();
				if (result.ok) {
					previewState.content = result.dataUrl ?? result.content;
					previewState.type = result.type;
					previewState.lang = result.lang;
					previewState.error = null;
				} else {
					previewState.content = null;
					previewState.type = null;
					previewState.lang = null;
					previewState.error = result.error || 'Unknown error';
				}
			} catch (e) {
				previewState.content = null;
				previewState.type = null;
				previewState.lang = null;
				previewState.error = e.message || String(e);
			}
			previewState.loading = false;
		}

		function FilePreviewContent({ path, content, type, lang, error, loading, t }) {
			if (loading) {
				return jsx('div', {
					style: { padding: '24px', color: 'var(--dsw-alias-label-tertiary)', textAlign: 'center' },
					children: t('filePreview.loading')
				});
			}
			if (error) {
				return jsxs('div', {
					style: { padding: '16px' },
					children: [
						jsx('div', {
							style: { color: 'var(--dsw-alias-state-error-primary)', marginBottom: '8px', fontSize: '14px' },
							children: t('filePreview.error')
						}),
						jsx('div', {
							style: { color: 'var(--dsw-alias-label-secondary)', fontSize: '13px', wordBreak: 'break-all' },
							children: error
						})
					]
				});
			}
			if (type === 'image') {
				return jsx('div', {
					style: { padding: '16px', overflow: 'auto', height: '100%' },
					children: jsx('img', {
						src: content,
						alt: path,
						style: { maxWidth: '100%', display: 'block', margin: '0 auto' }
					})
				});
			}
			if (type === 'pdf') {
				return jsx('div', {
					style: { padding: '16px', height: '100%', display: 'flex', flexDirection: 'column' },
					children: jsx('iframe', {
						src: content,
						style: { flex: 1, width: '100%', border: 'none' },
						title: t('filePreview.pdfTitle')
					})
				});
			}
			// Text
			return jsxs('div', {
				style: { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' },
				children: [
					jsx('div', {
						style: {
							padding: '8px 16px',
							borderBottom: '1px solid var(--dsw-alias-border-l1)',
							fontSize: '12px',
							color: 'var(--dsw-alias-label-secondary)',
							overflow: 'hidden',
							textOverflow: 'ellipsis',
							whiteSpace: 'nowrap',
							flexShrink: 0
						},
						children: path
					}),
					jsx(CodeBlock, {
						code: content,
						lang: lang,
						className: 'file-preview-code',
						copyLabel: t('filePreview.copy'),
						copiedLabel: t('filePreview.copied')
					})
				]
			});
		}

		/** The details-panel entry: shows a file preview when one is pending. */
		function DetailsView({ useSession, useSessions, sessionId, useStore, renderSlot, closeDetails, t }) {
			const [menuPos, setMenuPos] = useState(null);
			const containerRef = useRef(null);

			const currentSessionId = useSessions((s) => s.current);
			const sessionCwd = useSessions((s) => (s.current === undefined ? undefined : s.byId[s.current]?.cwd));

			const previewPath = previewState.path;

			// Right-click detection on file mention buttons inside the chat flow
			useEffect(() => {
				const el = containerRef.current;
				if (!el) return;

				const onContextMenu = (e) => {
					const target = e.target;
					if (!target || target.tagName !== 'BUTTON') return;
					if (!isFileMentionButton(target)) return;

					e.preventDefault();
					e.stopPropagation();

					const filePath = (target.textContent || '').trim();
					if (!filePath) return;

					const resolved = resolveWorkspacePath(sessionCwd, filePath);
					previewState.path = resolved;
					previewState.content = null;
					previewState.type = null;
					previewState.lang = null;
					previewState.error = null;
					previewState.loading = true;

					setMenuPos({ x: e.clientX, y: e.clientY });
				};

				el.addEventListener('contextmenu', onContextMenu, true);
				return () => el.removeEventListener('contextmenu', onContextMenu, true);
			}, [sessionCwd]);

			// Locate the conversation scroll container (re-run when session changes)
			useEffect(() => {
				const container = document.querySelector('[data-conversation-scroll]');
				if (container) {
					containerRef.current = container;
				}
			}, [currentSessionId]);

			// Load content when path changes
			useEffect(() => {
				if (!previewState.path) return;
				previewState.loading = true;
				loadFile(previewState.path);
			}, [previewState.path]);

			// Click outside closes the menu
			useEffect(() => {
				if (!menuPos) return;
				const handler = (e) => {
					if (e.target.closest && e.target.closest('[data-dsh-file-menu]')) return;
					setMenuPos(null);
				};
				document.addEventListener('click', handler);
				return () => document.removeEventListener('click', handler);
			}, [menuPos]);

			const ContextMenu = menuPos ? jsx('div', {
				'data-dsh-file-menu': 'true',
				style: {
					position: 'fixed',
					left: menuPos.x,
					top: menuPos.y,
					background: 'var(--dsw-alias-bg-surface)',
					border: '1px solid var(--dsw-alias-border-l1)',
					borderRadius: '8px',
					boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
					padding: '4px 0',
					zIndex: 10000,
					minWidth: '180px'
				},
				children: jsx('button', {
					type: 'button',
					style: {
						display: 'block',
						width: '100%',
						padding: '8px 16px',
						background: 'none',
						border: 'none',
						textAlign: 'left',
						cursor: 'pointer',
						fontSize: '14px',
						color: 'var(--dsw-alias-label-primary)'
					},
					onMouseEnter: (e) => { e.currentTarget.style.background = 'var(--dsw-alias-interactive-bg-hover)'; },
					onMouseLeave: (e) => { e.currentTarget.style.background = 'none'; },
					onClick: () => {
						setMenuPos(null);
						// previewState is already set; DetailsView re-renders and shows the preview
					},
					children: t('filePreview.contextMenu')
				})
			}) : null;

			return jsxs('div', {
				className: 'dsh-file-preview-panel',
				style: {
					borderLeft: '1px solid var(--dsw-alias-border-l2)',
					background: 'var(--dsw-alias-bg-base)',
					flexDirection: 'column',
					minWidth: '0',
					height: '100%',
					display: 'flex',
					position: 'relative'
				},
				children: [
					ContextMenu,
					jsxs('div', {
						style: {
							borderBottom: '1px solid var(--dsw-alias-border-l2)',
							justifyContent: 'space-between',
							alignItems: 'center',
							gap: '8px',
							padding: '14px 12px 12px',
							display: 'flex',
							flexShrink: '0'
						},
						children: [
							jsx('div', {
								style: {
									color: 'var(--dsw-alias-label-primary)',
									fontSize: '14px',
									fontWeight: '500',
									lineHeight: '20px',
									overflow: 'hidden',
									textOverflow: 'ellipsis',
									whiteSpace: 'nowrap',
									flex: 1
								},
								children: previewPath
									? jsx('span', { children: String(previewPath).split(/[\\/]/).pop() || previewPath })
									: t('filePreview.title')
							}),
							previewPath && jsx('button', {
								type: 'button',
								'aria-label': t('filePreview.close'),
								style: {
									width: '28px',
									height: '28px',
									color: 'var(--dsw-alias-label-secondary)',
									cursor: 'pointer',
									background: 'none',
									border: 'none',
									borderRadius: '999px',
									display: 'grid',
									placeItems: 'center',
									flex: 'none'
								},
								onMouseEnter: (e) => { e.currentTarget.style.background = 'var(--dsw-alias-interactive-bg-hover)'; },
								onMouseLeave: (e) => { e.currentTarget.style.background = 'none'; },
								onClick: () => {
									previewState.path = null;
									previewState.content = null;
									previewState.type = null;
									previewState.lang = null;
									previewState.error = null;
									previewState.loading = false;
									setMenuPos(null);
									closeDetails();
								},
								children: jsx(IconCloseOutline16, { size: 16 })
							})
						]
					}),
					jsxs('div', {
						ref: containerRef,
						style: {
							flex: 1,
							minHeight: 0,
							padding: '12px 16px',
							overflowY: 'auto'
						},
						children: [
							!previewPath ? jsx('div', {
								style: { color: 'var(--dsw-alias-label-tertiary)', padding: '8px 0', fontSize: '13px', lineHeight: '20px' },
								children: t('filePreview.empty')
							}) : jsx(FilePreviewContent, {
								path: previewState.path,
								content: previewState.content,
								type: previewState.type,
								lang: previewState.lang,
								error: previewState.error,
								loading: previewState.loading,
								t
							})
						]
					})
				]
			});
		}

		const NS = 'file-preview';
		const inject = ['slots', 'layout', 'sessions', 'locale'];

		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh: {
					'filePreview.title': '文件预览',
					'filePreview.close': '关闭预览',
					'filePreview.loading': '正在读取文件...',
					'filePreview.error': '无法读取文件',
					'filePreview.empty': '在对话中右键点击文件路径，选择"在右侧预览"',
					'filePreview.copy': '复制',
					'filePreview.copied': '已复制',
					'filePreview.pdfTitle': 'PDF 预览',
					'filePreview.contextMenu': '在右侧预览',
				},
				en: {
					'filePreview.title': 'File Preview',
					'filePreview.close': 'Close preview',
					'filePreview.loading': 'Reading file...',
					'filePreview.error': 'Cannot read file',
					'filePreview.empty': 'Right-click a file path in chat and select "Preview in right panel"',
					'filePreview.copy': 'Copy',
					'filePreview.copied': 'Copied',
					'filePreview.pdfTitle': 'PDF preview',
					'filePreview.contextMenu': 'Preview in right panel',
				}
			}), 'dsh-file-preview: locale');

			const t = ctx.locale.bind(NS);

			ctx.slots.inject('details', () => ctx.slots.register({
				name: 'details',
				locale: NS,
				inject: (sessionId, actions) => ({
					closeDetails: () => {
						actions.closeDetails();
					},
					t
				})
			}, DetailsView));
		}

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
