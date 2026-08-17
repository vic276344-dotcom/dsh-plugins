/**
 * Host-side half of the dsh-file-preview plugin.
 *
 * Registers an HTTP route at /api/file.read that reads file content from the
 * filesystem and returns it as JSON. The client-side half calls this endpoint
 * via fetch() to display file contents in the right panel.
 */
import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { URL } from 'node:url';

const BINARY_THRESHOLD = 8192;
const MAX_PREVIEW_BYTES = 2 * 1024 * 1024; // 2 MB limit

function isBinary(buffer) {
	if (buffer.length === 0) return false;
	const sample = buffer.slice(0, Math.min(BINARY_THRESHOLD, buffer.length));
	return sample.includes(0);
}

function langFromExt(path) {
	const ext = extname(path).toLowerCase();
	const map = {
		'.js': 'javascript', '.mjs': 'javascript', '.cjs': 'javascript',
		'.ts': 'typescript', '.tsx': 'typescript', '.mts': 'typescript', '.cts': 'typescript',
		'.py': 'python', '.rb': 'ruby', '.go': 'go', '.rs': 'rust',
		'.java': 'java', '.c': 'c', '.cpp': 'cpp', '.h': 'c', '.hpp': 'cpp',
		'.php': 'php', '.swift': 'swift', '.kt': 'kotlin',
		'.sh': 'bash', '.bash': 'bash', '.zsh': 'bash',
		'.json': 'json', '.jsonc': 'json', '.yaml': 'yaml', '.yml': 'yaml',
		'.toml': 'toml', '.ini': 'ini', '.cfg': 'ini',
		'.md': 'markdown', '.markdown': 'markdown', '.mdx': 'mdx',
		'.html': 'html', '.htm': 'html', '.xhtml': 'html',
		'.css': 'css', '.scss': 'scss', '.less': 'less',
		'.sql': 'sql', '.xml': 'xml', '.svg': 'xml',
		'.lua': 'lua', '.r': 'r', '.R': 'r',
		'.vue': 'html',
		'.graphql': 'graphql', '.gql': 'graphql',
	};
	return map[ext] || undefined;
}

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg', '.ico', '.tiff', '.tif']);

export const name = 'dsh-file-preview';
export const inject = ['webServer'];

export async function apply(ctx) {
	ctx.effect(() => {
		const webServer = ctx.get('webServer');
		if (!webServer) {
			console.warn('[dsh-file-preview] webServer service not available, file preview will not work');
			return () => {};
		}

		return webServer.register({
			kind: 'exact',
			path: '/api/file.read',
			handler: async (req, res) => {
				if (req.method !== 'GET') {
					res.writeHead(405, { 'Content-Type': 'application/json' });
					res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }));
					return;
				}

				const url = new URL(`http://localhost${req.url}`);
				const filePath = url.searchParams.get('path');

				if (!filePath || typeof filePath !== 'string') {
					res.writeHead(400, { 'Content-Type': 'application/json' });
					res.end(JSON.stringify({ ok: false, error: 'path parameter is required' }));
					return;
				}

				let absolutePath;
				try {
					absolutePath = resolve(filePath);
				} catch (e) {
					res.writeHead(400, { 'Content-Type': 'application/json' });
					res.end(JSON.stringify({ ok: false, error: `Invalid path: ${e.message}` }));
					return;
				}

				let buf;
				try {
					buf = await readFile(absolutePath);
				} catch (e) {
					res.writeHead(404, { 'Content-Type': 'application/json' });
					res.end(JSON.stringify({ ok: false, error: e.message || String(e) }));
					return;
				}

				if (buf.length > MAX_PREVIEW_BYTES) {
					res.writeHead(413, { 'Content-Type': 'application/json' });
					res.end(JSON.stringify({
						ok: false,
						error: `File too large (${buf.length} bytes, max ${MAX_PREVIEW_BYTES})`
					}));
					return;
				}

				const fileExt = extname(filePath);

				if (IMAGE_EXTENSIONS.has(fileExt.toLowerCase())) {
					const mimeBase = fileExt.toLowerCase().replace('.', '');
					const mimeType = fileExt.toLowerCase() === '.svg' ? 'image/svg+xml' : `image/${mimeBase}`;
					res.writeHead(200, { 'Content-Type': 'application/json' });
					res.end(JSON.stringify({
						ok: true,
						type: 'image',
						mimeType,
						dataUrl: `data:${mimeType};base64,${buf.toString('base64')}`
					}));
					return;
				}

				if (fileExt.toLowerCase() === '.pdf') {
					res.writeHead(200, { 'Content-Type': 'application/json' });
					res.end(JSON.stringify({
						ok: true,
						type: 'pdf',
						dataUrl: `data:application/pdf;base64,${buf.toString('base64')}`
					}));
					return;
				}

				if (isBinary(buf)) {
					res.writeHead(400, { 'Content-Type': 'application/json' });
					res.end(JSON.stringify({
						ok: false,
						error: `Binary file (${buf.length} bytes)`
					}));
					return;
				}

				const content = buf.toString('utf8');
				res.writeHead(200, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify({
					ok: true,
					type: 'text',
					lang: langFromExt(filePath),
					content,
					path: absolutePath
				}));
			}
		});
	});

	return {};
}
