// Utility functions para gestionar reservas
// Datos se guardan temporalmente en localStorage y archivo JSON
// Cuando esté disponible el backend, reemplazar con llamadas a la API

import reservasData from '../data/reservas.json';

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
    return initializeReservas();
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
      createdAt: new Date().toISOString(),
    };
    reservas.push(nuevaReserva);
    saveReservas(reservas);
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
