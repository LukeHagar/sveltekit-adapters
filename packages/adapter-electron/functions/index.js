import isDev from 'electron-is-dev';
import path from 'node:path';
import log from 'electron-log/main';
import polka from 'polka';

/** @type {import('./index.js').start} */
export const start = async () => {
  if (isDev) return undefined;
  const { env } = await await import(`file://${path.join(__dirname, '../renderer/env.js')}`);
  const port = env('PORT', '3000');

  log.info(`Configured Port is: ${port}`);

  log.info(`Setting origin to http://127.0.0.1:${port}`);
  process.env['ORIGIN'] = `http://127.0.0.1:${port}`;

  log.info('Importing Polka handler');
  const { handler } = await import(`file://${path.join(__dirname, '../renderer/handler.js')}`);

  //   createHandler(port),
  const server = polka().use(handler);

  Object.assign(console, log.functions);

  log.info('Starting server...');
  server.listen({ path: false, host: '127.0.0.1', port }, () => {
    log.info(`Server Listening on http://127.0.0.1:${port}`);
  });

  return port;
};

/** @type {import('./index.js').load} */
export const load = (mainWindow, port) => {
  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    log.info(`Loading url: ${process.env['ELECTRON_RENDERER_URL']}`);
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    log.info(`Loading url: http://127.0.0.1:${port}`);
    mainWindow.loadURL(`http://127.0.0.1:${port}`);
  }
};
