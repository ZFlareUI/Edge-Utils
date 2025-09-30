/**
 * WebSocket utilities tests
 * Tests connection management, message handling, and middleware functionality
 */

const {
  WebSocketManager,
  WebSocketUtils,
  WebSocketState,
  MessageType,
  createWebSocketMiddleware
} = require('../src/websocket/index.js');

// Mock WebSocket for testing
class MockWebSocket {
  constructor(url, protocols) {
    this.url = url;
    this.protocols = protocols;
    this.readyState = WebSocketState.CONNECTING;
    this.listeners = new Map();

    // Simulate connection opening
    setTimeout(() => {
      this.readyState = WebSocketState.OPEN;
      this._trigger('open', { type: 'open' });
    }, 10);
  }

  addEventListener(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  send(data) {
    this.lastSentData = data;
  }

  close(code = 1000, reason = '') {
    this.readyState = WebSocketState.CLOSED;
    this._trigger('close', { code, reason, type: 'close' });
  }

  _trigger(event, data) {
    const listeners = this.listeners.get(event) || [];
    listeners.forEach(callback => callback(data));
  }
}

// Mock WebSocketPair for middleware tests
global.WebSocketPair = class {
  constructor() {
    this[0] = new MockWebSocket(); // client
    this[1] = new MockWebSocket(); // server
  }
};

// Mock Response for middleware tests
global.Response = class {
  constructor(body, options = {}) {
    this.status = options.status || 200;
    this.webSocket = options.webSocket;
    this.body = body;
  }

  async text() {
    return this.body || '';
  }
};

describe('WebSocketManager', () => {
  let manager;
  let mockWS;

  beforeEach(() => {
    // Mock global WebSocket
    global.WebSocket = MockWebSocket;
    manager = new WebSocketManager();
  });

  afterEach(() => {
    // Clear all timers
    jest.clearAllTimers();
  });

  describe('Connection Management', () => {
    test('should create connection successfully', async () => {
      const ws = manager.connect('test', 'ws://example.com');
      expect(ws).toBeInstanceOf(MockWebSocket);
      expect(ws.url).toBe('ws://example.com');

      // Wait for connection to open
      await new Promise(resolve => setTimeout(resolve, 20));
      expect(manager.getState('test')).toBe(WebSocketState.OPEN);
    });

    test('should throw error for duplicate connection ID', () => {
      manager.connect('test', 'ws://example.com');
      expect(() => {
        manager.connect('test', 'ws://example.com');
      }).toThrow("Connection with id 'test' already exists");
    });

    test('should get connection state', async () => {
      expect(manager.getState('nonexistent')).toBe(WebSocketState.CLOSED);
      manager.connect('test', 'ws://example.com');

      // Wait for connection to open
      await new Promise(resolve => setTimeout(resolve, 20));
      expect(manager.getState('test')).toBe(WebSocketState.OPEN);
    });

    test('should list active connections', async () => {
      manager.connect('conn1', 'ws://example.com');
      manager.connect('conn2', 'ws://example.com');
      manager.close('conn2');

      // Wait for connections to open
      await new Promise(resolve => setTimeout(resolve, 20));

      const active = manager.getActiveConnections();
      expect(active).toContain('conn1');
      expect(active).not.toContain('conn2');
    });
  });

  describe('Message Sending', () => {
    beforeEach(async () => {
      mockWS = manager.connect('test', 'ws://example.com');
      // Wait for connection to open
      await new Promise(resolve => setTimeout(resolve, 20));
    });

    test('should send text message', () => {
      manager.send('test', 'hello world');
      expect(mockWS.lastSentData).toBe('hello world');
    });

    test('should send JSON message', () => {
      const data = { type: 'test', payload: 'data' };
      manager.send('test', data);
      expect(mockWS.lastSentData).toBe(JSON.stringify(data));
    });

    test('should send binary message', () => {
      const buffer = new ArrayBuffer(8);
      manager.send('test', buffer, { binary: true });
      expect(mockWS.lastSentData).toBe(buffer);
    });

    test('should throw error for nonexistent connection', () => {
      expect(() => {
        manager.send('nonexistent', 'test');
      }).toThrow("Connection with id 'nonexistent' not found");
    });

    test('should throw error for closed connection', async () => {
      manager.close('test');
      // Wait for close to complete and cleanup
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(() => {
        manager.send('test', 'test');
      }).toThrow("Connection with id 'test' not found");
    });
  });

  describe('Broadcasting', () => {
    beforeEach(async () => {
      manager.connect('conn1', 'ws://example.com');
      manager.connect('conn2', 'ws://example.com');
      manager.connect('conn3', 'ws://example.com');
      // Wait for connections to open
      await new Promise(resolve => setTimeout(resolve, 20));
    });

    test('should broadcast to multiple connections', () => {
      manager.broadcast(['conn1', 'conn2'], 'broadcast message');

      const conn1 = manager.connections.get('conn1');
      const conn2 = manager.connections.get('conn2');

      expect(conn1.lastSentData).toBe('broadcast message');
      expect(conn2.lastSentData).toBe('broadcast message');
    });

    test('should handle broadcast errors', () => {
      manager.close('conn2');

      expect(() => {
        manager.broadcast(['conn1', 'conn2'], 'test');
      }).toThrow('Broadcast failed for connections: conn2');
    });
  });

  describe('Connection Closing', () => {
    test('should close connection gracefully', () => {
      const ws = manager.connect('test', 'ws://example.com');
      manager.close('test', 1000, 'Normal closure');

      expect(manager.getState('test')).toBe(WebSocketState.CLOSED);
      expect(manager.connections.has('test')).toBe(false);
    });

    test('should handle closing nonexistent connection', () => {
      expect(() => {
        manager.close('nonexistent');
      }).not.toThrow();
    });
  });

  describe('Event Handling', () => {
    test('should call onOpen callback', (done) => {
      const onOpen = jest.fn();
      manager = new WebSocketManager({ onOpen });

      manager.connect('test', 'ws://example.com');

      setTimeout(() => {
        expect(onOpen).toHaveBeenCalledWith('test', expect.any(Object));
        done();
      }, 20);
    });

    test('should call onMessage callback', (done) => {
      const onMessage = jest.fn();
      manager = new WebSocketManager({ onMessage });

      const ws = manager.connect('test', 'ws://example.com');

      setTimeout(() => {
        ws._trigger('message', { data: 'test message', type: 'message' });
        expect(onMessage).toHaveBeenCalledWith('test', expect.any(Object));
        done();
      }, 20);
    });

    test('should call onError callback', (done) => {
      const onError = jest.fn();
      manager = new WebSocketManager({ onError });

      const ws = manager.connect('test', 'ws://example.com');

      setTimeout(() => {
        ws._trigger('error', { type: 'error' });
        expect(onError).toHaveBeenCalledWith('test', expect.any(Object));
        done();
      }, 20);
    });

    test('should call onClose callback', (done) => {
      const onClose = jest.fn();
      manager = new WebSocketManager({ onClose });

      const ws = manager.connect('test', 'ws://example.com');

      setTimeout(() => {
        ws.close();
        setTimeout(() => {
          expect(onClose).toHaveBeenCalledWith('test', expect.any(Object));
          done();
        }, 10);
      }, 20);
    });
  });
});

describe('WebSocketUtils', () => {
  describe('Message Parsing', () => {
    test('should parse JSON text message', () => {
      const event = { data: '{"type":"test","payload":"data"}', type: 'message' };
      const parsed = WebSocketUtils.parseMessage(event);

      expect(parsed.type).toBe(MessageType.TEXT);
      expect(parsed.data).toEqual({ type: 'test', payload: 'data' });
      expect(parsed.isJson).toBe(true);
    });

    test('should parse plain text message', () => {
      const event = { data: 'hello world', type: 'message' };
      const parsed = WebSocketUtils.parseMessage(event);

      expect(parsed.type).toBe(MessageType.TEXT);
      expect(parsed.data).toBe('hello world');
      expect(parsed.isJson).toBe(false);
    });

    test('should parse binary message', () => {
      const buffer = new ArrayBuffer(8);
      const event = { data: buffer, type: 'message' };
      const parsed = WebSocketUtils.parseMessage(event);

      expect(parsed.type).toBe(MessageType.BINARY);
      expect(parsed.data).toBe(buffer);
      expect(parsed.isJson).toBe(false);
    });
  });

  describe('Message Creation', () => {
    test('should create structured message', () => {
      const message = WebSocketUtils.createMessage('test', { data: 'value' }, { id: 123 });

      const parsed = JSON.parse(message);
      expect(parsed.type).toBe('test');
      expect(parsed.payload).toEqual({ data: 'value' });
      expect(parsed.id).toBe(123);
      expect(parsed.timestamp).toBeDefined();
    });
  });

  describe('URL Validation', () => {
    test('should validate WebSocket URLs', () => {
      expect(WebSocketUtils.isValidWebSocketUrl('ws://example.com')).toBe(true);
      expect(WebSocketUtils.isValidWebSocketUrl('wss://example.com')).toBe(true);
      expect(WebSocketUtils.isValidWebSocketUrl('http://example.com')).toBe(false);
      expect(WebSocketUtils.isValidWebSocketUrl('invalid')).toBe(false);
    });
  });

  describe('Close Code Descriptions', () => {
    test('should return correct close code descriptions', () => {
      expect(WebSocketUtils.getCloseCodeDescription(1000)).toBe('Normal Closure');
      expect(WebSocketUtils.getCloseCodeDescription(1006)).toBe('Abnormal Closure');
      expect(WebSocketUtils.getCloseCodeDescription(9999)).toBe('Unknown Close Code');
    });
  });
});

describe('WebSocket Middleware', () => {
  let middleware;

  beforeEach(() => {
    middleware = createWebSocketMiddleware();
  });

  describe('Upgrade Handling', () => {
    test('should handle WebSocket upgrade request', async () => {
      const request = {
        headers: new Map([['Upgrade', 'websocket']])
      };

      const response = await middleware.handleUpgrade(request, {}, {});

      expect(response.status).toBe(101);
      expect(response.webSocket).toBeDefined();
    });

    test('should reject non-WebSocket upgrade requests', async () => {
      const request = {
        headers: new Map([['Upgrade', 'http']])
      };

      const response = await middleware.handleUpgrade(request, {}, {});

      expect(response.status).toBe(426);
      expect(await response.text()).toBe('Expected Upgrade: websocket');
    });

    test('should handle upgrade errors', async () => {
      // Mock WebSocketPair to throw error
      global.WebSocketPair = class {
        constructor() {
          throw new Error('WebSocket creation failed');
        }
      };

      const request = {
        headers: new Map([['Upgrade', 'websocket']])
      };

      const response = await middleware.handleUpgrade(request, {}, {});

      expect(response.status).toBe(500);
      expect(await response.text()).toContain('WebSocket upgrade failed');
    });
  });
});