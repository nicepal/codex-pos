const config = require('../config');
const logger = require('../utils/logger');
const { verifyAccessToken } = require('../utils/jwt');

let io = null;

function tenantRoom(tenantId) {
  return `tenant:${tenantId}`;
}

/**
 * Attaches a Socket.IO server to the given HTTP server. Clients authenticate
 * with their JWT access token and join a per-tenant room so the server can push
 * live updates (orders, notifications, inventory) to all open dashboards.
 */
function initRealtime(httpServer) {
  if (!config.realtime.enabled) {
    logger.info('Realtime disabled via config');
    return null;
  }
  let SocketServer;
  try {
    SocketServer = require('socket.io').Server;
  } catch (err) {
    logger.warn('socket.io not installed — realtime updates disabled. Run `npm i socket.io`.');
    return null;
  }

  io = new SocketServer(httpServer, {
    cors: { origin: true, credentials: true },
    path: '/socket.io',
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token
        || socket.handshake.headers?.authorization?.split(' ')[1];
      if (!token) return next(new Error('Authentication required'));
      const decoded = verifyAccessToken(token);
      socket.userId = decoded.userId;
      socket.tenantId = decoded.tenantId || socket.handshake.auth?.tenantId || null;
      return next();
    } catch (err) {
      return next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    if (socket.tenantId) socket.join(tenantRoom(socket.tenantId));
    socket.on('join-tenant', (tenantId) => {
      if (tenantId) socket.join(tenantRoom(tenantId));
    });
  });

  logger.info('Realtime (Socket.IO) initialized');
  return io;
}

function emitToTenant(tenantId, event, payload) {
  if (!io || !tenantId) return;
  io.to(tenantRoom(tenantId)).emit(event, payload);
}

module.exports = { initRealtime, emitToTenant, tenantRoom };
