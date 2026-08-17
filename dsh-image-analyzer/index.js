/**
 * dsh-image-analyzer — auxiliary vision-model tool plugin.
 *
 * Registers the `analyze_image` tool. When the main (text-only) model needs to
 * understand an image, it calls this tool, which sends the image to a
 * configured vision-capable model (OpenAI-compatible chat/completions API) and
 * returns a text description.
 *
 * Defaults to the `agnes` provider (vision-capable) configured in the user's
 * settings. All settings can be overridden via the plugin `config`.
 */
import { readFile } from 'node:fs/promises';
import { basename, extname, isAbsolute, resolve } from 'node:path';
import { defineTool } from '@deepseek-ai/dsh-tools';
import { credentialRef } from '@deepseek-ai/dsh-credentials';
import z from '@deepseek-ai/schemastery';

const IMAGE_TYPES = {
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.webp': 'image/webp',
	'.gif': 'image/gif'
};

const DEFAULT_PROMPT = '请详细描述这张图片的内容，包括主体、场景、文字、颜色、布局等所有可观察到的细节。';

export const name = 'dsh-image-analyzer';

export const Config = z.object({
	/** OpenAI-compatible base URL of the vision model. */
	baseURL: z.string().default('https://apihub.agnes-ai.com/v1'),
	/** Vision model id. */
	model: z.string().default('agnes-2.5-flash'),
	/** Environment / credential-store name of the API key. */
	apiKeyEnv: z.string().default('AGNES_API_KEY'),
	/** Maximum image bytes accepted (default 10 MB). */
	maxBytes: z.natural().default(10 * 1024 * 1024)
});

export function apply(ctx, config) {
	const cfg = {
		baseURL: 'https://apihub.agnes-ai.com/v1',
		model: 'agnes-2.5-flash',
		apiKeyEnv: 'AGNES_API_KEY',
		maxBytes: 10 * 1024 * 1024,
		...config
	};

	ctx.tools.register(defineTool({
		name: 'analyze_image',
		description: '使用辅助视觉模型识别图片内容并返回文字描述。当用户要求查看、分析或描述一张图片时，调用此工具。参数 file_path 为图片路径（相对或绝对），prompt 为可选的识别要求。',
		parameters: {
			file_path: {
				type: 'string',
				required: true,
				description: '图片文件路径（PNG/JPG/WebP/GIF），相对路径基于会话工作目录。'
			},
			prompt: {
				type: 'string',
				description: '识别要求，例如"图片里有什么文字？"。缺省为详细描述。'
			}
		},
		output: {
			schema: {
				type: 'string',
				description: '视觉模型返回的图片文字描述。'
			}
		},
		isConcurrencySafe: () => true,
		async execute(args, exec) {
			const cwd = exec?.agent?.session?.header?.cwd ?? process.cwd();
			const requested = args.file_path;
			const abs = isAbsolute(requested) ? requested : resolve(cwd, requested);

			const ext = extname(abs).toLowerCase();
			const mime = IMAGE_TYPES[ext];
			if (mime === void 0) {
				throw new Error(`analyze_image: 不支持的文件类型 "${ext}"，仅支持 PNG/JPG/WebP/GIF`);
			}

			let buf;
			try {
				buf = await readFile(abs);
			} catch (e) {
				throw new Error(`analyze_image: 无法读取图片 ${abs}: ${e.message}`);
			}
			if (buf.length > cfg.maxBytes) {
				throw new Error(`analyze_image: 图片过大 (${buf.length} 字节, 上限 ${cfg.maxBytes})`);
			}

			const credentials = ctx.get('credentials');
			const resolved = credentials ? await credentials.resolve(credentialRef(cfg.apiKeyEnv)) : void 0;
			const apiKey = resolved?.value;
			if (!apiKey) {
				throw new Error(`analyze_image: 未找到 API key "${cfg.apiKeyEnv}"（请在凭据中配置）`);
			}

			const promptText = (args.prompt ?? DEFAULT_PROMPT).trim() || DEFAULT_PROMPT;
			const dataUrl = `data:${mime};base64,${buf.toString('base64')}`;

			let response;
			try {
				response = await fetch(`${cfg.baseURL.replace(/\/+$/, '')}/chat/completions`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${apiKey}`
					},
					body: JSON.stringify({
						model: cfg.model,
						messages: [{
							role: 'user',
							content: [
								{ type: 'text', text: promptText },
								{ type: 'image_url', image_url: { url: dataUrl } }
							]
						}],
						max_tokens: 2048
					}),
					signal: AbortSignal.timeout(90_000)
				});
			} catch (e) {
				throw new Error(`analyze_image: 调用视觉模型失败: ${e.message}`);
			}

			let data;
			try {
				data = await response.json();
			} catch {
				throw new Error(`analyze_image: 视觉模型返回了非 JSON 响应 (HTTP ${response.status})`);
			}

			if (!response.ok) {
				const msg = data?.error?.message ?? data?.message ?? `HTTP ${response.status}`;
				throw new Error(`analyze_image: 视觉模型错误: ${msg}`);
			}

			const content = data?.choices?.[0]?.message?.content;
			if (typeof content !== 'string' || content.trim().length === 0) {
				throw new Error('analyze_image: 视觉模型未返回内容');
			}

			return `## 图片分析（${basename(abs)}）\n${content}`;
		}
	}));

	return {};
}
