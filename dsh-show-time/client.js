/**
 * Client-side half: injects one CSS rule so that message timestamps are
 * always visible instead of hidden (opacity: 0) until hover.
 *
 * The default DSH CSS hides timestamps via:
 *   [data-time-hover-root] :is(.p-xYUq_timeStart,.p-xYUq_timeEnd) { opacity: 0; }
 *   [data-time-hover-root]:hover ... { opacity: 1; }
 *
 * This plugin overrides both rules with opacity: 1 so timestamps are always shown.
 */
window.__ModuleLoader__.load({
	id: 'dsh-show-time',
	factory: () => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

		const CSS = `
/* Always show message timestamps — overrides DSH default hover-only behavior */
[data-time-hover-root] span[class*="timeStart"],
[data-time-hover-root] span[class*="timeEnd"] {
  opacity: 1 !important;
  transition: none !important;
}
[data-time-hover-root]:hover span[class*="timeStart"],
[data-time-hover-root]:hover span[class*="timeEnd"],
[data-time-hover-root]:focus-within span[class*="timeStart"],
[data-time-hover-root]:focus-within span[class*="timeEnd"] {
  opacity: 1 !important;
}
`;

		function injectCSS() {
			if (typeof document === 'undefined') return;
			const tagId = 'dsh-show-time-css';
			if (document.querySelector('style[data-plugin-timestamp-cpss=' + JSON.stringify(tagId) + ']')) return;
			const tag = document.createElement('style');
			tag.dataset.plugin = 'dsh-show-time';
			tag.dataset.pluginTimestampCss = tagId;
			tag.textContent = CSS;
			document.head.appendChild(tag);
		}

		// Inject immediately if DOM ready, otherwise wait
		if (typeof document !== 'undefined') {
			if (document.head) injectCSS();
			else new MutationObserver(() => {
				if (document.head) { injectCSS(); mutation.disconnect(); }
			}).observe(document.documentElement, { childList: true, subtree: true });
		}

		const inject = [];
		function apply() { return {}; }
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
