/**
 * WebSocket utilities for edge computing environments
 * Provides connection management, message routing, and middleware support
 * Compatible with Cloudflare Workers, Vercel Edge, and Deno Deploy
 */

const WebSocketState = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
};

const MessageType = {
  TEXT: 'text',
  BINARY: 'binary',
  PING: 'ping',
  PONG: 'pong',
  CLOSE: 'close'
};

class WebSocketManager {
  constructor(options = {}) {
    this.options = {
      maxReconnectAttempts: 3,
      reconnectDelay: 1000,
      pingInterval: 30000,
      pongTimeout: 5000,
      ...options
    };

    this.connections = new Map();
    this.reconnectAttempts = new Map();
    this.pingTimers = new Map();
    this.pongTimeouts = new Map();
  }

  connect(id, url, protocols = null) {
    if (this.connections.has(id)) {
      throw new Error(`Connection with id '${id}' already exists`);
    }

    try {
      const ws = new WebSocket(url, protocols);
      this.connections.set(id, ws);
      this.reconnectAttempts.set(id, 0);

      ws.addEventListener('open', (event) => this._handleOpen(id, event));
      ws.addEventListener('message', (event) => this._handleMessage(id, event));
      ws.addEventListener('error', (event) => this._handleError(id, event));
      ws.addEventListener('close', (event) => this._handleClose(id, event));

      return ws;
    } catch (error) {
      throw new Error(`Failed to create WebSocket connection: ${error.message}`);
    }
  }

  send(id, data, options = {}) {
    const ws = this.connections.get(id);
    if (!ws) {
      throw new Error(`Connection with id '${id}' not found`);
    }

    if (ws.readyState !== WebSocketState.OPEN) {
      throw new Error(`Connection '${id}' is not open (state: ${ws.readyState})`);
    }

    try {
      if (options.binary) {
        ws.send(data);
      } else {
        ws.send(typeof data === 'string' ? data : JSON.stringify(data));
      }
    } catch (error) {
      throw new Error(`Failed to send message on connection '${id}': ${error.message}`);
    }
  }

  broadcast(ids, data, options = {}) {
    const errors = [];
    ids.forEach(id => {
      try {
        this.send(id, data, options);
      } catch (error) {
        errors.push({ id, error: error.message });
      }
    });

    if (errors.length > 0) {
      throw new Error(`Broadcast failed for connections: ${errors.map(e => `${e.id} (${e.error})`).join(', ')}`);
    }
  }

  close(id, code = 1000, reason = '') {
    const ws = this.connections.get(id);
    if (!ws) {
      return; // Connection already closed or doesn't exist
    }

    // Don't remove from connections map immediately, just close the WebSocket
    // The connection will be cleaned up when the 'close' event fires
    ws.close(code, reason);
  }

  getState(id) {
    const ws = this.connections.get(id);
    return ws ? ws.readyState : WebSocketState.CLOSED;
  }

  getActiveConnections() {
    return Array.from(this.connections.keys()).filter(id =>
      this.connections.get(id).readyState === WebSocketState.OPEN
    );
  }

  _handleOpen(id, event) {
    this.reconnectAttempts.set(id, 0); // Reset reconnect attempts on successful connection

    // Start ping/pong monitoring
    this._startPing(id);

    if (this.options.onOpen) {
      this.options.onOpen(id, event);
    }
  }

  _handleMessage(id, event) {
    // Handle pong responses
    if (this._isPongMessage(event.data)) {
      this._handlePong(id);
      return;
    }

    if (this.options.onMessage) {
      this.options.onMessage(id, event);
    }
  }

  _handleError(id, event) {
    if (this.options.onError) {
      this.options.onError(id, event);
    }
  }

  _handleClose(id, event) {
    this._cleanup(id);

    // Attempt reconnection if enabled and not a clean close
    if (event.code !== 1000 && event.code !== 1001) {
      this._attemptReconnect(id);
    }

    if (this.options.onClose) {
      this.options.onClose(id, event);
    }
  }

  _startPing(id) {
    const pingTimer = setInterval(() => {
      const ws = this.connections.get(id);
      if (ws && ws.readyState === WebSocketState.OPEN) {
        try {
          ws.send('ping');
          this._startPongTimeout(id);
        } catch (error) {
          this.close(id);
        }
      } else {
        this._cleanup(id);
      }
    }, this.options.pingInterval);

    this.pingTimers.set(id, pingTimer);
  }

