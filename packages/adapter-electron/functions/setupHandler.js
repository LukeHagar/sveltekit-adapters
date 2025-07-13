import fs from 'node:fs/promises';
import path from 'node:path';
import isDev from 'electron-is-dev';
import { protocol, net, dialog, app } from 'electron';
import { pathToFileURL } from 'url';
import { Socket } from 'node:net';
import assert from 'node:assert';
import { parse as parseCookie, splitCookiesString } from 'set-cookie-parser';
import { serialize as serializeCookie } from 'cookie';

let server;
let clientDir;
let prerenderedDir;
let Protocol = 'http';
let Host = '127.0.0.1';
let Origin = `${Protocol}://${Host}`;

/**
 * Reports errors to the user in a way that can be filed on GitHub
 * @param {Error} error - The error to report
 * @param {string} context - Additional context about where the error occurred
 */
function reportError(error, context = '') {
  const errorMessage = `SvelteKit Electron Adapter Error${context ? ` (${context})` : ''}:

${error.message}

Stack trace:
${error.stack}

Please report this issue at: https://github.com/your-repo/sveltekit-adapters/issues`;

  console.error(errorMessage);

  if (!isDev) {
    // Show error dialog to user in production
    dialog.showErrorBox('SvelteKit Electron Adapter Error', errorMessage);
  }

  // Optionally crash the app in severe cases
  // app.exit(1);
}

/**
 * @type {import('./setupHandler.d').getPreloadPath}
 */
export function getPreloadPath() {
  let preloadPath = path.resolve(path.join(__dirname, 'PRELOAD'))

  if (isDev) {
    preloadPath = path.resolve(path.join(__dirname, '..', 'preload', 'index.js'))
  }

  return preloadPath;
}

/**
 * @type {import('./setupHandler.d').registerAppScheme}
 */
export function registerAppScheme() {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: Protocol,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
      }
    }
  ]);
}

/**
 * @type {import('./setupHandler.d').createRequest}
 */
async function createRequest(request, session) {
  try {
    const url = new URL(request.url);

    // Create a proper Headers object that SvelteKit expects
    const headers = new Headers();
    request.headers.forEach((value, key) => {
      headers.set(key.toLowerCase(), value);
    });
    headers.set('origin', Origin);

    try {
      // @see https://github.com/electron/electron/issues/39525#issue-1852825052
      const cookies = await session.cookies.get({
        url: url.toString(),
      });

      if (cookies.length) {
        const cookiesHeader = [];

        for (const cookie of cookies) {
          const { name, value, ...options } = cookie;
          cookiesHeader.push(serializeCookie(name, value)); // ...(options as any)?
        }

        headers.set('cookie', cookiesHeader.join('; '));
      }
    } catch (e) {
      reportError(e, 'Cookie retrieval');
    }

    // Handle body data
    let body = null;
    if (request.uploadData && request.uploadData.length > 0) {
      const buffers = request.uploadData
        .filter(part => part.bytes)
        .map(part => Buffer.from(part.bytes));

      body = Buffer.concat(buffers);
    } else if (request.body) {
      body = Buffer.from(await request.arrayBuffer());
    }

    // Create a proper Web API Request object that SvelteKit expects
    const webRequest = new Request(url.toString(), {
      method: request.method,
      headers: headers,
      body: body
    });

    return webRequest;
  } catch (error) {
    reportError(error, 'Request creation');
    throw error;
  }
}

/**
 * @type {import('./setupHandler.d').setupHandler}
 */
