# @sveltejs/adapter-electron

A SvelteKit adapter for Electron desktop apps that uses native protocol handling for production and seamless Vite dev server integration for development.

## Features

- ✅ **Native Protocol Handling**: Uses Electron's `protocol.handle()` API for production
- ✅ **Development Integration**: Seamless Vite dev server integration with HMR
- ✅ **No HTTP Server**: Bypasses Node.js HTTP servers entirely in production
- ✅ **Full SvelteKit Support**: SSR, API routes, static assets, prerendered pages, form actions
- ✅ **Clean Architecture**: All Electron integration code is encapsulated
- ✅ **Production Ready**: Works with electron-builder and similar tools
- ✅ **TypeScript Support**: Full type definitions included
- ✅ **Proper Error Handling**: User-friendly error reporting with GitHub issue links

## Installation

```bash
npm install adapter-electron
```

## Quick Start

### 1. Configure SvelteKit

In your `svelte.config.js`:

```js
import adapter from 'adapter-electron';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter()
	}
};

export default config;
```

### 2. Set up Vite Configuration

In your `vite.config.ts`:

```ts
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { electronPlugin } from 'adapter-electron';

export default defineConfig({
	plugins: [
		sveltekit(),
		electronPlugin({
			// Auto-detects src/main.ts and src/preload.ts by default
			// Override paths if needed:
			// mainEntry: 'src/main.ts',        // Main process entry (default: 'src/main.ts')
			// preloadEntry: 'src/preload.ts',  // Preload script entry (default: 'src/preload.ts')
			// mainOut: 'out/main/index.js',    // Main output (default: 'out/main/index.js')
			// preloadOut: 'out/preload/index.js' // Preload output (default: 'out/preload/index.js')
		})
	]
});
```

### 3. Create Electron Main Process

Create `src/main.ts`:

```ts
import { app, BrowserWindow } from 'electron';
import { setupHandler, getPreloadPath, registerAppScheme } from 'adapter-electron/functions/setupHandler';

// Electron log is the best way I've found to get logs from compiled binaries
import log from 'electron-log/main';

console.log = log.log;

let mainWindow: BrowserWindow | null = null;
let stopIntercept: (() => void) | undefined;

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));

// First register the app scheme
registerAppScheme();

async function createWindow() {
	// Create the browser window
	mainWindow = new BrowserWindow({
		width: 1200,
		height: 800,
		webPreferences: {
			// Second configure the preload script
			preload: getPreloadPath(),
			contextIsolation: true,
			devTools: true
		}
	});

	mainWindow.once('ready-to-show', () => mainWindow?.webContents.openDevTools());

	mainWindow.on('closed', () => {
		mainWindow = null;
		stopIntercept?.();
	});

	// Third, Setup the handler
	stopIntercept = await setupHandler(mainWindow);

	return mainWindow;
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

app.on('activate', async () => {
	if (BrowserWindow.getAllWindows().length === 0 && !mainWindow) {
		try {
			await createWindow();
		} catch (error) {
			console.error('Failed to create window:', error);
		}
	}
});
```

### 4. Create Preload Script

Create `src/preload.ts`:

```ts
console.log('Preload loaded');
```

### 5. Configure Package.json

Add these fields to your `package.json`:

```json
{
  "main": "./out/main/index.cjs",
  "scripts": {
    "sync": "svelte-kit sync",
	"dev": "pnpm sync && concurrently \"vite dev\" \"wait-on http://localhost:5173 && nodemon --watch out --exec electron .\" --names \"sveltekit,electron\" --prefix-colors \"#ff3e00,blue\"",
    "build": "pnpm sync && vite build",
    "build:all": "pnpm build && electron-builder -mwl --config",
    "build:win": "pnpm build && electron-builder --win --config",
    "build:mac": "pnpm build && electron-builder --mac --config",
    "build:linux": "pnpm build && electron-builder --linux --config"
  }
}
```

### 6. Build and Run

```bash
# Development (uses Vite dev server with HMR)
npm run dev

# Production build
npm run build

# Package for distribution
npm run build:all  # All platforms
npm run build:win  # Windows only
npm run build:mac  # macOS only
npm run build:linux # Linux only
```

## How It Works

### Development Mode
- Uses Vite dev server (`http://localhost:5173` by default)
- Full hot module replacement (HMR) support
- No protocol interception needed
- Set `VITE_DEV_SERVER` environment variable to customize dev server URL

