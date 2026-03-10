import { useEffect } from 'react';
import { cancelarReservasVencidas } from '../utils/reservasService';


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


    void verificarYCancelar();


    const interval = setInterval(() => {
      void verificarYCancelar();
    }, 60000);


    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [enabled]);
};

export default useAutoCancelarReservas;
