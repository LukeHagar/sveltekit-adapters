import type { ProtocolRequest, GlobalRequest } from "electron";
import type { BrowserWindow, Session } from "electron/main";
import { IncomingMessage } from 'node:http';

/**
 * Sets up the native Electron protocol handler for SvelteKit
 * 
 * This function:
 * 1. Initializes the SvelteKit server
 * 2. Registers the 'app' protocol scheme as privileged
 * 3. Handles all app:// requests for static assets, prerendered pages, and SSR
 * 
 * @returns Promise that resolves when the protocol handler is set up
 */
export function setupHandler(mainWindow: BrowserWindow): Promise<() => void>; 

export function registerAppScheme(): void;

export function getPreloadPath(): string;

export function createRequest(request: GlobalRequest, session: Session): Promise<IncomingMessage>;