export async function setupHandler(mainWindow) {
  assert(mainWindow, 'mainWindow is required');
  assert(mainWindow.webContents.session, 'mainWindow.webContents.session is required');

  let url = process.env.VITE_DEV_SERVER || Origin

  if (isDev) {
    await mainWindow.loadURL(process.env.VITE_DEV_SERVER || 'http://localhost:5173');
    return () => { }; // No interception in dev

  } else {

    try {
      // Dynamically import server and manifest after build
      const { Server } = await import('SERVER');
      const { manifest, prerendered, base } = await import('MANIFEST');

      // Initialize server
      server = new Server(manifest);
      await server.init({
        env: process.env,
        read: async (file) => {
          return fs.readFile(path.join(clientDir, file));
        }
      });

      // Set up directories
      clientDir = path.join(__dirname, '..', 'client', base);
      prerenderedDir = path.join(__dirname, '..', 'prerendered');

      // Handle all http://127.0.0.1 requests
      protocol.handle(Protocol, async (request) => {

        assert(request.url.startsWith(url), 'External HTTP not supported, use HTTPS');

        const req = await createRequest(request, mainWindow.webContents.session);

        try {
          const { host, pathname } = new URL(req.url);

          // Only handle requests from the host
          if (host !== Host) {
            return new Response('Not found', { status: 404 });
          }

          // 1. Serve static client assets
          const staticFilePath = path.join(clientDir, pathname);
          if (await fileExists(staticFilePath)) {
            if (!isSafePath(clientDir, staticFilePath)) {
              reportError(new Error(`Unsafe static file path detected: ${staticFilePath}`), 'Path traversal attempt');
              return new Response('bad', { status: 400, headers: { 'content-type': 'text/html' } });
            }
            return net.fetch(pathToFileURL(staticFilePath).toString(), {
              headers: {
                'content-type': getMimeType(staticFilePath),
                'cache-control': 'public, max-age=31536000' // 1 year cache for static assets
              }
            });
          }

          // 2. Serve prerendered pages
          if (prerendered.has(pathname)) {
            const prerenderedPath = path.join(prerenderedDir, pathname, 'index.html');
            if (await fileExists(prerenderedPath)) {
              if (!isSafePath(prerenderedDir, prerenderedPath)) {
                reportError(new Error(`Unsafe prerendered file path detected: ${prerenderedPath}`), 'Path traversal attempt');
                return new Response('bad', { status: 400, headers: { 'content-type': 'text/html' } });
              }
              return net.fetch(pathToFileURL(prerenderedPath).toString());
            }
          }

          // 3. Trailing slash redirect for prerendered
          let alt = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname + '/';
          if (prerendered.has(alt)) {
            return new Response(null, {
              status: 308,
              headers: {
                location: alt,
                'cache-control': 'no-cache'
              }
            });
          }

          // 4. SSR/API fallback
          const response = await server.respond(req, {
            platform: {},
            getClientAddress: () => Host
          });

          try {
            // SvelteKit response headers are an array of [key, value] pairs
            const setCookieHeaders = [];
            for (const [key, value] of response.headers) {
              if (key.toLowerCase() === 'set-cookie') {
                setCookieHeaders.push(value);
              }
            }

            if (setCookieHeaders.length > 0) {
              const cookies = parseCookie(splitCookiesString(setCookieHeaders));

              for (const cookie of cookies) {
                const { name, value, path, domain, secure, httpOnly, expires, maxAge } = cookie;

                const expirationDate = expires
                  ? expires.getTime()
                  : maxAge
                    ? Date.now() + maxAge * 1000
                    : undefined;

                if (expirationDate && expirationDate < Date.now()) {
                  await mainWindow.webContents.session.cookies.remove(request.url, name);
                  continue;
                }

                await mainWindow.webContents.session.cookies.set({
                  url: request.url,
                  expirationDate,
                  name,
                  value,
                  path,
                  domain,
                  secure,
                  httpOnly,
                  maxAge,
                });
              }
            }
          } catch (e) {
            reportError(e, 'Cookie synchronization');
          }

          return response;

        } catch (error) {
          reportError(error, 'Protocol handler');
          return new Response('Internal Server Error', { 
            status: 500, 
            headers: { 'content-type': 'text/plain' } 
          });
        }
      });
    } catch (error) {
      reportError(error, 'Server initialization');
      throw error;
    }
  }

  await mainWindow.loadURL(url);

  return function stopIntercept() {
    protocol.unhandle('http');
  };
}

const fileExists = async (filePath) => {
  try {
    return (await fs.stat(filePath)).isFile();
  } catch {
    return false;
  }
};

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.htm': 'text/html',
    '.js': 'application/javascript',
    '.mjs': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'font/otf',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.pdf': 'application/pdf',
    '.zip': 'application/zip',
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.xml': 'application/xml',
    '.csv': 'text/csv'
  };

  return mimeTypes[ext] || 'application/octet-stream';
}

// Helper to check for directory traversal
const isSafePath = (base, target) => {
  const relative = path.relative(base, target);
  const safe = relative && !relative.startsWith('..') && !path.isAbsolute(relative);
  if (!safe) {
    reportError(new Error(`Unsafe path detected: base=${base}, target=${target}, relative=${relative}`), 'Path traversal attempt');
  }
  return safe;
}; 