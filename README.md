# SvelteKit Adapters

This repo contains the below adapters and example implementations for each adapter.

- [SvelteKit Adapters](#sveltekit-adapters)
  - [Adapters](#adapters)
    - [Appwrite adapter](#appwrite-adapter)
    - [Electron adapter](#electron-adapter)
  - [What's inside?](#whats-inside)
    - [Examples](#examples)
    - [Packages](#packages)

## Adapters

### Appwrite adapter

[Adapter](https://github.com/LukeHagar/sveltekit-adapters/tree/main/packages/adapter-appwrite) | [Example](https://github.com/LukeHagar/sveltekit-adapters/tree/main/examples/appwrite)  

Deploy SvelteKit applications as appwrite functions.

I have tested and validated the implementation with the node20 runtime. Other runtimes may work but have not been tested.

### Electron adapter

[Adapter](https://github.com/LukeHagar/sveltekit-adapters/tree/main/packages/adapter-electron) | [Example](https://github.com/LukeHagar/sveltekit-adapters/tree/main/examples/electron)  

Deploy SvelteKit applications as Electron desktop applications with native protocol handling.

This adapter provides seamless integration between SvelteKit and Electron, featuring:
- **Native Protocol Handling**: Uses Electron's `protocol.handle()` API for production
- **Development Integration**: Seamless Vite dev server integration with hot module replacement
- **Full SvelteKit Support**: SSR, API routes, static assets, prerendered pages, and form actions
- **Clean Architecture**: All Electron integration code is encapsulated
- **Production Ready**: Works with electron-builder and similar packaging tools

The adapter automatically handles the build process and provides helper functions for setting up the Electron main process. Please look at the [example](https://github.com/LukeHagar/sveltekit-adapters/tree/main/examples/electron) implementation for detailed setup instructions.

## What's inside?

This repo includes the following packages and examples:

### Examples

- `appwrite`: a [SvelteKit](https://kit.svelte.dev) example app that uses the `adapter-appwrite` adapter [[Link](https://github.com/LukeHagar/sveltekit-adapters/tree/main/examples/appwrite)]  
- `electron`: a [SvelteKit](https://kit.svelte.dev) example app that uses the `adapter-electron` adapter with native protocol handling [[Link](https://github.com/LukeHagar/sveltekit-adapters/tree/main/examples/electron)]

### Packages

- `adapter-appwrite`: a [SvelteKit](https://kit.svelte.dev) adapter for deploying applications as appwrite functions [[Link](https://github.com/LukeHagar/sveltekit-adapters/tree/main/packages/adapter-appwrite)]
- `adapter-electron`: a [SvelteKit](https://kit.svelte.dev) adapter for deploying applications as Electron desktop applications with native protocol handling and Vite integration [[Link](https://github.com/LukeHagar/sveltekit-adapters/tree/main/packages/adapter-electron)]