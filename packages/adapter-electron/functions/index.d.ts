import type { BrowserWindow } from 'electron';

export interface ProtocolOptions {
  baseUrl?: string;
}

export interface ProtocolUtils {
  configure: (options: ProtocolOptions) => void;
  isConfigured: () => boolean;
}

export function start(): Promise<string | undefined>;
export function load(mainWindow: BrowserWindow, path?: string): void;
export const protocolUtils: ProtocolUtils;
