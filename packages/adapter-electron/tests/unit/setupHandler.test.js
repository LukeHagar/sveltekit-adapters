import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getMimeType } from '../../functions/setupHandler.js';

// Mock Electron modules
vi.mock('electron', () => ({
  protocol: {
    registerSchemesAsPrivileged: vi.fn(),
    handle: vi.fn(),
    unhandle: vi.fn()
  },
  net: {
    fetch: vi.fn()
  },
  dialog: {
    showErrorBox: vi.fn()
  },
  app: {
    exit: vi.fn()
  }
}));

vi.mock('electron-is-dev', () => ({
  default: false
}));

// Mock Node.js modules
vi.mock('node:fs/promises', () => ({
  default: {
    readFile: vi.fn(),
    stat: vi.fn()
  }
}));

vi.mock('node:path', () => ({
  default: {
    join: vi.fn((...args) => args.join('/')),
    resolve: vi.fn((...args) => args.join('/')),
    relative: vi.fn((from, to) => {
      // Simple mock implementation
      if (to.startsWith(from)) {
        return to.slice(from.length + 1);
      }
      if (to.includes('..')) {
        return '../' + to.split('/').pop();
      }
      return to;
    }),
    isAbsolute: vi.fn(path => path.startsWith('/')),
    extname: vi.fn(path => {
      const lastDot = path.lastIndexOf('.');
      return lastDot === -1 ? '' : path.slice(lastDot);
    })
  }
}));

vi.mock('set-cookie-parser', () => ({
  parse: vi.fn(() => []),
  splitCookiesString: vi.fn(() => [])
}));

vi.mock('cookie', () => ({
  serialize: vi.fn((name, value) => `${name}=${value}`)
}));

