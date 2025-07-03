import { app, BrowserWindow } from 'electron';
import { start, load } from 'adapter-electron/functions';
import isDev from 'electron-is-dev';
import log from 'electron-log/main';
import nodePath from 'node:path';
import { fileURLToPath } from 'node:url';

// Handle __dirname in ES modules
const __dirname = nodePath.dirname(fileURLToPath(import.meta.url));

log.info('Starting Electron app with SvelteKit protocol integration...');

// Initialize the protocol manager
const port = await start();

async function createWindow() {
	// Create the browser window
	const mainWindow = new BrowserWindow({
		width: 1200,
		height: 800,
		webPreferences: {
			preload: nodePath.join(__dirname, '../preload/index.mjs'),
			nodeIntegration: false,
			contextIsolation: true,
			webSecurity: true
		}
	});

	// Load the app - all routing is handled by protocol interception
	load(mainWindow);

	if (isDev) {
		mainWindow.webContents.openDevTools();
	}

	// Handle window events
	mainWindow.webContents.on('did-finish-load', () => {
		log.info('Window loaded successfully');
	});

	mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
		log.error('Window failed to load:', errorDescription);
	});

	return mainWindow;
}

app.whenReady().then(async () => {
	log.info('App is ready');

	log.info('Creating window...');
	await createWindow();

	app.on('activate', async () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			await createWindow();
		}
	});
});

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

// Handle render process crashes
app.on('render-process-gone', (event, webContents, details) => {
	log.error('Render process crashed:', details.reason);
	// You could restart the window here if needed
});
