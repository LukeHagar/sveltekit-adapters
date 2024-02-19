import { app, BrowserWindow } from 'electron';
import { start, load } from 'adapter-electron/functions';
import isDev from 'electron-is-dev';
import log from 'electron-log/main';
import nodePath from 'node:path';

log.info('Hello, log!');
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

app.whenReady().then(() => {
	log.info('App is ready');

	log.info('Creating window...');
	createWindow();

	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow();
		}
	});
});

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});
