import { useEffect } from 'react';
import { cancelarReservasVencidas } from '../utils/reservasService';

const WORK_START_HOUR = 5;
const WORK_END_HOUR = 17;

const isWithinWorkingHours = (referenceDate = new Date()) => {
  const hour = referenceDate.getHours();
  return hour >= WORK_START_HOUR && hour < WORK_END_HOUR;
};

const useAutoCancelarReservas = (enabled = true) => {
  useEffect(() => {
    if (!enabled) return;

    let isMounted = true;

    // Función para verificar y cancelar
    const verificarYCancelar = async () => {
      if (!isWithinWorkingHours()) {
        return;
      }

      try {
        const result = await cancelarReservasVencidas();

        if (isMounted && result.canceled > 0) {
          console.log(`Auto-cancelación: ${result.message}`);
        }
      } catch (error) {
        if (isMounted) {
          console.error('Error en auto-cancelación de reservas:', error);
        }
      }
    };


    void verificarYCancelar();


    const interval = setInterval(() => {
      void verificarYCancelar();
    }, 60 * 60 * 1000);


    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [enabled]);
};

export default useAutoCancelarReservas;
