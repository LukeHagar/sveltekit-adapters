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
npm install @sveltejs/adapter-electron
```

## Quick Start

### 1. Configure SvelteKit

In your `svelte.config.js`:

```js
import adapter from '@sveltejs/adapter-electron';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			// All options are optional with sensible defaults
			out: 'out',                    // Output directory (default: 'out')
			assets: true,                  // Include static assets (default: true)
			fallback: undefined,           // Fallback page for client-side routing (default: undefined)
			precompress: false,            // Precompress assets (default: false)
			strict: true                   // Strict mode (default: true)
		})
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

let mainWindow: BrowserWindow | null = null;
let stopIntercept: (() => void) | undefined;

// IMPORTANT: Register the app scheme before app.ready
registerAppScheme();

async function createWindow() {
	mainWindow = new BrowserWindow({
		width: 1200,
		height: 800,
		webPreferences: {
			preload: getPreloadPath(),  // Auto-configured preload path
			contextIsolation: true,
			nodeIntegration: false,
			webSecurity: true
		}
	});

	mainWindow.on('closed', () => {
		mainWindow = null;
		stopIntercept?.();
	});

	// Setup the protocol handler (handles dev vs prod automatically)
	stopIntercept = await setupHandler(mainWindow);
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

app.on('activate', async () => {
	if (BrowserWindow.getAllWindows().length === 0 && !mainWindow) {
		await createWindow();
	}
});
```

### 4. Create Preload Script

Create `src/preload.ts`:

```ts
// Your preload script content
console.log('Preload loaded');

// Example: Expose APIs to renderer process
import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
	// Your APIs here
});
```

### 5. Build and Run

```bash
# Development (uses Vite dev server with HMR)
npm run dev

# Production build
npm run build

# Run built Electron app
npm start  # or your preferred Electron launcher
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
	out: 'out',              // Output directory
	assets: true,            // Include static assets from /static
	fallback: undefined,     // Fallback page for client-side routing
	precompress: false,      // Precompress assets with gzip/brotli
	strict: true             // Enable strict mode
})
```

### Electron Plugin Options

```js
electronPlugin({
	mainEntry: 'src/main.ts',           // Main process entry point
	preloadEntry: 'src/preload.ts',     // Preload script entry point  
	mainOut: 'out/main/index.js',       // Main process output
	preloadOut: 'out/preload/index.js'  // Preload script output
})
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_DEV_SERVER` | Development server URL | `http://localhost:5173` |
| `VITE_APP_URL` | Production app URL | `http://127.0.0.1` |

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

```json
{
  "scripts": {
    "build": "vite build",
    "dist": "npm run build && electron-builder"
  },
  "build": {
    "directories": {
      "output": "dist",
      "buildResources": "out"
    },
    "files": [
      "out/**/*",
      "package.json"
    ],
    "mac": {
      "icon": "assets/icon.icns"
    },
    "win": {
      "icon": "assets/icon.ico"
    }
  }
}
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