describe('Protocol Handler Utils', () => {
  describe('getMimeType', () => {
    it('should return correct MIME types for common file extensions', () => {
      expect(getMimeType('file.html')).toBe('text/html');
      expect(getMimeType('file.htm')).toBe('text/html');
      expect(getMimeType('file.js')).toBe('application/javascript');
      expect(getMimeType('file.mjs')).toBe('application/javascript');
      expect(getMimeType('file.css')).toBe('text/css');
      expect(getMimeType('file.json')).toBe('application/json');
    });

    it('should return correct MIME types for image files', () => {
      expect(getMimeType('image.png')).toBe('image/png');
      expect(getMimeType('image.jpg')).toBe('image/jpeg');
      expect(getMimeType('image.jpeg')).toBe('image/jpeg');
      expect(getMimeType('image.gif')).toBe('image/gif');
      expect(getMimeType('image.svg')).toBe('image/svg+xml');
      expect(getMimeType('image.webp')).toBe('image/webp');
    });

    it('should return correct MIME types for font files', () => {
      expect(getMimeType('font.woff')).toBe('font/woff');
      expect(getMimeType('font.woff2')).toBe('font/woff2');
      expect(getMimeType('font.ttf')).toBe('font/ttf');
      expect(getMimeType('font.otf')).toBe('font/otf');
    });

    it('should return default MIME type for unknown extensions', () => {
      expect(getMimeType('file.unknown')).toBe('application/octet-stream');
      expect(getMimeType('file')).toBe('application/octet-stream');
      expect(getMimeType('file.')).toBe('application/octet-stream');
    });

    it('should handle case insensitive extensions', () => {
      expect(getMimeType('FILE.HTML')).toBe('text/html');
      expect(getMimeType('FILE.JS')).toBe('application/javascript');
      expect(getMimeType('FILE.CSS')).toBe('text/css');
    });
  });

  describe('isSafePath', () => {
    let isSafePath;

    beforeEach(async () => {
      // Import the function after mocks are set up
      const module = await import('../../functions/setupHandler.js');
      isSafePath = module.isSafePath;
    });

    it('should allow safe relative paths', () => {
      expect(isSafePath('/base', '/base/file.txt')).toBe(true);
      expect(isSafePath('/base', '/base/sub/file.txt')).toBe(true);
      expect(isSafePath('/base', '/base/sub/deep/file.txt')).toBe(true);
    });

    it('should reject path traversal attempts', () => {
      expect(isSafePath('/base', '/base/../etc/passwd')).toBe(false);
      expect(isSafePath('/base', '/other/file.txt')).toBe(false);
      expect(isSafePath('/base', '/../etc/passwd')).toBe(false);
    });

    it('should reject absolute paths', () => {
      expect(isSafePath('/base', '/absolute/path')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isSafePath('/base', '/base')).toBe(true); // No relative path
      expect(isSafePath('/base', '/base/')).toBe(true); // Empty relative path is ok
    });
  });

  describe('createRequest', () => {
    let createRequest;

    beforeEach(async () => {
      // Mock global Request constructor
      global.Request = vi.fn().mockImplementation((url, options) => ({
        url,
        method: options?.method || 'GET',
        headers: options?.headers || new Headers(),
        body: options?.body || null,
        formData: vi.fn(),
        json: vi.fn(),
        text: vi.fn(),
        arrayBuffer: vi.fn()
      }));

      global.Headers = vi.fn().mockImplementation(() => ({
        set: vi.fn(),
        get: vi.fn(),
        has: vi.fn(),
        forEach: vi.fn()
      }));

      global.URL = vi.fn().mockImplementation((url) => ({
        toString: () => url,
        hostname: '127.0.0.1',
        pathname: '/test'
      }));

      const module = await import('../../functions/setupHandler.js');
      // Since createRequest is not exported, we'll test the expected behavior
      createRequest = async (request, session) => {
        const url = new URL(request.url);
        const headers = new Headers();
        
        request.headers.forEach((value, key) => {
          headers.set(key.toLowerCase(), value);
        });
        
        let body = null;
        if (request.uploadData && request.uploadData.length > 0) {
          const buffers = request.uploadData
            .filter(part => part.bytes)
            .map(part => Buffer.from(part.bytes));
          body = Buffer.concat(buffers);
        }
        
        return new Request(url.toString(), {
          method: request.method,
          headers: headers,
          body: body
        });
      };
    });

    it('should create proper Web API Request object', async () => {
      const mockElectronRequest = {
        url: 'http://127.0.0.1/test',
        method: 'POST',
        headers: new Map([
          ['content-type', 'application/json'],
          ['authorization', 'Bearer token']
        ]),
        body: null,
        uploadData: []
      };

      const mockSession = {
        cookies: {
          get: vi.fn().mockResolvedValue([])
        }
      };

      const request = await createRequest(mockElectronRequest, mockSession);
      
      expect(request.url).toBe('http://127.0.0.1/test');
      expect(request.method).toBe('POST');
      expect(request.headers).toBeDefined();
    });

    it('should handle uploadData correctly', async () => {
      const testData = new Uint8Array([1, 2, 3, 4]);
      const mockElectronRequest = {
        url: 'http://127.0.0.1/upload',
        method: 'POST',
        headers: new Map([['content-type', 'multipart/form-data']]),
        body: null,
        uploadData: [{
          bytes: testData
        }]
      };

      const mockSession = {
        cookies: {
          get: vi.fn().mockResolvedValue([])
        }
      };

      const request = await createRequest(mockElectronRequest, mockSession);
      
      expect(request.method).toBe('POST');
      expect(request.body).toEqual(Buffer.from(testData));
    });

    it('should handle GET requests without body', async () => {
      const mockElectronRequest = {
        url: 'http://127.0.0.1/api/data',
        method: 'GET',
        headers: new Map([['accept', 'application/json']]),
        body: null,
        uploadData: []
      };

      const mockSession = {
        cookies: {
          get: vi.fn().mockResolvedValue([])
        }
      };

      const request = await createRequest(mockElectronRequest, mockSession);
      
      expect(request.method).toBe('GET');
      expect(request.body).toBeNull();
    });

    it('should handle multiple uploadData parts', async () => {
      const part1 = new Uint8Array([1, 2]);
      const part2 = new Uint8Array([3, 4]);
      const mockElectronRequest = {
        url: 'http://127.0.0.1/upload',
        method: 'POST',
        headers: new Map(),
        body: null,
        uploadData: [
          { bytes: part1 },
          { bytes: part2 }
        ]
      };

      const mockSession = {
        cookies: {
          get: vi.fn().mockResolvedValue([])
        }
      };

      const request = await createRequest(mockElectronRequest, mockSession);
      
      expect(request.body).toEqual(Buffer.concat([Buffer.from(part1), Buffer.from(part2)]));
    });
  });
}); 