import { mdsvex } from 'mdsvex';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeSlug from 'rehype-slug';
import remarkFootnotes from 'remark-footnotes';
import remarkGfm from 'remark-gfm';
import remarkSupersub from 'remark-supersub';
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: [
		vitePreprocess(),
		mdsvex({
			extensions: ['.md', '.svx'],
			remarkPlugins: [remarkFootnotes, remarkGfm, remarkSupersub],
			rehypePlugins: [
				rehypeSlug,
				[
					rehypeAutolinkHeadings,
					{
						behavior: 'append',
						properties: {
							className: ['heading-anchor']
						},
						content: {
							type: 'text',
							value: ' #'
						}
					}
				]
			]
		})
	],
	kit: {
		adapter: adapter(),
		paths: {
			base: process.env.BASE_PATH ?? ''
		},
		prerender: {
			handleHttpError: ({ path, referrer, message }) => {
				// Les tags qui n'existent que dans Zotero ne doivent pas faire échouer le build
				// si Zotero est inaccessible depuis GitHub Actions
				if (path.startsWith('/tags/')) {
					console.warn(`[prerender] tag introuvable : ${path} (lié depuis ${referrer})`);
					return;
				}
				throw new Error(message);
			}
		}
	},
	extensions: ['.svelte', '.svx', '.md']
};

export default config;