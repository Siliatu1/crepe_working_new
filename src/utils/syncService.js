/**
 * Servicio de sincronización de reservas
 * Maneja operaciones CRUD con notificación automática
 * Preparado para migrar a API/Webhooks
 */

// Configuración (cambiar cuando tengan API)
const CONFIG = {
  USE_API: false, // Cambiar a true cuando tengan backend
  API_URL: 'https://tu-api.com/api/reservas',
  WEBHOOK_URL: null, // URL del webhook cuando esté disponible
  STORAGE_KEY: 'reservas',
};

/**
 * Obtener todas las reservas
 */
export const getAllReservas = () => {
  if (CONFIG.USE_API) {
    // TODO: Implementar cuando tengan API
    // return fetch(CONFIG.API_URL).then(res => res.json());
  }
  
  // Modo localStorage
  const stored = localStorage.getItem(CONFIG.STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
};

/**
 * Guardar reservas y notificar cambios
 */
export const saveReservas = (reservas) => {
  if (CONFIG.USE_API) {
    // TODO: Implementar cuando tengan API
    // return fetch(CONFIG.API_URL, {
    //   method: 'POST',
    //   body: JSON.stringify(reservas)
    // });
  }
  
  // Modo localStorage
  localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(reservas));
  
  // Notificar cambio (dispara sincronización en otros componentes)
  window.dispatchEvent(new CustomEvent('reservas-updated', {
    detail: { timestamp: Date.now() }
  }));
  
  console.log('💾 Reservas guardadas y notificación enviada');
};

/**
 * Crear nueva reserva
 */
export const createReserva = (nuevaReserva) => {
  const reservas = getAllReservas();
  
  // Generar ID único
  const maxId = reservas.length > 0 
    ? Math.max(...reservas.map(r => parseInt(r.id) || 0)) 
    : 0;
  
  const reservaConId = {
    ...nuevaReserva,
    id: (maxId + 1).toString(),
    fechaCreacion: new Date().toISOString(),
  };
  
  reservas.push(reservaConId);
  saveReservas(reservas);
  
  return reservaConId;
};

/**
 * Actualizar reserva existente
 */
export const updateReserva = (id, datosActualizados) => {
  const reservas = getAllReservas();
  const index = reservas.findIndex(r => r.id === id);
  
  if (index !== -1) {
    reservas[index] = {
      ...reservas[index],
      ...datosActualizados,
      fechaModificacion: new Date().toISOString(),
    };
    saveReservas(reservas);
    return reservas[index];
  }
  
  return null;
};

/**
 * Eliminar reserva
 */
export const deleteReserva = (id) => {
  const reservas = getAllReservas();
  const filtradas = reservas.filter(r => r.id !== id);
  
  if (filtradas.length !== reservas.length) {
    saveReservas(filtradas);
    return true;
  }
  
  return false;
};

/**
 * Cancelar reserva (soft delete)
 */
export const cancelReserva = (id, motivo = 'Usuario canceló') => {
  return updateReserva(id, {
    estado: 'Cancelada',
    motivoCancelacion: motivo,
    fechaCancelacion: new Date().toISOString(),
  });
};

/**
 * Obtener reservas por filtros
 */
export const getReservasFiltradas = (filtros = {}) => {
  let reservas = getAllReservas();
  
  // Filtrar por cédula
  if (filtros.cedula) {
    reservas = reservas.filter(r => 
      r.cedula?.includes(filtros.cedula)
    );
  }
  
  // Filtrar por escritorio
  if (filtros.escritorio) {
    reservas = reservas.filter(r => 
      r.escritorio === parseInt(filtros.escritorio)
    );
  }
  
  // Filtrar por estado
  if (filtros.estado) {
    reservas = reservas.filter(r => 
      r.estado === filtros.estado
    );
  }
  
  // Filtrar por rango de fechas
  if (filtros.fechaInicio) {
    reservas = reservas.filter(r => 
      new Date(r.fecha) >= new Date(filtros.fechaInicio)
    );
  }
  
  if (filtros.fechaFin) {
    reservas = reservas.filter(r => 
      new Date(r.fecha) <= new Date(filtros.fechaFin)
    );
  }
  
  return reservas;
};

/**
 * Inicializar desde datos base (JSON inicial)
 */
export const initializeReservas = (reservasIniciales) => {
  const existentes = getAllReservas();
  
  // Solo inicializar si no hay datos
  if (existentes.length === 0) {
    saveReservas(reservasIniciales);
    console.log('✅ Reservas inicializadas desde JSON');
  }
};

/**
 * Configurar webhook (para cuando tengan API)
 */
export const setupWebhook = (webhookUrl) => {
  CONFIG.WEBHOOK_URL = webhookUrl;
  console.log('🔗 Webhook configurado:', webhookUrl);
  
  // TODO: Implementar suscripción a webhook cuando tengan API
  // Este es un placeholder para la futura implementación
};

/**
 * Simular notificación webhook (para testing)
 */
export const simulateWebhookNotification = (data) => {
  console.log('📨 Simulación de webhook recibida:', data);
  
  // Disparar evento de actualización
  window.dispatchEvent(new CustomEvent('webhook-notification', {
    detail: data
  }));
};

export default {
  getAllReservas,
  saveReservas,
  createReserva,
  updateReserva,
  deleteReserva,
  cancelReserva,
  getReservasFiltradas,
  initializeReservas,
  setupWebhook,
  simulateWebhookNotification,
  CONFIG,
};
