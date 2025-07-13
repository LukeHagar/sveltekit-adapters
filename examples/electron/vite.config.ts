import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { electronPlugin } from 'adapter-electron';

export default defineConfig({
	plugins: [
		sveltekit(),
		electronPlugin({
			// The plugin will auto-detect src/main.ts and src/preload.ts
			// You can override these paths if needed:
			// mainEntry: 'src/main.ts',
			// preloadEntry: 'src/preload.ts',
			// mainOut: 'out/main/index.js',
			// preloadOut: 'out/preload/index.js'
		})
	]
});
