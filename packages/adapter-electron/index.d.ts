import { Adapter } from '@sveltejs/kit';
import type { AdapterOptions as NodeAdapterOptions } from '@sveltejs/adapter-node';
import './ambient.js';

interface AdapterOptions {
  out?: string;
  options?: NodeAdapterOptions;
}

export default function plugin(options?: AdapterOptions): Adapter;
