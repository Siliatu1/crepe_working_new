import { useEffect, useCallback, useRef } from 'react';

/**
 * Hook para sincronización en tiempo real de reservas
 * Actualmente usa localStorage events (funciona entre pestañas)
 * Preparado para migrar a WebSockets/Webhooks cuando tengan API
 */
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

  // Escuchar cambios en localStorage (entre pestañas/tabs)
  useEffect(() => {
    const handleStorageChange = (e) => {
      // Solo sincronizar si cambió las reservas
      if (e.key === 'reservas' && e.newValue !== e.oldValue) {
        console.log('📡 Cambio detectado en otra pestaña');
        triggerSync('storage-event');
      }
    };

    // Agregar listener para cambios en storage
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [triggerSync]);

  // Evento custom para sincronización en la misma pestaña
  useEffect(() => {
    const handleCustomSync = () => {
      console.log('📡 Evento de sincronización en misma pestaña');
      triggerSync('custom-event');
    };

    // Escuchar evento custom
    window.addEventListener('reservas-updated', handleCustomSync);

    return () => {
      window.removeEventListener('reservas-updated', handleCustomSync);
    };
  }, [triggerSync]);

  // Polling cada 30 segundos (backup por si fallan los eventos)
  useEffect(() => {
    syncIntervalRef.current = setInterval(() => {
      const timeSinceLastSync = Date.now() - lastSyncRef.current;
      // Solo sincronizar si han pasado más de 25 segundos desde la última sync
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

  // Función para notificar cambios (llamar después de crear/editar/eliminar)
  const notifyChange = useCallback(() => {
    // Disparar evento custom para la misma pestaña
    window.dispatchEvent(new CustomEvent('reservas-updated'));
    
    // localStorage change ya se detecta automáticamente en otras pestañas
    console.log('✅ Notificación de cambio enviada');
  }, []);

  return {
    triggerSync,
    notifyChange,
  };
};

export default useRealtimeSync;
