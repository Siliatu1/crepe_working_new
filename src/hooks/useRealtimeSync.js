import { useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_RESERVAS_WS_URL || 'https://macfer.crepesywaffles.com';
const ENABLE_SOCKET = import.meta.env.VITE_ENABLE_SOCKET !== 'false';

const useRealtimeSync = (onSync) => {
  const socketRef = useRef(null);
  const syncDebounceRef = useRef(null);

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

  // Socket.IO Connection  
  useEffect(() => {
    if (!ENABLE_SOCKET) {
      return;
    }

    let mounted = true;
    let socket = null;
    let hasShownError = false;

    const connectSocket = () => {
      if (!mounted) return;

      try {
        socket = io(WS_URL, {
          reconnection: false,
          timeout: 10000,
          transports: ['polling', 'websocket'],
          upgrade: true,
          autoConnect: true,
          path: '/socket.io/',
        });

        socketRef.current = socket;

        socket.on('connect', () => {
          hasShownError = false;
          if (mounted) {
            triggerSync('socket-connect');
          }
        });

        socket.on('disconnect', () => {
        });

        socket.on('connect_error', () => {
          if (!hasShownError && mounted) {
            hasShownError = true;
          }
          if (socket) {
            socket.off();
            socket.close();
          }
        });

        // Escuchar el evento "reserva3" que el backend emite cuando se crea una reserva
        socket.on('reserva3', () => {
          if (mounted) {
            triggerSync('socket-reserva3');
          }
        });

        // Mantener eventos adicionales por compatibilidad
        socket.on('working-reservas-updated', () => {
          if (mounted) {
            triggerSync('socket-reservas-updated');
          }
        });

        socket.on('reservas-updated', () => {
          if (mounted) {
            triggerSync('socket-reservas-general');
          }
        });

      } catch (error) {
        if (!hasShownError) {
          hasShownError = true;
        }
      }
    };

    const timer = setTimeout(connectSocket, 800);

    return () => {
      mounted = false;
      clearTimeout(timer);
      
      if (socket && socket.connected) {
        socket.removeAllListeners();
        socket.close();
        socketRef.current = null;
      }
    };
  }, [triggerSync]);

  const notifyChange = useCallback(() => {
    window.dispatchEvent(new CustomEvent('reservas-updated'));
    window.dispatchEvent(new CustomEvent('working-reservas-updated'));

    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('working-reservas-updated', {
        event: 'working-reservas-updated',
        source: 'client',
        timestamp: Date.now(),
      });
    }
  }, []);

  return {
    triggerSync,
    notifyChange,
    socket: socketRef.current,
  };
};

export default useRealtimeSync;
