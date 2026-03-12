import { useEffect, useCallback, useRef } from 'react';

const WS_URL = import.meta.env.VITE_RESERVAS_WS_URL || '';
const POLLING_MS = Number(import.meta.env.VITE_RESERVAS_POLLING_MS || 30000);
const MAX_RECONNECT_MS = 15000;

const normalizeText = (value) => String(value || '').toLowerCase();

const shouldSyncFromSocketPayload = (payload) => {
  if (!payload || typeof payload !== 'object') return false;

  const eventText = normalizeText(payload.event || payload.type || payload.action || payload.topic);
  const modelText = normalizeText(payload.model || payload.collection || payload.entity || payload.resource);
  const dataText = normalizeText(JSON.stringify(payload.data || payload.payload || {}));
  const fullText = `${eventText} ${modelText} ${dataText}`;

  return (
    fullText.includes('working-reservas-updated') ||
    fullText.includes('reservas-updated') ||
    fullText.includes('working-reserva') ||
    fullText.includes('working-reservas') ||
    fullText.includes('reserva')
  );
};


const useRealtimeSync = (onSync) => {
  const lastSyncRef = useRef(Date.now());
  const syncIntervalRef = useRef(null);
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const reconnectAttemptRef = useRef(0);
  const syncDebounceRef = useRef(null);

  // Función para disparar sincronización
  const triggerSync = useCallback((source = 'manual') => {
    if (syncDebounceRef.current) {
      clearTimeout(syncDebounceRef.current);
    }

    syncDebounceRef.current = setTimeout(() => {
      console.log(`🔄 Sincronización disparada desde: ${source}`);
      if (onSync) {
        onSync();
      }
      lastSyncRef.current = Date.now();
      syncDebounceRef.current = null;
    }, 120);

    lastSyncRef.current = Date.now();
  }, [onSync]);

  useEffect(() => {
    const handleCustomSync = () => {
      console.log(' Evento de sincronización recibido');
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
    if (!WS_URL) {
      console.log('ℹ️ WebSocket no configurado (VITE_RESERVAS_WS_URL). Se usa eventos locales + polling.');
      return undefined;
    }

    let unmounted = false;

    const connect = () => {
      if (unmounted) return;

      try {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          reconnectAttemptRef.current = 0;
          console.log('✅ WebSocket conectado para reservas');
        };

        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (shouldSyncFromSocketPayload(payload)) {
              triggerSync('websocket-message');
            }
          } catch {
            const text = normalizeText(event.data);
            if (text.includes('reserva') || text.includes('working-reserva') || text.includes('working-reservas')) {
              triggerSync('websocket-text');
            }
          }
        };

        ws.onerror = (error) => {
          console.warn('⚠️ Error en WebSocket de reservas:', error);
        };

        ws.onclose = () => {
          wsRef.current = null;
          if (unmounted) return;

          reconnectAttemptRef.current += 1;
          const delay = Math.min(1000 * (2 ** reconnectAttemptRef.current), MAX_RECONNECT_MS);

          reconnectTimerRef.current = setTimeout(() => {
            connect();
          }, delay);

          console.warn(`🔁 WebSocket desconectado. Reintentando en ${Math.round(delay / 1000)}s...`);
        };
      } catch (error) {
        console.error('❌ No se pudo iniciar WebSocket de reservas:', error);
      }
    };

    connect();

    return () => {
      unmounted = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [triggerSync]);

  // Polling cada 30 segundos (backup por si fallan los eventos)
  useEffect(() => {
    syncIntervalRef.current = setInterval(() => {
      const timeSinceLastSync = Date.now() - lastSyncRef.current;

      if (timeSinceLastSync > POLLING_MS - 5000) {
        console.log('⏰ Sincronización automática (polling)');
        triggerSync('polling');
      }
    }, POLLING_MS);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
      if (syncDebounceRef.current) {
        clearTimeout(syncDebounceRef.current);
      }
    };
  }, [triggerSync]);


  const notifyChange = useCallback(() => {
    window.dispatchEvent(new CustomEvent('reservas-updated'));
    window.dispatchEvent(new CustomEvent('working-reservas-updated'));

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        event: 'working-reservas-updated',
        source: 'client',
        timestamp: Date.now(),
      }));
    }

    console.log('✅ Notificación de cambio enviada');
  }, []);

  return {
    triggerSync,
    notifyChange,
  };
};

export default useRealtimeSync;
