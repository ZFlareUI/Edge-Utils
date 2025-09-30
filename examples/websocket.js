/**
 * WebSocket utilities examples
 * Demonstrates real-time communication capabilities for edge computing
 */

import {
  WebSocketManager,
  WebSocketUtils,
  createWebSocketMiddleware
} from '../src/websocket/index.js';

/**
 * Example 1: Basic WebSocket connection management
 */
function basicWebSocketExample() {
  console.log('=== Basic WebSocket Connection Example ===');

  const manager = new WebSocketManager({
    onOpen: (id, event) => {
      console.log(`Connection ${id} opened`);
    },
    onMessage: (id, event) => {
      const parsed = WebSocketUtils.parseMessage(event);
      console.log(`Message from ${id}:`, parsed);
    },
    onError: (id, event) => {
      console.error(`Error on connection ${id}:`, event);
    },
    onClose: (id, event) => {
      console.log(`Connection ${id} closed: ${WebSocketUtils.getCloseCodeDescription(event.code)}`);
    }
  });

  // Connect to a WebSocket server
  try {
    const ws = manager.connect('client1', 'ws://echo.websocket.org');

    // Send a message
    setTimeout(() => {
      manager.send('client1', WebSocketUtils.createMessage('greeting', { text: 'Hello WebSocket!' }));
    }, 1000);

    // Close connection after 5 seconds
    setTimeout(() => {
      manager.close('client1');
    }, 5000);

  } catch (error) {
    console.error('Connection failed:', error.message);
  }
}

/**
 * Example 2: Broadcasting to multiple connections
 */
function broadcastingExample() {
  console.log('=== WebSocket Broadcasting Example ===');

  const manager = new WebSocketManager({
    onOpen: (id) => console.log(`Connection ${id} ready`),
    onMessage: (id, event) => {
      const parsed = WebSocketUtils.parseMessage(event);
      console.log(`[${id}] Received:`, parsed.data);
    }
  });

  // Simulate multiple client connections
  const connections = ['client1', 'client2', 'client3'];

  connections.forEach(id => {
    try {
      manager.connect(id, 'ws://echo.websocket.org');
    } catch (error) {
      console.error(`Failed to connect ${id}:`, error.message);
    }
  });

  // Broadcast a message to all connections
  setTimeout(() => {
    try {
      manager.broadcast(
        manager.getActiveConnections(),
        WebSocketUtils.createMessage('broadcast', { message: 'Hello everyone!' })
      );
    } catch (error) {
      console.error('Broadcast failed:', error.message);
    }
  }, 2000);

  // Clean up
  setTimeout(() => {
    connections.forEach(id => manager.close(id));
  }, 10000);
}

/**
 * Example 3: WebSocket middleware for edge functions
 */
function middlewareExample() {
  console.log('=== WebSocket Middleware Example ===');

  const middleware = createWebSocketMiddleware({
    onMessage: (id, event) => {
      const parsed = WebSocketUtils.parseMessage(event);
      console.log(`Middleware received from ${id}:`, parsed);

      // Echo the message back
      if (parsed.isJson && parsed.data.type === 'echo') {
        middleware.manager.send(id, WebSocketUtils.createMessage('echo_response', parsed.data.payload));
      }
    },
    onClose: (id) => {
      console.log(`Middleware: Connection ${id} closed`);
    }
  });

  // Simulate a WebSocket upgrade request (Cloudflare Workers style)
  const mockRequest = {
    headers: new Map([['Upgrade', 'websocket']])
  };

  middleware.handleUpgrade(mockRequest, {}, {})
    .then(response => {
      if (response.status === 101) {
        console.log('WebSocket upgrade successful');

        // Simulate receiving a message
        setTimeout(() => {
          const mockEvent = {
            data: WebSocketUtils.createMessage('echo', { text: 'Hello from client!' }),
            type: 'message'
          };

          // Trigger the message handler
          const serverWS = middleware.manager.connections.values().next().value;
          if (serverWS) {
            serverWS._trigger('message', mockEvent);
          }
        }, 1000);
      } else {
        console.log('Upgrade failed:', response.status);
      }
    })
    .catch(error => {
      console.error('Middleware error:', error);
    });
}

/**
 * Example 4: Real-time chat application simulation
 */
