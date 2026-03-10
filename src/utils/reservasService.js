// Utility functions para gestionar reservas
// Datos se guardan temporalmente en localStorage y archivo JSON
// Cuando esté disponible el backend, reemplazar con llamadas a la API

import reservasData from '../data/reservas.json';
import {
  evaluateReservationStatus,
  fetchWorkingHorarios,
} from './geolocationService';

// Clave para localStorage
const STORAGE_KEY = 'reservaciones';

// Inicializar reservas desde el JSON si localStorage está vacío
const initializeReservas = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      // Si no hay datos en localStorage, cargar desde el JSON
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reservasData));
      return reservasData;
    }
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error al inicializar reservas:', error);
    return reservasData;
  }
};

// Obtener todas las reservas
export const getReservas = () => {
  try {
    const reservas = initializeReservas();
    console.log('📖 Reservas obtenidas:', reservas.length);
    return reservas;
  } catch (error) {
    console.error('Error al leer reservas:', error);
    return [];
  }
};

// Guardar todas las reservas
export const saveReservas = (reservas) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reservas));
    return true;
  } catch (error) {
    console.error('Error al guardar reservas:', error);
    return false;
  }
};

// Agregar una nueva reserva
export const addReserva = (reserva) => {
  try {
    const reservas = getReservas();
    const nuevaReserva = {
      ...reserva,
      key: Date.now(),
      id: Date.now(),
      estado: 'Pendiente',
      confirmada: null,
      createdAt: new Date().toISOString(),
    };
    
    console.log('💾 Agregando reserva al array:', nuevaReserva);
    reservas.push(nuevaReserva);
    
    saveReservas(reservas);
    console.log('✅ Reserva guardada. Total reservas:', reservas.length);
    
    return nuevaReserva;
  } catch (error) {
    console.error('Error al agregar reserva:', error);
    return null;
  }
};

// Actualizar estado de una reserva
export const updateReservaEstado = (id, nuevoEstado) => {
  try {
    const reservas = getReservas();
    const index = reservas.findIndex(r => r.id === id || r.key === id);
    if (index !== -1) {
      reservas[index].estado = nuevoEstado;
      if (nuevoEstado === 'Confirmada') {
        reservas[index].confirmada = true;
      }
      if (nuevoEstado === 'Cancelada') {
        reservas[index].confirmada = false;
      }
      reservas[index].updatedAt = new Date().toISOString();
      saveReservas(reservas);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error al actualizar reserva:', error);
    return false;
  }
};

// Eliminar una reserva
// ⚠️ IMPORTANTE: Esta función NO debe usarse para cancelación manual por usuarios
// Solo para uso administrativo o limpieza del sistema
// Los usuarios NO pueden cancelar reservas manualmente
export const deleteReserva = (id) => {
  try {
    const reservas = getReservas();
    const filtradas = reservas.filter(r => r.id !== id && r.key !== id);
    saveReservas(filtradas);
    return true;
  } catch (error) {
    console.error('Error al eliminar reserva:', error);
    return false;
  }
};

// Obtener reservas de un usuario específico
export const getReservasByUsuario = (cedula) => {
  try {
    const reservas = getReservas();
    return reservas.filter(r => r.cedula === cedula);
  } catch (error) {
    console.error('Error al obtener reservas por usuario:', error);
    return [];
  }
};

// Limpiar todas las reservas (útil para desarrollo)
export const clearReservas = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Error al limpiar reservas:', error);
    return false;
  }
};

// Exportar reservas a JSON (para backup)
export const exportReservasToJSON = () => {
  try {
    const reservas = getReservas();
    const dataStr = JSON.stringify(reservas, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `reservas_backup_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    return true;
  } catch (error) {
    console.error('Error al exportar reservas:', error);
    return false;
  }
};

// Actualizar reserva completa con información de verificación
export const updateReservaWithVerification = (id, updateData) => {
  try {
    const reservas = getReservas();
    const index = reservas.findIndex(r => r.id === id || r.key === id);
    
    if (index !== -1) {
      reservas[index] = {
        ...reservas[index],
        ...updateData,
        updatedAt: new Date().toISOString()
      };
      saveReservas(reservas);
      console.log('✅ Reserva actualizada:', reservas[index]);
      return reservas[index];
    }
    
    console.error('❌ Reserva no encontrada:', id);
    return null;
  } catch (error) {
    console.error('Error al actualizar reserva con verificación:', error);
    return null;
  }
};

// Obtener reservas pendientes para hoy
export const getReservasPendientesHoy = () => {
  try {
    const reservas = getReservas();
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    return reservas.filter(r => 
      r.fecha === today && r.estado === 'Pendiente'
    );
  } catch (error) {
    console.error('Error al obtener reservas pendientes:', error);
    return [];
  }
};

// Verificar reservas vencidas y cancelarlas automáticamente
export const cancelarReservasVencidas = async () => {
  try {
    const horarios = await fetchWorkingHorarios();
    const reservasPendientes = getReservasPendientesHoy();
    let canceladas = 0;
    
    reservasPendientes.forEach(reserva => {
      const evaluation = evaluateReservationStatus(reserva, horarios);

      if (!evaluation.shouldUpdate || evaluation.newStatus !== 'Cancelada') {
        return;
      }

      const updated = updateReservaWithVerification(reserva.id, {
        estado: 'Cancelada',
        confirmada: false,
        motivoCancelacion: evaluation.message,
        canceladaAutomaticamente: true,
        verificacionAsistencia: {
          fecha: new Date().toISOString(),
          mensaje: evaluation.message,
          tipo: 'auto-cancelacion'
        }
      });
      
      if (updated) {
        canceladas++;
        console.log(`🚫 Reserva ${reserva.id} cancelada automáticamente`);
      }
    });

    if (canceladas === 0) {
      return {
        canceled: 0,
        message: 'No hay reservas vencidas para cancelar'
      };
    }
    
    return {
      canceled: canceladas,
      message: `${canceladas} reserva(s) cancelada(s) automáticamente`
    };
  } catch (error) {
    console.error('Error al cancelar reservas vencidas:', error);
    return { canceled: 0, message: 'Error al cancelar reservas' };
  }
};

// Obtener escritorios disponibles para una fecha
export const getEscritoriosDisponibles = (fecha) => {
  try {
    const reservas = getReservas();
    const reservasFecha = reservas.filter(r => 
      r.fecha === fecha && 
      (r.estado === 'Confirmada' || r.estado === 'Pendiente')
    );
    
    // Escritorios del 1 al 6
    const todosEscritorios = [1, 2, 3, 4, 5, 6];
    const escritoriosOcupados = reservasFecha.map(r => r.escritorioId);
    
    return todosEscritorios.filter(id => !escritoriosOcupados.includes(id));
  } catch (error) {
    console.error('Error al obtener escritorios disponibles:', error);
    return [];
  }
};