### Production Mode
The adapter uses Electron's native `protocol.handle()` API to intercept `http://127.0.0.1` requests:

1. **Static Assets**: Serves files from the `client/` directory
2. **Prerendered Pages**: Serves static HTML from the `prerendered/` directory  
3. **SSR/API Routes**: Calls SvelteKit's `Server.respond()` directly
4. **Form Actions**: Full support for SvelteKit form actions
5. **Cookie Handling**: Automatic cookie synchronization with Electron session

### Build Output Structure

After running `npm run build`, you'll have:

```
out/
├── client/                  # SvelteKit client assets (JS, CSS, images)
├── server/                  # SvelteKit server files for SSR
│   ├── index.js            # SvelteKit server
│   ├── manifest.js         # App manifest
│   └── chunks/             # Server chunks
├── prerendered/            # Prerendered static HTML pages
├── functions/              # Protocol handler code
│   ├── setupHandler.js     # Main protocol handler
│   └── setupHandler.d.ts   # TypeScript definitions
├── main/                   # Compiled main process
│   └── index.js
└── preload/                # Compiled preload script
    └── index.js
```

## Configuration Options

### SvelteKit Adapter Options

```js
adapter({
	out: 'out',              // Output directory (default: 'out')
	precompress: false       // Precompress assets with gzip/brotli (default: false)
})
```

| Option        | Type      | Default | Description                                     |
| ------------- | --------- | ------- | ----------------------------------------------- |
| `out`         | `string`  | `'out'` | The directory to write the built application to |
| `precompress` | `boolean` | `false` | Whether to precompress assets with gzip/brotli  |

### Electron Plugin Options

```js
electronPlugin({
	mainEntry: 'src/main.ts',           // Main process entry point (default: 'src/main.ts')
	preloadEntry: 'src/preload.ts',     // Preload script entry point (default: 'src/preload.ts')
	mainOut: 'out/main/index.cjs',      // Main process output (default: 'out/main/index.cjs')
	preloadOut: 'out/preload/index.js', // Preload script output (default: 'out/preload/index.js')
	externalMain: ['electron', 'electron-log', 'electron-is-dev', 'SERVER', 'MANIFEST'], // External dependencies for main process
	externalPreload: ['electron']       // External dependencies for preload script
})
```

| Option            | Type       | Default                                                                 | Description                                                        |
| ----------------- | ---------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `mainEntry`       | `string`   | `'src/main.ts'`                                                         | Path to the main process entry file                                |
| `preloadEntry`    | `string`   | `'src/preload.ts'`                                                      | Path to the preload script entry file                              |
| `mainOut`         | `string`   | `'out/main/index.cjs'`                                                  | Output path for the compiled main process                          |
| `preloadOut`      | `string`   | `'out/preload/index.js'`                                                | Output path for the compiled preload script                        |
| `externalMain`    | `string[]` | `['electron', 'electron-log', 'electron-is-dev', 'SERVER', 'MANIFEST']` | External dependencies that won't be bundled for the main process   |
| `externalPreload` | `string[]` | `['electron']`                                                          | External dependencies that won't be bundled for the preload script |

### Configuration Examples

#### Custom Output Directory
```js
// svelte.config.js
import adapter from 'adapter-electron';

export default {
	kit: {
		adapter: adapter({
			out: 'dist/electron'
		})
	}
};
```

#### Custom Entry Points
```js
// vite.config.ts
import { electronPlugin } from 'adapter-electron';

export default defineConfig({
	plugins: [
		sveltekit(),
		electronPlugin({
			mainEntry: 'electron/main.ts',
			preloadEntry: 'electron/preload.ts',
			mainOut: 'dist/electron/main.js',
			preloadOut: 'dist/electron/preload.js'
		})
	]
});
```

#### Custom External Dependencies
```js
// vite.config.ts
import { electronPlugin } from 'adapter-electron';

export default defineConfig({
	plugins: [
		sveltekit(),
		electronPlugin({
			externalMain: ['electron', 'electron-log', 'my-custom-package'],
			externalPreload: ['electron', 'another-package']
		})
	]
});
```

### Environment Variables

| Variable          | Description            | Default                 |
| ----------------- | ---------------------- | ----------------------- |
| `VITE_DEV_SERVER` | Development server URL | `http://localhost:5173` |
| `VITE_APP_URL`    | Production app URL     | `http://127.0.0.1`      |

## API Reference

### Protocol Handler Functions

#### `setupHandler(mainWindow: BrowserWindow): Promise<() => void>`

