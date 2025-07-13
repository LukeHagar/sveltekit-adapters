import type { Adapter } from '@sveltejs/kit';

export interface AdapterOptions {
  /**
   * Output directory for the Electron app
   * @default 'out'
   */
  out?: string;
  
  /**
   * Directory name for the protocol handler functions
   * @default 'functions'
   */
  functions?: string;

  /**
   * Whether to precompress static assets
   * @default false
   */
  precompress?: boolean;
}

/**
 * SvelteKit adapter for Electron desktop apps
 * 
 * This adapter:
 * 1. Builds the SvelteKit app using the static adapter for client assets
 * 2. Copies server files for SSR support
 * 3. Copies prerendered pages
 * 4. Provides a native Electron protocol handler that bypasses HTTP servers
 * 5. Outputs a complete Electron app structure ready for packaging
 */
declare function adapter(options?: AdapterOptions): Adapter;

export default adapter;

export interface ElectronPluginOptions {
  mainEntry?: string;
  preloadEntry?: string;
  mainOut?: string;
  preloadOut?: string;
  externalMain?: string[];
  externalPreload?: string[];
}

/**
 * Vite plugin to build Electron main/preload files
 */
export declare function electronPlugin(options?: ElectronPluginOptions): any;