function chatApplicationExample() {
  console.log('=== Real-time Chat Application Example ===');

  const chatManager = new WebSocketManager({
    pingInterval: 10000, // Ping every 10 seconds
    pongTimeout: 3000,   // Wait 3 seconds for pong
    onOpen: (id) => {
      console.log(`User ${id} joined the chat`);
      // Send welcome message
      chatManager.send(id, WebSocketUtils.createMessage('system', {
        text: `Welcome to the chat, ${id}!`
      }));
    },
    onMessage: (id, event) => {
      const parsed = WebSocketUtils.parseMessage(event);

      if (parsed.isJson) {
        switch (parsed.data.type) {
          case 'chat':
            // Broadcast chat message to all users
            const chatMessage = {
              from: id,
              text: parsed.data.text,
              timestamp: parsed.timestamp
            };

            try {
              chatManager.broadcast(
                chatManager.getActiveConnections().filter(connId => connId !== id),
                WebSocketUtils.createMessage('chat', chatMessage)
              );
              console.log(`Chat: ${id} -> ${parsed.data.text}`);
            } catch (error) {
              console.error('Broadcast failed:', error.message);
            }
            break;

          case 'typing':
            // Notify others that user is typing
            try {
              chatManager.broadcast(
                chatManager.getActiveConnections().filter(connId => connId !== id),
                WebSocketUtils.createMessage('typing', { user: id, isTyping: parsed.data.isTyping })
              );
            } catch (error) {
              console.error('Typing notification failed:', error.message);
            }
            break;

          default:
            console.log(`Unknown message type from ${id}:`, parsed.data.type);
        }
      }
    },
    onClose: (id) => {
      console.log(`User ${id} left the chat`);
      // Notify others
      try {
        chatManager.broadcast(
          chatManager.getActiveConnections(),
          WebSocketUtils.createMessage('system', { text: `${id} left the chat` })
        );
      } catch (error) {
        console.error('Leave notification failed:', error.message);
      }
    }
  });

  // Simulate users joining
  const users = ['Alice', 'Bob', 'Charlie'];

  users.forEach((user, index) => {
    setTimeout(() => {
      try {
        chatManager.connect(user, 'ws://chat.example.com');

        // Simulate chat messages
        setTimeout(() => {
          chatManager.send(user, WebSocketUtils.createMessage('chat', {
            text: `Hello from ${user}!`
          }));
        }, 500);

        // Simulate typing indicator
        setTimeout(() => {
          chatManager.send(user, WebSocketUtils.createMessage('typing', {
            isTyping: true
          }));

          setTimeout(() => {
            chatManager.send(user, WebSocketUtils.createMessage('typing', {
              isTyping: false
            }));
          }, 1000);
        }, 1000);

      } catch (error) {
        console.error(`Failed to connect ${user}:`, error.message);
      }
    }, index * 500);
  });

  // Clean up after demonstration
  setTimeout(() => {
    users.forEach(user => chatManager.close(user));
  }, 15000);
}

/**
 * Example 5: Connection health monitoring
 */
function healthMonitoringExample() {
  console.log('=== Connection Health Monitoring Example ===');

  const healthManager = new WebSocketManager({
    pingInterval: 5000,  // Ping every 5 seconds
    pongTimeout: 2000,   // Wait 2 seconds for pong
    maxReconnectAttempts: 2,
    onOpen: (id) => {
      console.log(`[${new Date().toISOString()}] Connection ${id} established`);
    },
    onClose: (id, event) => {
      console.log(`[${new Date().toISOString()}] Connection ${id} closed (${event.code})`);
    },
    onError: (id, event) => {
      console.error(`[${new Date().toISOString()}] Connection ${id} error:`, event);
    }
  });

  // Monitor connection states
  setInterval(() => {
    const activeConnections = healthManager.getActiveConnections();
    console.log(`[${new Date().toISOString()}] Active connections: ${activeConnections.length}`);

    activeConnections.forEach(id => {
      const state = healthManager.getState(id);
      console.log(`  ${id}: ${state === 1 ? 'OPEN' : 'CLOSED'}`);
    });
  }, 3000);

  // Simulate connection lifecycle
  try {
    healthManager.connect('monitor1', 'ws://example.com');

    // Force close after 10 seconds
    setTimeout(() => {
      console.log('Forcing connection close for testing...');
      healthManager.close('monitor1');
    }, 10000);

  } catch (error) {
    console.error('Health monitoring setup failed:', error.message);
  }
}

// Run examples
console.log('Running WebSocket Examples...\n');

// Run examples with delays to avoid interference
basicWebSocketExample();

setTimeout(() => {
  broadcastingExample();
}, 10000);

setTimeout(() => {
  middlewareExample();
}, 25000);

setTimeout(() => {
  chatApplicationExample();
}, 35000);

setTimeout(() => {
  healthMonitoringExample();
}, 55000);

console.log('\nNote: These examples use mock WebSocket connections.');
console.log('In a real edge environment, replace with actual WebSocket URLs.');
console.log('Examples will complete in approximately 1 minute.');