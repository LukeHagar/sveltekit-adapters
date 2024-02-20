# adapter-appwrite

## A SvelteKit adapter for Appwrite (open-runtime) environments

This is a SvelteKit adapter to compile SvleteKit apps to run as Appwrite functions.

When configuring your Appwrite function you will specify the entry point as `build/entry.js`.  

Below is an example of how to use this adapter in your SvelteKit project.

```js
import adapter from "adapter-appwrite";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://kit.svelte.dev/docs/integrations#preprocessors
  // for more information about preprocessors
  preprocess: vitePreprocess(),

  kit: {
    // adapter-auto only supports some environments, see https://kit.svelte.dev/docs/adapter-auto for a list.
    // If your environment is not supported or you settled on a specific environment, switch out the adapter.
    // See https://kit.svelte.dev/docs/adapters for more information about adapters.
    adapter: adapter(),
  },
};

export default config;

```
