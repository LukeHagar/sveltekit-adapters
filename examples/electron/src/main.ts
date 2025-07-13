import { app, BrowserWindow } from 'electron';
import { setupHandler, getPreloadPath, registerAppScheme } from 'adapter-electron/functions/setupHandler';
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

	// Setup the handler
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
});
