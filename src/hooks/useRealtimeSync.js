import { useEffect, useCallback, useRef } from 'react';


const useRealtimeSync = (onSync) => {
  const lastSyncRef = useRef(Date.now());
  const syncIntervalRef = useRef(null);

  // Función para disparar sincronización
  const triggerSync = useCallback((source = 'manual') => {
    console.log(`🔄 Sincronización disparada desde: ${source}`);
    if (onSync) {
      onSync();
    }
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

  // Polling cada 30 segundos (backup por si fallan los eventos)
  useEffect(() => {
    syncIntervalRef.current = setInterval(() => {
      const timeSinceLastSync = Date.now() - lastSyncRef.current;

      if (timeSinceLastSync > 25000) {
        console.log('⏰ Sincronización automática (polling)');
        triggerSync('polling');
      }
    }, 30000); // Cada 30 segundos

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [triggerSync]);


  const notifyChange = useCallback(() => {
    window.dispatchEvent(new CustomEvent('reservas-updated'));
    window.dispatchEvent(new CustomEvent('working-reservas-updated'));
    console.log('✅ Notificación de cambio enviada');
  }, []);

  return {
    triggerSync,
    notifyChange,
  };
};

export default useRealtimeSync;
