import { useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_RESERVAS_WS_URL || 'https://macfer.crepesywaffles.com';
const ENABLE_SOCKET = import.meta.env.VITE_ENABLE_SOCKET !== 'false';
const SMART_POLL_INTERVAL = 5000; // 5 segundos cuando hay actividad

const useRealtimeSync = (onSync) => {
  const socketRef = useRef(null);
  const syncDebounceRef = useRef(null);
  const smartPollRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const activityWindowMs = 120000; // 2 minutos de actividad

  // Función para disparar sincronización
  const triggerSync = useCallback((source = 'manual') => {
    console.log(`🔄 Sincronizando desde: ${source}`);
    
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

    const socket = io(WS_URL);

    socket.on('connect', () => {
      console.log('🟢 Conectado a Socket.IO');
    });

    socket.on('reserva3', () => {
      console.log('📡 Evento "reserva3" recibido del backend');
      triggerSync('socket-reserva3');
    });

    socket.on('disconnect', () => {
      console.log('🔴 Socket.IO desconectado');
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
