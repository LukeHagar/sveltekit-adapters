// adapter-electron.js
import { readFileSync, writeFileSync } from 'node:fs';
import fs from 'node:fs';
import path from 'node:path';
import { rollup, watch as rollupWatch } from 'rollup';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';

/**
 * Build an Electron entrypoint (main or preload) using Rollup
 * @param {string} entry - Entry file path
 * @param {string} outfile - Output file path
 * @param {string[]} external - External dependencies
 * @param {boolean} isDev - Whether to watch (dev) or build (prod)
 */
async function buildEntryWithRollup(entry, outfile, external, isDev = false) {
  const inputOptions = {
    input: path.resolve(process.cwd(), entry),
    external,
    plugins: [
      nodeResolve({ preferBuiltins: true }),
      commonjs(),
      json()
    ]
  };
  const outputOptions = {
    file: path.resolve(process.cwd(), outfile),
    format: 'cjs',
    sourcemap: true
  };

  if (isDev) {
    const watcher = rollupWatch({
      ...inputOptions,
      output: [outputOptions],
      watch: { clearScreen: false }
    });
    watcher.on('event', (event) => {
      if (event.code === 'ERROR') {
        console.error(event.error);
      } else if (event.code === 'BUNDLE_END') {
        console.log(`[electron-entry] Rebuilt: ${entry} → ${outfile}`);
      }
    });
    console.log(`[electron-entry] Watching: ${entry} → ${outfile}`);
  } else {
    const bundle = await rollup(inputOptions);
    await bundle.write(outputOptions);
    await bundle.close();
    console.log(`[electron-entry] Built: ${entry} → ${outfile}`);
  }
}

export default function (opts = {}) {
  const {
    out = 'out',
    precompress = false
  } = opts;

  return {
    name: 'adapter-electron',

    async adapt(builder) {
      const tmp = builder.getBuildDirectory('adapter-electron');

      builder.rimraf(out);
      builder.rimraf(tmp);
      builder.mkdirp(tmp);

      builder.log.minor('Copying assets');
      builder.writeClient(`${out}/client${builder.config.kit.paths.base}`);
      builder.writePrerendered(`${out}/prerendered${builder.config.kit.paths.base}`);

      if (precompress) {
        builder.log.minor('Compressing assets');
        await Promise.all([
          builder.compress(`${out}/client`),
          builder.compress(`${out}/prerendered`)
        ]);
      }

      builder.log.minor('Building server');
      builder.writeServer(tmp);

      writeFileSync(
        `${tmp}/manifest.js`,
        [
          `export const manifest = ${builder.generateManifest({ relativePath: './' })};`,
          `export const prerendered = new Set(${JSON.stringify(builder.prerendered.paths)});`,
          `export const base = ${JSON.stringify(builder.config.kit.paths.base)};`
        ].join('\n\n')
      );

      const pkg = JSON.parse(readFileSync('package.json', 'utf8'));

      // Bundle the Vite output so that deployments only need
      // their production dependencies. Anything in devDependencies
      // will get included in the bundled code
      const serverBundle = await rollup({
        input: {
          index: `${tmp}/index.js`,
          manifest: `${tmp}/manifest.js`
        },
        external: [
          // dependencies could have deep exports, so we need a regex
          ...Object.keys(pkg.dependencies || {}).map((d) => new RegExp(`^${d}(\/.*)?$`))
        ],
        plugins: [
          nodeResolve({
            preferBuiltins: true,
            exportConditions: ['node']
          }),
          // @ts-ignore https://github.com/rollup/plugins/issues/1329
          commonjs({ strictRequires: true }),
          // @ts-ignore https://github.com/rollup/plugins/issues/1329
          json()
        ]
      });

      await serverBundle.write({
        dir: `${out}/server`,
        format: 'esm',
        sourcemap: true,
        chunkFileNames: 'chunks/[name]-[hash].js'
      });

      const mainOut = `${tmp}/main/index.js`;
      const preloadOut = `${tmp}/preload/index.js`;

      // Build main and preload files directly in the adapter using Rollup
      await buildEntryWithRollup('src/main.ts', mainOut, ['electron', 'SERVER', 'MANIFEST'], false);
      await buildEntryWithRollup('src/preload.ts', preloadOut, ['electron'], false);

      const replace = {
        SERVER: '../server/index.js',
        MANIFEST: '../server/manifest.js',
        PRELOAD: '../preload/index.js'
      };

      builder.copy(mainOut, `${out}/main/index.cjs`, {
        replace,
      });

      builder.copy(preloadOut, `${out}/preload/index.js`, {
        replace,
      });
    },

    supports: {
      read: () => true
    }
  };
}

/**
 * Vite plugin to build Electron main/preload files using Rollup
 * Usage: import { electronPlugin } from 'adapter-electron'
 */
export function electronPlugin(options = {}) {
  const {
    mainEntry = 'src/main.ts',
    preloadEntry = 'src/preload.ts',
    mainOut = 'out/main/index.cjs',
    preloadOut = 'out/preload/index.cjs',
    externalMain = ['electron', 'electron-log', 'electron-is-dev', "SERVER", "MANIFEST"],
    externalPreload = ['electron']
  } = options;

  return {
    name: 'sveltekit-electron',
    apply: 'serve',
    async buildStart() {
      const isDev = process.env.NODE_ENV === 'development';
      await buildEntryWithRollup(mainEntry, mainOut, externalMain, isDev);
      await buildEntryWithRollup(preloadEntry, preloadOut, externalPreload, isDev);
    }
  };
}
