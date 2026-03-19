import { useEffect } from 'react';
import { cancelarReservasVencidas, cancelarTodasLasReservasPendientes } from '../utils/reservasService';

const WORK_START_HOUR = 5;
const WORK_END_HOUR = 17;
const END_OF_DAY_HOUR = 17; // 5 PM
const END_OF_DAY_MINUTE = 0;

const isWithinWorkingHours = (referenceDate = new Date()) => {
  const hour = referenceDate.getHours();
  return hour >= WORK_START_HOUR && hour < WORK_END_HOUR;
};

const useAutoCancelarReservas = (enabled = true) => {
  useEffect(() => {
    if (!enabled) return;

    let isMounted = true;
    let cancelacionFinDiaEjecutada = false;

    // Función para verificar y cancelar reservas vencidas (con ventana de 25 minutos)
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

    // Función para cancelar TODAS las reservas pendientes del DÍA ACTUAL a las 5 PM
    const cancelarPendientesFinDia = async () => {
      const now = new Date();
      const hour = now.getHours();
      const minute = now.getMinutes();

      // Ejecutar solo a las 5 PM y solo una vez por día
      // Esta función solo cancela reservas del día presente (fecha === hoy)
      if (hour === END_OF_DAY_HOUR && minute < 5 && !cancelacionFinDiaEjecutada) {
        try {
          console.log('[Auto-Cancelación 5PM] Iniciando cancelación de reservas pendientes del día actual...');
          const result = await cancelarTodasLasReservasPendientes();
          cancelacionFinDiaEjecutada = true;

          if (isMounted && result.canceled > 0) {
            console.log(`[Auto-Cancelación 5PM] ${result.message}`);
          } else {
            console.log('[Auto-Cancelación 5PM] No hay reservas pendientes para cancelar.');
          }
        } catch (error) {
          if (isMounted) {
            console.error('[Auto-Cancelación 5PM] Error en cancelación de fin de día:', error);
          }
        }
      }

      // Reset del flag al día siguiente
      if (hour === 0 && minute === 0) {
        cancelacionFinDiaEjecutada = false;
      }
    };

    // Ejecutar inmediatamente al montar
    void verificarYCancelar();
    void cancelarPendientesFinDia();

    // Intervalo cada hora para cancelación por vencimiento
    const intervalVencidas = setInterval(() => {
      void verificarYCancelar();
    }, 60 * 60 * 1000);

    // Intervalo cada minuto para detectar las 5 PM
    const intervalFinDia = setInterval(() => {
      void cancelarPendientesFinDia();
    }, 60 * 1000);

    return () => {
      isMounted = false;
      clearInterval(intervalVencidas);
      clearInterval(intervalFinDia);
    };
  }, [enabled]);
};

export default useAutoCancelarReservas;
