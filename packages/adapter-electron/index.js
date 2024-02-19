// adapter-electron.js
import { fileURLToPath } from 'url';
import adapter from '@sveltejs/adapter-node';

const files = fileURLToPath(new URL('./files', import.meta.url).href);

/** @type {import('./index.js').default} */
export default function (opts = {}) {
  const { out = 'out/renderer', options } = opts;

  return {
    name: 'adapter-electron',

    async adapt(builder) {
      builder.rimraf(out);
      builder.mkdirp(out);

      await adapter({ out, ...options }).adapt(builder);
    },
    supports: {
      read: () => true
    }
  };
}
