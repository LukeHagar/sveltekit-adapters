import isDev from 'electron-is-dev';
import path from 'node:path';
import log from 'electron-log/main';
import { protocol } from 'electron';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';

const __dirname = fileURLToPath(new URL('../renderer', import.meta.url));

// Module-level state
let handler = null;
let isConfigured = false;
let baseUrl = 'http://localhost:3000';

// Initialize the protocol manager
async function initialize() {
  if (isConfigured) {
    log.warn('SvelteKit protocol already configured');
    return true;
  }

  try {
    // Import the built SvelteKit handler
    const handlerModule = await import(`file://${path.join(__dirname, 'handler.js')}`);
    
    handler = handlerModule.handler;
    
    log.info('SvelteKit handler loaded successfully');
    return true;
  } catch (error) {
    log.error('Failed to load SvelteKit handler:', error);
    return false;
  }
}

// Configure protocol settings
function configure(options = {}) {
  const {
    baseUrl: newBaseUrl = 'http://localhost:3000'
  } = options;

  baseUrl = newBaseUrl;

  log.info(`SvelteKit protocol configured with baseUrl: ${baseUrl}`);
}

// Set up protocols
async function setupProtocols() {
  if (!handler) {
    throw new Error('SvelteKit handler not initialized. Call initialize() first.');
  }

  // Register HTTP protocol handler
  protocol.handle('http', async (req) => {
    const { host, pathname } = new URL(req.url);
    
    // Only handle requests to our configured base URL
    if (host !== 'localhost:3000') {
      return new Response('Not Found', {
        status: 404,
        headers: { 'content-type': 'text/plain' }
      });
    }

    // Handle SvelteKit routes and API endpoints
    try {
      // Create a Request object for the SvelteKit handler
      const sveltekitReq = new Request(req.url, {
        method: req.method,
        headers: req.headers,
        body: req.body
      });

      // Handle request through SvelteKit
      const res = await handler(sveltekitReq);
      
      log.debug(`Handled SvelteKit request: ${req.method} ${pathname} -> ${res.status}`);
      return res;

    } catch (error) {
      log.error(`Error handling SvelteKit request ${pathname}:`, error);
      return new Response('Internal Server Error', {
        status: 500,
        headers: { 'content-type': 'text/plain' }
      });
    }
  });

  isConfigured = true;
  log.info('SvelteKit protocols configured successfully');
}

/** @type {import('./index.js').start} */
export const start = async () => {
  if (isDev) return undefined;
  
  try {
    log.info('Initializing SvelteKit protocol manager...');
    
    // Initialize the protocol manager
    const initialized = await initialize();
    if (!initialized) {
      throw new Error('Failed to initialize SvelteKit protocol manager');
    }

    // Configure with default settings
    configure({
      baseUrl: 'http://localhost:3000'
    });

    // Set up protocols
    await setupProtocols();

    log.info('SvelteKit protocol manager started successfully');
    return '3000'; // Return port for compatibility

  } catch (error) {
    log.error('Failed to start SvelteKit protocol manager:', error);
    throw error;
  }
};

/** @type {import('./index.js').load} */
export const load = (mainWindow, path = '') => {
  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    const url = `${process.env['ELECTRON_RENDERER_URL']}${path}`;
    log.info(`Loading development URL: ${url}`);
    mainWindow.loadURL(url);
  } else {
    const url = `http://localhost:3000${path}`;
    log.info(`Loading production URL: ${url}`);
    mainWindow.loadURL(url);
  }

  // Set up window event handlers for better integration
  mainWindow.webContents.on('did-finish-load', () => {
    log.info('Window loaded successfully');
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    log.error('Window failed to load:', errorDescription);
  });
};

// Export protocol utilities for advanced usage
export const protocolUtils = {
  // Configure the protocol manager
  configure,
  
  // Check if configured
  isConfigured: () => isConfigured
};
