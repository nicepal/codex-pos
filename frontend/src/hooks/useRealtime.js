import { useEffect } from 'react';
import { getSocket } from '../services/realtime';

/**
 * Subscribes to a realtime event for the lifetime of the component.
 * Safe no-op if the socket can't connect (e.g. realtime disabled on server).
 */
export default function useRealtime(event, handler) {
  useEffect(() => {
    if (!event || typeof handler !== 'function') return undefined;
    const socket = getSocket();
    if (!socket) return undefined;
    socket.on(event, handler);
    return () => { socket.off(event, handler); };
  }, [event, handler]);
}
