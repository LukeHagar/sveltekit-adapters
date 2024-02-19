import { defineConfig, defineViteConfig } from 'electron-vite';
import config from './vite.config';

export default defineConfig({
	main: defineViteConfig({}),
	preload: defineViteConfig({}),
	renderer: config
});
