# SvelteKit Adapters

This repo contains the below adapters and example implementations for each adapter.

## Appwrite adapter

[Adapter](https://github.com/LukeHagar/sveltekit-adapters/tree/main/packages/adapter-appwrite) | [Example](https://github.com/LukeHagar/sveltekit-adapters/tree/main/examples/appwrite)  

Deploy SvelteKit applications as appwrite functions.

I have tested and validated the implementation with the node20 runtime. Other runtimes may work but have not been tested.

## Electron adapter

[Adapter](https://github.com/LukeHagar/sveltekit-adapters/tree/main/packages/adapter-electron) | [Example](https://github.com/LukeHagar/sveltekit-adapters/tree/main/examples/electron)  

Deploy SvelteKit applications as electron desktop applications.

This adapter does require additional files to be added to the project, and requires the use of the package `electron-vite` to properly handle the electron implementation.  
Please look at the [example](https://github.com/LukeHagar/sveltekit-adapters/tree/main/examples/electron) implementation for more information.

## What's inside?

This repo includes the following packages and examples:

### Examples

- `appwrite`: a [SvelteKit](https://kit.svelte.dev) example app that uses the `adapter-appwrite` adapter [[Link](https://github.com/LukeHagar/sveltekit-adapters/tree/main/examples/appwrite)]  
- `electron`: a [SvelteKit](https://kit.svelte.dev) example app that uses the `adapter-electron` adapter [[Link](https://github.com/LukeHagar/sveltekit-adapters/tree/main/examples/electron)]

### Packages

- `adapter-appwrite`: a [SvelteKit](https://kit.svelte.dev) adapter for deploying applications as appwrite functions [[Link](https://github.com/LukeHagar/sveltekit-adapters/tree/main/packages/adapter-appwrite)]
- `adapter-electron`: a [SvelteKit](https://kit.svelte.dev) adapter for deploying applications as electron desktop applications [[Link](https://github.com/LukeHagar/sveltekit-adapters/tree/main/packages/adapter-electron)]