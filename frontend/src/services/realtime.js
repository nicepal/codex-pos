import { io } from 'socket.io-client';

let socket = null;

// Base URL for the realtime connection. In dev, Vite proxies /api to the API
// server; for sockets we connect directly to the API origin when provided.
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || undefined;

export function getSocket() {
  const token = localStorage.getItem('accessToken');
  if (!token) return null;

  if (socket && socket.connected) return socket;

  if (!socket) {
    socket = io(SOCKET_URL || '/', {
      path: '/socket.io',
      auth: { token },
      autoConnect: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
    });
  } else {
    socket.auth = { token };
    socket.connect();
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
