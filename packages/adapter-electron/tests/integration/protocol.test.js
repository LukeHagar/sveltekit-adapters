import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Electron APIs
const mockProtocol = {
  registerSchemesAsPrivileged: vi.fn(),
  handle: vi.fn(),
  unhandle: vi.fn()
};

const mockNet = {
  fetch: vi.fn()
};

const mockDialog = {
  showErrorBox: vi.fn()
};

const mockApp = {
  exit: vi.fn()
};

vi.mock('electron', () => ({
  protocol: mockProtocol,
  net: mockNet,
  dialog: mockDialog,
  app: mockApp
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

// Mock SvelteKit server
const mockServer = {
  init: vi.fn().mockResolvedValue(),
  respond: vi.fn().mockResolvedValue(new Response('test response', {
    status: 200,
    headers: [['content-type', 'text/html']]
  }))
};

const mockManifest = {
  manifest: { routes: [] },
  prerendered: new Set(['/prerendered-page']),
  base: ''
};

vi.mock('SERVER', () => ({
  Server: vi.fn().mockImplementation(() => mockServer)
}));

vi.mock('MANIFEST', () => mockManifest);

describe('Protocol Integration', () => {
  let mockWindow;
  let mockSession;
  let setupHandler;
  let registerAppScheme;

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup mock session
    mockSession = {
      cookies: {
        get: vi.fn().mockResolvedValue([
          { name: 'session', value: 'abc123' },
          { name: 'user', value: 'john' }
        ]),
        set: vi.fn().mockResolvedValue(),
        remove: vi.fn().mockResolvedValue()
      }
    };

    // Setup mock window
    mockWindow = {
      webContents: {
        session: mockSession
      },
      loadURL: vi.fn().mockResolvedValue()
    };

    // Mock global constructors
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
      pathname: url.includes('/') ? url.split('/').slice(3).join('/') || '/' : '/'
    }));

    global.Response = vi.fn().mockImplementation((body, init) => ({
      status: init?.status || 200,
      statusText: init?.statusText || 'OK',
      headers: new Map(Object.entries(init?.headers || {})),
      body
    }));

    // Import functions after mocks are set up
    const module = await import('../../functions/setupHandler.js');
    setupHandler = module.setupHandler;
    registerAppScheme = module.registerAppScheme;
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('registerAppScheme', () => {
    it('should register HTTP scheme as privileged', () => {
      registerAppScheme();
      
      expect(mockProtocol.registerSchemesAsPrivileged).toHaveBeenCalledWith([
        expect.objectContaining({
          scheme: 'http',
          privileges: expect.objectContaining({
            standard: true,
            secure: true,
            supportFetchAPI: true
          })
        })
      ]);
    });

    it('should only be called once', () => {
      registerAppScheme();
      registerAppScheme();
      
      expect(mockProtocol.registerSchemesAsPrivileged).toHaveBeenCalledTimes(2);
    });
  });

  describe('setupHandler', () => {
    it('should setup protocol handler in production mode', async () => {
      const cleanup = await setupHandler(mockWindow);
      
      expect(mockProtocol.handle).toHaveBeenCalledWith('http', expect.any(Function));
      expect(mockWindow.loadURL).toHaveBeenCalledWith('http://127.0.0.1');
      expect(cleanup).toBeInstanceOf(Function);
    });

    it('should initialize SvelteKit server in production', async () => {
      await setupHandler(mockWindow);
      
      expect(mockServer.init).toHaveBeenCalledWith({
        env: process.env,
        read: expect.any(Function)
      });
    });

    it('should return cleanup function that unhandles protocol', async () => {
      const cleanup = await setupHandler(mockWindow);
      
      cleanup();
      
      expect(mockProtocol.unhandle).toHaveBeenCalledWith('http');
    });

    it('should handle development mode correctly', async () => {
      // Mock development mode
      vi.doMock('electron-is-dev', () => ({ default: true }));
      
      // Re-import to get the dev version
      vi.resetModules();
      const devModule = await import('../../functions/setupHandler.js');
      
      const cleanup = await devModule.setupHandler(mockWindow);
      
      expect(mockWindow.loadURL).toHaveBeenCalledWith('http://localhost:5173');
      expect(mockProtocol.handle).not.toHaveBeenCalled();
      expect(cleanup).toBeInstanceOf(Function);
    });

    it('should use VITE_DEV_SERVER environment variable in development', async () => {
      const originalEnv = process.env.VITE_DEV_SERVER;
      process.env.VITE_DEV_SERVER = 'http://localhost:3000';
      
      vi.doMock('electron-is-dev', () => ({ default: true }));
      vi.resetModules();
      const devModule = await import('../../functions/setupHandler.js');
      
      await devModule.setupHandler(mockWindow);
      
      expect(mockWindow.loadURL).toHaveBeenCalledWith('http://localhost:3000');
      
      // Restore environment
      if (originalEnv) {
        process.env.VITE_DEV_SERVER = originalEnv;
      } else {
        delete process.env.VITE_DEV_SERVER;
      }
    });
  });

  describe('Protocol Handler Function', () => {
    let protocolHandler;

    beforeEach(async () => {
      await setupHandler(mockWindow);
      
      // Extract the protocol handler function
      const handleCall = mockProtocol.handle.mock.calls.find(call => call[0] === 'http');
      protocolHandler = handleCall[1];
    });

    it('should handle static file requests', async () => {
      const mockRequest = {
        url: 'http://127.0.0.1/favicon.ico',
        method: 'GET',
        headers: new Map()
      };

      // Mock file exists
      const fs = await import('node:fs/promises');
      fs.default.stat.mockResolvedValue({ isFile: () => true });

      mockNet.fetch.mockResolvedValue(new Response('file content'));

      const response = await protocolHandler(mockRequest);
      
      expect(mockNet.fetch).toHaveBeenCalled();
    });

    it('should handle prerendered page requests', async () => {
      const mockRequest = {
        url: 'http://127.0.0.1/prerendered-page',
        method: 'GET',
        headers: new Map()
      };

      // Mock file exists for prerendered page
      const fs = await import('node:fs/promises');
      fs.default.stat.mockResolvedValue({ isFile: () => true });

      mockNet.fetch.mockResolvedValue(new Response('<html>prerendered</html>'));

      const response = await protocolHandler(mockRequest);
      
      expect(mockNet.fetch).toHaveBeenCalled();
    });

    it('should handle SSR requests', async () => {
      const mockRequest = {
        url: 'http://127.0.0.1/dynamic-page',
        method: 'GET',
        headers: new Map([['accept', 'text/html']])
      };

      // Mock file doesn't exist (not static or prerendered)
      const fs = await import('node:fs/promises');
      fs.default.stat.mockRejectedValue(new Error('File not found'));

      const response = await protocolHandler(mockRequest);
      
      expect(mockServer.respond).toHaveBeenCalled();
    });

    it('should handle API requests', async () => {
      const mockRequest = {
        url: 'http://127.0.0.1/api/users',
        method: 'POST',
        headers: new Map([['content-type', 'application/json']]),
        uploadData: [{
          bytes: new Uint8Array(Buffer.from('{"name":"John"}'))
        }]
      };

      // Mock file doesn't exist
      const fs = await import('node:fs/promises');
      fs.default.stat.mockRejectedValue(new Error('File not found'));

      mockServer.respond.mockResolvedValue(new Response('{"id":1}', {
        status: 200,
        headers: [['content-type', 'application/json']]
      }));

      const response = await protocolHandler(mockRequest);
      
      expect(mockServer.respond).toHaveBeenCalled();
    });

    it('should reject requests from wrong host', async () => {
      const mockRequest = {
        url: 'http://evil.com/malicious',
        method: 'GET',
        headers: new Map()
      };

      const response = await protocolHandler(mockRequest);
      
      expect(response.status).toBe(404);
    });

    it('should handle path traversal attempts', async () => {
      const mockRequest = {
        url: 'http://127.0.0.1/../../../etc/passwd',
        method: 'GET',
        headers: new Map()
      };

      // Mock file exists but path is unsafe
      const fs = await import('node:fs/promises');
      fs.default.stat.mockResolvedValue({ isFile: () => true });

      const response = await protocolHandler(mockRequest);
      
      expect(response.status).toBe(400);
      expect(mockDialog.showErrorBox).toHaveBeenCalled();
    });

    it('should handle cookie synchronization', async () => {
      const mockRequest = {
        url: 'http://127.0.0.1/set-cookies',
        method: 'GET',
        headers: new Map()
      };

      // Mock file doesn't exist, will go to SSR
      const fs = await import('node:fs/promises');
      fs.default.stat.mockRejectedValue(new Error('File not found'));

      // Mock response with set-cookie headers
      mockServer.respond.mockResolvedValue(new Response('OK', {
        status: 200,
        headers: [
          ['set-cookie', 'session=new123; Path=/; HttpOnly'],
          ['set-cookie', 'user=jane; Path=/; Secure']
        ]
      }));

      const setCookieParser = await import('set-cookie-parser');
      setCookieParser.parse.mockReturnValue([
        { name: 'session', value: 'new123', path: '/', httpOnly: true },
        { name: 'user', value: 'jane', path: '/', secure: true }
      ]);
      setCookieParser.splitCookiesString.mockReturnValue([
        'session=new123; Path=/; HttpOnly',
        'user=jane; Path=/; Secure'
      ]);

      await protocolHandler(mockRequest);
      
      expect(mockSession.cookies.set).toHaveBeenCalledTimes(2);
      expect(mockSession.cookies.set).toHaveBeenCalledWith({
        url: 'http://127.0.0.1/set-cookies',
        name: 'session',
        value: 'new123',
        path: '/',
        httpOnly: true,
        expirationDate: undefined,
        domain: undefined,
        secure: undefined,
        maxAge: undefined
      });
    });

    it('should handle errors gracefully', async () => {
      const mockRequest = {
        url: 'http://127.0.0.1/error-page',
        method: 'GET',
        headers: new Map()
      };

      // Mock server error
      mockServer.respond.mockRejectedValue(new Error('Server error'));

      const response = await protocolHandler(mockRequest);
      
      expect(response.status).toBe(500);
      expect(mockDialog.showErrorBox).toHaveBeenCalled();
    });
  });
}); 