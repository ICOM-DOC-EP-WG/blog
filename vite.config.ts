import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [sveltekit()],
    server: {
        proxy: {
            '/sparql': {
                target: 'https://query.wikidata.org',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/sparql/, '/sparql')
            }
        }
    }
});