Sets up the protocol handler and loads the appropriate URL based on environment.

- **Development**: Loads Vite dev server
- **Production**: Sets up protocol interception and loads app
- **Returns**: Cleanup function to stop protocol interception

#### `registerAppScheme(): void`

Registers the HTTP scheme as privileged. **Must be called before `app.ready`.**

#### `getPreloadPath(): string`

Returns the correct preload script path for current environment.

- **Development**: Points to source preload script
- **Production**: Points to built preload script

### Request Flow

```
Development:
Electron Window → Vite Dev Server (http://localhost:5173)
                     ↓
                 Hot Module Replacement

Production:
Electron Request (http://127.0.0.1/page)
    ↓
Protocol Handler
    ↓
1. Check static files (client/)
2. Check prerendered pages (prerendered/)  
3. Handle SSR/API (server.respond())
    ↓
Response with Cookie Sync
```

## Advanced Usage

### Custom Error Handling

The adapter includes built-in error reporting. Errors are:
- Logged to console in development
- Shown as dialog boxes in production
- Include GitHub issue reporting instructions

### Cookie Management

Cookies are automatically synchronized between SvelteKit and Electron's session:
- Request cookies are extracted from Electron session
- Response `Set-Cookie` headers are applied to Electron session
- Supports all cookie attributes (secure, httpOnly, etc.)

### Security Features

- Path traversal protection for static files
- Automatic CORS handling
- Secure cookie handling
- Context isolation enforced

## Production Packaging

### With electron-builder

Create `electron-builder.yaml`:

```yaml
appId: com.electron.app
productName: electron-sveltekit
directories:
  buildResources: build
files:
  - "!**/.vscode/*"
  - "!src/*"
  - "!electron.vite.config.{js,ts,mjs,cjs}"
  - "!vite.electron.config.ts"
  - "!{.eslintignore,.eslintrc.cjs,.prettierignore,.prettierrc.yaml,dev-app-update.yml,CHANGELOG.md,README.md}"
  - "!{.env,.env.*,.npmrc,pnpm-lock.yaml}"
  - "!{tsconfig.json,tsconfig.node.json,tsconfig.web.json}"
  - "out/**/*"
asarUnpack:
  - resources/**
win:
  target: ["portable"]
  executableName: electron-sveltekit
nsis:
  artifactName: ${name}-${version}-setup.${ext}
  shortcutName: ${productName}
  uninstallDisplayName: ${productName}
  createDesktopShortcut: always
mac:
  entitlementsInherit: build/entitlements.mac.plist
  extendInfo:
    - NSCameraUsageDescription: Application requests access to the device's camera.
    - NSMicrophoneUsageDescription: Application requests access to the device's microphone.
    - NSDocumentsFolderUsageDescription: Application requests access to the user's Documents folder.
    - NSDownloadsFolderUsageDescription: Application requests access to the user's Downloads folder.
dmg:
  artifactName: ${name}-${version}.${ext}
linux:
  target:
    - AppImage
    - snap
    - deb
  maintainer: electronjs.org
  category: Utility
appImage:
  artifactName: ${name}-${version}.${ext}
npmRebuild: false
publish:
  provider: generic
  url: https://example.com/auto-updates
```

### With electron-forge

```js
// forge.config.js
module.exports = {
  packagerConfig: {
    dir: './out'
  },
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {}
    }
  ]
};
```

## Dependencies

The adapter requires these additional dependencies:

```bash
npm install electron electron-builder electron-log concurrently
npm install -D @types/node
```

## Troubleshooting

### Common Issues

**Protocol not working in production:**
- Ensure `registerAppScheme()` is called before `app.ready`
- Check that `setupHandler()` is called after window creation

**Development server not loading:**
- Verify Vite dev server is running on expected port
- Set `VITE_DEV_SERVER` environment variable if using custom port

**Form actions not working:**
- Ensure you're using proper Web API Request objects (handled automatically)
- Check that cookies are being synchronized properly

**Build errors:**
- Verify all dependencies are installed
- Check that TypeScript configuration includes Electron types
- Ensure `concurrently` is installed for development scripts

### Debug Mode

Enable verbose logging:

```js
// In main process
process.env.ELECTRON_ENABLE_LOGGING = 'true';
```

### Getting Help

If you encounter issues:

1. Check the console for error messages
2. Verify your configuration matches the examples
3. File an issue with error details and reproduction steps

## License

MIT

