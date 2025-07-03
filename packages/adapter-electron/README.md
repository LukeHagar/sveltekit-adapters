# adapter-electron

## A SvelteKit adapter for Electron Desktop Apps using protocol interception

This adapter provides a complete solution for building Electron desktop applications with SvelteKit by **embedding the full SvelteKit app directly into the Electron main process**. It uses protocol interception to handle all routing, SSR, and API endpoints without requiring a separate HTTP server.

## Features

### 🚀 **Embedded SvelteKit**
- **Full SvelteKit app** embedded in Electron main process
- **Server-side rendering** for all routes
- **API endpoints** handled natively
- **Static asset serving** via custom protocol

### 🔄 **Protocol Interception**
- **HTTP protocol interception** for SvelteKit routes
- **Custom file protocol** for static assets
- **No external HTTP server** required
- **Seamless development and production** experience

### ⚡ **Performance Optimizations**
- **Response caching** with configurable TTL
- **Automatic cache cleanup** to prevent memory leaks
- **Efficient static file serving** from built assets
- **Minimal overhead** compared to external servers

### 🛠️ **Developer Experience**
- **Hot reload** support in development
- **Comprehensive logging** for debugging
- **Easy configuration** with sensible defaults
- **TypeScript support** throughout

## Installation

```bash
npm install adapter-electron
```

## Basic Setup

### 1. Configure SvelteKit

```js
// svelte.config.js
import adapter from 'adapter-electron';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		// adapter-auto only supports some environments, see https://kit.svelte.dev/docs/adapter-auto for a list.
		// If your environment is not supported or you settled on a specific environment, switch out the adapter.
		// See https://kit.svelte.dev/docs/adapters for more information about adapters.
		adapter: adapter()
	}
};

export default config;
```

### 2. Set up Electron Main Process

```js
// src/main/index.js
import { app, BrowserWindow } from 'electron';
import { start, load, protocolUtils } from 'adapter-electron/functions';
import isDev from 'electron-is-dev';
import log from 'electron-log/main';
import nodePath from 'node:path';

const port = await start();

async function createWindow() {
	const mainWindow = new BrowserWindow({
		width: 1200,
		height: 800,
		webPreferences: {
			preload: nodePath.join(__dirname, '../preload/index.mjs'),
			nodeIntegration: false,
			contextIsolation: true
		}
	});

	// Load the app - all routing is handled by protocol interception
	load(mainWindow, port);

	if (isDev) {
		mainWindow.webContents.openDevTools();
	}
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

// Optional: Configure protocol settings
protocolUtils.configure({
	baseUrl: 'http://localhost:3000',
	staticProtocol: 'app',
	enableCaching: true,
	cacheTimeout: 300000 // 5 minutes
});
```

## How It Works

### **Protocol Interception**
The adapter uses Electron's protocol API to intercept all HTTP requests to your SvelteKit app:

1. **HTTP Protocol Interception**: All requests to `http://localhost:3000/*` are intercepted
2. **SvelteKit Handler**: Requests are routed through SvelteKit's built handler
3. **Static Asset Protocol**: Static files are served via a custom `app://` protocol
4. **Response Caching**: Successful responses are cached for performance

### **Request Flow**
```
Browser Request → Protocol Interception → SvelteKit Handler → Response
```

### **Static Assets**
```
Static Asset Request → Custom Protocol → File System → Response
```

## Configuration Options

### **Protocol Configuration**

```js
import { protocolUtils } from 'adapter-electron/functions';

protocolUtils.configure({
	baseUrl: 'http://localhost:3000',        // Base URL for SvelteKit app
	staticProtocol: 'app',                   // Protocol for static assets
	enableCaching: true,                     // Enable response caching
	cacheTimeout: 300000                     // Cache TTL in milliseconds
});
```

### **Cache Management**

```js
// Clear all cached responses
protocolUtils.clearCache();

// Get cache statistics
const stats = protocolUtils.getCacheStats();
console.log(`Cache enabled: ${stats.enabled}, Size: ${stats.size}`);

// Manual cache cleanup
protocolUtils.cleanupCache();
```

## Advanced Usage

### **Custom Protocol Configuration**

```js
// Use a custom base URL
protocolUtils.configure({
	baseUrl: 'http://myapp.local',
	staticProtocol: 'myapp-assets'
});

// Disable caching for development
if (isDev) {
	protocolUtils.configure({
		enableCaching: false
	});
}
```

### **Performance Monitoring**

```js
// Monitor cache performance
setInterval(() => {
	const stats = protocolUtils.getCacheStats();
	if (stats.enabled) {
		console.log(`Cache size: ${stats.size} entries`);
	}
}, 30000); // Every 30 seconds
```

### **Error Handling**

```js
// The adapter automatically handles errors and provides logging
// You can also add custom error handling in your main process

app.on('render-process-gone', (event, webContents, details) => {
	console.error('Render process crashed:', details.reason);
	// Restart the window or handle the crash
});
```

## Development vs Production

### **Development Mode**
- Uses external dev server when available
- Hot reload support
- Detailed logging
- Cache disabled by default

### **Production Mode**
- Full protocol interception
- Response caching enabled
- Optimized static asset serving
- Minimal logging

## API Reference

### **Core Functions**

- `start()` - Initialize the protocol manager and set up interception
- `load(mainWindow, port, path)` - Load the app in an Electron window
- `protocolUtils.configure(options)` - Configure protocol settings
- `protocolUtils.clearCache()` - Clear all cached responses
- `protocolUtils.getCacheStats()` - Get cache statistics
- `protocolUtils.cleanupCache()` - Clean up expired cache entries

### **Configuration Options**

```typescript
interface ProtocolOptions {
	baseUrl?: string;           // Base URL for SvelteKit app
	staticProtocol?: string;    // Protocol for static assets
	enableCaching?: boolean;    // Enable response caching
	cacheTimeout?: number;      // Cache TTL in milliseconds
}
```

## Troubleshooting

### **Common Issues**

1. **App not loading**: Check that the SvelteKit build exists in the expected location
2. **Static assets not loading**: Verify the static protocol is correctly configured
3. **Performance issues**: Enable caching and adjust cache timeout
4. **Memory leaks**: Ensure cache cleanup is running periodically

### **Debug Mode**

Enable detailed logging by setting the environment variable:

```bash
DEBUG=electron-protocol npm run dev
```

### **Cache Issues**

If you're experiencing stale content:

```js
// Clear cache manually
protocolUtils.clearCache();

// Or disable caching temporarily
protocolUtils.configure({ enableCaching: false });
```

## Migration from Standard Adapter

If you're migrating from the standard adapter-electron:

1. **Update imports** to include protocolUtils
2. **Remove any external server setup** - it's no longer needed
3. **Configure protocol settings** as needed
4. **Test static asset loading** with the new protocol

The adapter maintains backward compatibility while providing the new protocol-based functionality.

## Performance Benefits

### **Compared to External Server**
- **Faster startup** - no server initialization
- **Lower memory usage** - no separate Node.js process
- **Better integration** - direct access to Electron APIs
- **Simplified deployment** - single executable

### **Caching Benefits**
- **Reduced computation** - cached SSR responses
- **Faster navigation** - cached API responses
- **Better user experience** - instant page loads

## Contributing

This adapter is part of the SvelteKit adapters collection. Contributions are welcome!

## License

MIT License - see the main repository for details.

