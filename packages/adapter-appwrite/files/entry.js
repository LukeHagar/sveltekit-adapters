import { Server } from 'SERVER';
import { manifest, prerendered } from 'MANIFEST';
import { existsSync, readFileSync } from 'fs';
import { lookup } from 'mime-types';
import path from 'path';
import { fileURLToPath } from 'url';

const server = new Server(manifest);

const dir = path.dirname(fileURLToPath(import.meta.url));

/**
 * @param {string} path
 * @param {boolean} isClient
 * @param {boolean} isStatic
 * @returns {Record<string, string> }
 * */
function mapCacheControl(path, isClient, isStatic) {
	if (isClient && path.startsWith(`/${manifest.appPath}/immutable/`)) {
		return { 'cache-control': 'public,max-age=31536000,immutable' };
	} else if (isStatic) {
		return { 'cache-control': 'public,max-age=31536000' };
	} else {
		return { 'cache-control': 'public,max-age=0,must-revalidate' };
	}
}

/**
 * @param {string} path
 * @param {boolean} client
 * @param {boolean} isStatic
 * @returns {{ file: Buffer | undefined, headers: Record<string, string> }}
 */
function getStaticfile(path, client = false, isStatic = false) {
	if (!existsSync(path)) return { file: undefined, headers: {} };

	const file = readFileSync(path);
	const mimeType = lookup(path);
	const headers = {
		'Content-Type': mimeType ? mimeType : 'text/plain',
		...mapCacheControl(path, client, isStatic)
	};

	return { file, headers };
}

/** @type {import('./entry.js').default} */
export default async (opt) => {
	const { req, res, log, error } = opt;

	await server.init({
		env: process.env
	});

	const url = new URL(req.url);

	log(JSON.stringify(manifest, null, 4));

	// client files first
	if (url.pathname.startsWith(`/${manifest.appPath}`)) {
		// split the pathname into parts and join them with the dir
		const filePath = path.join(dir, 'client', url.pathname);
		log('client asset');
		log(url.pathname);
		log(filePath);
		const { file, headers } = getStaticfile(filePath, true);
		if (file) return res.send(file.toString(), 200, headers);
	}

	// //prerendered assets
	let { pathname } = url;

	try {
		pathname = decodeURIComponent(pathname);
	} catch {
		// ignore invalid URI
	}

	const stripped_pathname = pathname.replace(/\/$/, '');

	// prerendered pages and /static files
	let is_static_asset = false;
	const filename = stripped_pathname.substring(1);
	if (filename) {
		is_static_asset = manifest.assets.has(filename);
	}

	// static assets
	if (is_static_asset) {
		// split the pathname into parts and join them with the dir
		const filePath = path.join(dir, 'client', filename);
		log('static asset');
		log(filename);
		log(filePath);
		const { file, headers } = getStaticfile(filePath, false, true);
		if (file) return res.send(file, 200, headers);
	}

	if (prerendered.has(pathname)) {
		// split the pathname into parts and join them with the dir
		const filePath = path.join(dir, 'prerendered', pathname + '.html');
		log('prerendered asset');
		log(pathname);
		log(filePath);
		const { file, headers } = getStaticfile(filePath, false);
		if (file) return res.send(file.toString(), 200, headers);
	}

	const body = req.body !== '' ? req.body : undefined;

	const request = new Request(req.url, {
		headers: req.headers,
		body,
		method: req.method
	});

	const response = await server.respond(request, {
		getClientAddress: () => request.headers.get('x-forwarded-for')
	});

	const respBody = await response.text();

	return res.send(respBody, response.status, Object.fromEntries(response.headers.entries()));
};
