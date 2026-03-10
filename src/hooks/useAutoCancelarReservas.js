import { useEffect } from 'react';
import { cancelarReservasVencidas } from '../utils/reservasService';

/**
 * Hook personalizado para cancelar automáticamente reservas vencidas
 * Se ejecuta cada minuto para verificar si hay reservas que deben cancelarse
 */
const useAutoCancelarReservas = (enabled = true) => {
  useEffect(() => {
    if (!enabled) return;

    let isMounted = true;

    // Función para verificar y cancelar
    const verificarYCancelar = async () => {
      const result = await cancelarReservasVencidas();

      if (isMounted && result.canceled > 0) {
        console.log(` Auto-cancelación: ${result.message}`);
      }
    };

    // Ejecutar inmediatamente al montar
    void verificarYCancelar();

    // Configurar intervalo cada 1 minuto
    const interval = setInterval(() => {
      void verificarYCancelar();
    }, 60000);

    // Limpiar al desmontar
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [enabled]);
};

export default useAutoCancelarReservas;
