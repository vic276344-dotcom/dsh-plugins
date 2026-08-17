/**
 * Host-side (no-op) — the actual work happens in client.js which injects
 * a small CSS rule into the browser document to keep message timestamps visible
 * at all times (DSH hides them by default and only shows on hover).
 */
export const name = 'dsh-show-time';
export const inject = [];

export function apply(ctx) {
	// Host side does nothing — this package is here so the client bundle
	// can be scanned and loaded by dsh-client-modules.
	return {};
}
