# adapter-electron

## A sveltekit adapter for Electron Desktop Apps

This is a simple wrapper for the existing `adapter-node` SvelteKit adapter, with the exception that this package exports custom functions to handle the integration and running of the polka server and handler that are built from the node adapter.

```js
import { app, BrowserWindow } from 'electron';
import { start, load } from 'adapter-electron/functions';
import isDev from 'electron-is-dev';
import log from 'electron-log/main';
import nodePath from 'node:path';


const port = await start();

async function createWindow() {
	// Create the browser window

	const mainWindow = new BrowserWindow({
		width: 800,
		height: 600,
		webPreferences: {
			preload: nodePath.join(__dirname, '../preload/index.mjs')
		}
	});

	// Load the local URL for development or the local
	// html file for production
	load(mainWindow, port);

	if (isDev) mainWindow.webContents.openDevTools();
}
```

If you are having issues with this adapter running or building properly, it's most likely related to the `ORIGIN` configured.  
I implented a sort of SHIM that will set the value at runtime to the correct value for the local electron desktop environment.

This implementation is fully functional with the caveat that [this PR be merged](https://github.com/alex8088/electron-vite/pull/412).  
I have patched the package locally in node modules and validated everything builds perfectly.
