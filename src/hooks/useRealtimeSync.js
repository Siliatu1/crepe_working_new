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
    let connectionAttempted = false;

    const connectSocket = () => {
      if (!mounted || connectionAttempted) return;
      connectionAttempted = true;

      try {
        socket = io(WS_URL, {
          reconnection: false,
          timeout: 5000,
          transports: ['websocket'],
          autoConnect: true,
          path: '/socket.io/',
        });

        socketRef.current = socket;

        socket.on('connect', () => {
          if (mounted) {
            console.log('🟢 WebSocket conectado correctamente');
            triggerSync('socket-connect');
          }
        });

        socket.on('disconnect', () => {
          console.log('🔴 WebSocket desconectado');
        });

        socket.on('connect_error', (error) => {
          console.warn('⚠️ Error de conexión WebSocket (backend sin Socket.IO configurado)');
          // Cerrar silenciosamente si el backend no tiene Socket.IO configurado
          if (socket) {
            socket.off();
            socket.close();
          }
        });

        // Escuchar el evento "reserva3" que el backend emite cuando se crea una reserva
        socket.on('reserva3', (data) => {
          if (mounted) {
            console.log('📡 Evento "reserva3" recibido del backend:', data);
            triggerSync('socket-reserva3');
          }
        });

        // Mantener eventos adicionales por compatibilidad
        socket.on('working-reservas-updated', (data) => {
          if (mounted) {
            console.log('📡 Evento "working-reservas-updated" recibido:', data);
            triggerSync('socket-reservas-updated');
          }
        });

        socket.on('reservas-updated', (data) => {
          if (mounted) {
            console.log('📡 Evento "reservas-updated" recibido:', data);
            triggerSync('socket-reservas-general');
          }
        });

      } catch (error) {
        // Error al crear socket - fallar silenciosamente
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
