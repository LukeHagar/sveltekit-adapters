import type { BrowserWindow, Session, GlobalRequest } from 'electron';

/**
 * Sets up the protocol handler for serving SvelteKit app content
 * 
 * This function handles both development and production modes:
 * 
 * **Development Mode:**
 * - Loads the dev server URL (VITE_DEV_SERVER or localhost:5173)
 * - Returns early without protocol interception
 * 
 * **Production Mode:**
 * - Initializes the SvelteKit server with the built app
 * - Sets up directory paths for client assets and prerendered pages
 * - Registers HTTP protocol handler that serves:
 *   1. Static client assets (with caching headers)
 *   2. Prerendered pages from the prerendered directory
 *   3. SSR/API routes via the SvelteKit server
 * - Synchronizes cookies between Electron session and SvelteKit responses
 * - Validates requests to prevent external HTTP access
 * - Protects against path traversal attacks
 * 
 * @param mainWindow - The main Electron browser window
 * @returns A cleanup function that unregisters the protocol handler
 */
export function setupHandler(mainWindow: BrowserWindow): Promise<() => void>; 

/**
 * Registers the HTTP scheme as privileged for Electron
 * 
 * This must be called before the app is ready. It configures the HTTP protocol
 * to have standard web privileges including:
 * - Standard scheme behavior
 * - Secure context
 * - Fetch API support
 */
export function registerAppScheme(): void;

/**
 * Gets the absolute path to the preload script
 * 
 * In development mode, points to the source preload script.
 * In production, points to the built preload script.
 * 
 * @returns Absolute path to the preload script
 */
export function getPreloadPath(): string;

/**
 * Converts an Electron protocol request to a Web API Request object
 * 
 * This function:
 * 1. Extracts headers from the Electron request and normalizes them
 * 2. Retrieves cookies from the session and adds them to headers
 * 3. Handles request body data from uploadData or request.body
 * 4. Creates a proper Web API Request object that SvelteKit expects
 * 
 * @param request - The Electron protocol request object
 * @param session - The Electron session for cookie access
 * @returns A Web API Request object compatible with SvelteKit
 */
export function createRequest(request: GlobalRequest, session: Session): Promise<Request>;

/**
 * Checks if a file exists and is a regular file
 * 
 * @param filePath - Path to the file to check
 * @returns True if the file exists and is a regular file, false otherwise
 */
export function fileExists(filePath: string): Promise<boolean>;

/**
 * Determines the MIME type of a file based on its extension
 * 
 * @param filePath - Path to the file
 * @returns The MIME type string, defaults to 'application/octet-stream' for unknown extensions
 */
export function getMimeType(filePath: string): string;

/**
 * Validates that a target path is safe relative to a base directory
 * 
 * Prevents directory traversal attacks by ensuring the target path:
 * - Is within the base directory (no .. traversal)
 * - Is not an absolute path outside the base
 * 
 * @param base - The base directory path
 * @param target - The target file path to validate
 * @returns True if the path is safe, false if it's a potential security risk
 */
export function isSafePath(base: string, target: string): boolean;