import { useEffect } from 'react';
import { cancelarReservasVencidas } from '../utils/reservasService';
import { isPastVerificationDeadline } from '../utils/geolocationService';

/**
 * Hook personalizado para cancelar automáticamente reservas vencidas
 * Se ejecuta cada minuto para verificar si hay reservas que deben cancelarse
 */
const useAutoCancelarReservas = (enabled = true) => {
  useEffect(() => {
    if (!enabled) return;

    // Función para verificar y cancelar
    const verificarYCancelar = () => {
      // Solo ejecutar si ya pasó el deadline (8:25 AM)
      if (isPastVerificationDeadline()) {
        const result = cancelarReservasVencidas();
        
        if (result.canceled > 0) {
          console.log(`🚫 Auto-cancelación: ${result.message}`);
        }
      }
    };

    // Ejecutar inmediatamente al montar
    verificarYCancelar();

    // Configurar intervalo cada 1 minuto
    const interval = setInterval(verificarYCancelar, 60000);

    // Limpiar al desmontar
    return () => clearInterval(interval);
  }, [enabled]);
};

export default useAutoCancelarReservas;