  _startPongTimeout(id) {
    const timeout = setTimeout(() => {
      // Pong not received in time, close connection
      this.close(id);
    }, this.options.pongTimeout);

    this.pongTimeouts.set(id, timeout);
  }

  _handlePong(id) {
    const timeout = this.pongTimeouts.get(id);
    if (timeout) {
      clearTimeout(timeout);
      this.pongTimeouts.delete(id);
    }
  }

  _isPongMessage(data) {
    return data === 'pong' || data === 'PONG';
  }

  _attemptReconnect(id) {
    const attempts = this.reconnectAttempts.get(id) || 0;
    if (attempts >= this.options.maxReconnectAttempts) {
      return; // Max attempts reached
    }

    this.reconnectAttempts.set(id, attempts + 1);

    setTimeout(() => {
      // Note: In a real implementation, you'd need to store the original URL
      // For now, we'll just clean up the failed connection
      this.connections.delete(id);
      this.reconnectAttempts.delete(id);
    }, this.options.reconnectDelay * attempts);
  }

  _cleanup(id) {
    // Clear ping timer
    const pingTimer = this.pingTimers.get(id);
    if (pingTimer) {
      clearInterval(pingTimer);
      this.pingTimers.delete(id);
    }

    // Clear pong timeout
    const pongTimeout = this.pongTimeouts.get(id);
    if (pongTimeout) {
      clearTimeout(pongTimeout);
      this.pongTimeouts.delete(id);
    }

    // Remove from connections map
    this.connections.delete(id);
  }
}

class WebSocketUtils {
  static parseMessage(event) {
    const { data, type } = event;

    if (typeof data === 'string') {
      try {
        // Try to parse as JSON
        const parsed = JSON.parse(data);
        return {
          type: MessageType.TEXT,
          data: parsed,
          raw: data,
          isJson: true
        };
      } catch {
        // Not JSON, treat as plain text
        return {
          type: MessageType.TEXT,
          data: data,
          raw: data,
          isJson: false
        };
      }
    } else {
      // Binary data
      return {
        type: MessageType.BINARY,
        data: data,
        raw: data,
        isJson: false
      };
    }
  }

  static createMessage(type, payload, metadata = {}) {
    return JSON.stringify({
      type,
      payload,
      timestamp: Date.now(),
      ...metadata
    });
  }

  static isValidWebSocketUrl(url) {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'ws:' || parsed.protocol === 'wss:';
    } catch {
      return false;
    }
  }

  static getCloseCodeDescription(code) {
    const codes = {
      1000: 'Normal Closure',
      1001: 'Going Away',
      1002: 'Protocol Error',
      1003: 'Unsupported Data',
      1004: 'Reserved',
      1005: 'No Status Received',
      1006: 'Abnormal Closure',
      1007: 'Invalid Frame Payload Data',
      1008: 'Policy Violation',
      1009: 'Message Too Big',
      1010: 'Mandatory Extension',
      1011: 'Internal Server Error',
      1012: 'Service Restart',
      1013: 'Try Again Later',
      1014: 'Bad Gateway',
      1015: 'TLS Handshake'
    };

    return codes[code] || 'Unknown Close Code';
  }
}

function createWebSocketMiddleware(options = {}) {
  const manager = new WebSocketManager(options);

  return {
    manager,

    async handleUpgrade(request, env, ctx) {
      try {
        const upgradeHeader = request.headers.get('Upgrade');
        if (upgradeHeader !== 'websocket') {
          return new Response('Expected Upgrade: websocket', { status: 426 });
        }

        const webSocketPair = new WebSocketPair();
        const client = webSocketPair[0];
        const server = webSocketPair[1];

        // Generate unique connection ID
        const connectionId = `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Add the server WebSocket to the manager
        manager.connections.set(connectionId, server);

        // Set up server event handlers
        server.addEventListener('message', (event) => {
          if (manager.options.onMessage) {
            manager.options.onMessage(connectionId, event);
          }
        });

        server.addEventListener('close', (event) => {
          manager.connections.delete(connectionId);
          if (manager.options.onClose) {
            manager.options.onClose(connectionId, event);
          }
        });

        server.addEventListener('error', (event) => {
          if (manager.options.onError) {
            manager.options.onError(connectionId, event);
          }
        });

        return new Response(null, {
          status: 101,
          webSocket: client,
        });
      } catch (error) {
        return new Response(`WebSocket upgrade failed: ${error.message}`, { status: 500 });
      }
    }
  };
}

module.exports = {
  WebSocketManager,
  WebSocketUtils,
  WebSocketState,
  MessageType,
  createWebSocketMiddleware
};