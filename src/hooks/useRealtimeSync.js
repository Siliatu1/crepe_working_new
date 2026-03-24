import { useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_RESERVAS_WS_URL || 'https://macfer.crepesywaffles.com';
const ENABLE_SOCKET = import.meta.env.VITE_ENABLE_SOCKET !== 'false';
const ENABLE_POLLING = import.meta.env.VITE_ENABLE_REALTIME_POLLING !== 'false';
const POLLING_VISIBLE_MS = Number(import.meta.env.VITE_REALTIME_POLL_MS || 7000);
const POLLING_HIDDEN_MS = Number(import.meta.env.VITE_REALTIME_POLL_HIDDEN_MS || 15000);
const SOCKET_EVENTS = [
  'reserva3',
  'working-reservas-updated',
  'reservas-updated',
  'reservation-updated',
];

const useRealtimeSync = (onSync) => {
  const socketRef = useRef(null);
  const syncDebounceRef = useRef(null);
  const pollingRef = useRef(null);

  // Función para disparar sincronización
  const triggerSync = useCallback((source = 'manual') => {
    if (syncDebounceRef.current) {
      clearTimeout(syncDebounceRef.current);
    }

    syncDebounceRef.current = setTimeout(() => {
      if (onSync) {
        onSync();
      }
      syncDebounceRef.current = null;
    }, 120);
  }, [onSync]);

  useEffect(() => {
    const handleCustomSync = () => {
      triggerSync('custom-event');
    };

    window.addEventListener('reservas-updated', handleCustomSync);
    window.addEventListener('working-reservas-updated', handleCustomSync);

    return () => {
      window.removeEventListener('reservas-updated', handleCustomSync);
      window.removeEventListener('working-reservas-updated', handleCustomSync);
    };
  }, [triggerSync]);

  useEffect(() => {
    if (!ENABLE_POLLING) {
      return;
    }

    const clearPolling = () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };

    const startPolling = () => {
      clearPolling();
      const delay = document.hidden ? POLLING_HIDDEN_MS : POLLING_VISIBLE_MS;
      pollingRef.current = setInterval(() => {
        triggerSync(document.hidden ? 'polling-hidden' : 'polling-visible');
      }, delay);
    };

    const handleVisibilityChange = () => {
      startPolling();
      if (!document.hidden) {
        triggerSync('tab-visible');
      }
    };

    const handleOnline = () => {
      triggerSync('network-online');
    };

    startPolling();
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    return () => {
      clearPolling();
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
    };
  }, [triggerSync]);

  // Socket.IO Connection  
  useEffect(() => {
    if (!ENABLE_SOCKET) {
      return;
    }

    const socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
    });

    socket.on('connect', () => {
      triggerSync('socket-connect');
    });

    socket.on('reconnect', () => {
      triggerSync('socket-reconnect');
    });

    SOCKET_EVENTS.forEach((eventName) => {
      socket.on(eventName, () => {
        triggerSync(`socket-${eventName}`);
      });
    });

    socketRef.current = socket;

    return () => {
      socket.removeAllListeners();
      socket.close();
      socketRef.current = null;
    };
  }, [triggerSync]);

  const notifyChange = useCallback(() => {
    window.dispatchEvent(new CustomEvent('reservas-updated'));
    window.dispatchEvent(new CustomEvent('working-reservas-updated'));
    triggerSync('notify-change');

    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('working-reservas-updated', {
        event: 'working-reservas-updated',
        source: 'client',
        timestamp: Date.now(),
      });

      socketRef.current.emit('reservas-updated', {
        event: 'reservas-updated',
        source: 'client',
        timestamp: Date.now(),
      });

      socketRef.current.emit('reserva3', {
        event: 'reserva3',
        source: 'client',
        timestamp: Date.now(),
      });
    }
  }, [triggerSync]);

  return {
    triggerSync,
    notifyChange,
    socket: socketRef.current,
  };
};

export default useRealtimeSync;
