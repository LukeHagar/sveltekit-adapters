import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	logLevel: 'info',
	plugins: [sveltekit()]
});
