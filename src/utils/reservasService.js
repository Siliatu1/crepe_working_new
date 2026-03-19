import axiosInstance from '../api/axiosInstance';
import { evaluateReservationStatus, fetchWorkingHorarios } from './geolocationService';
import { normalizeCollection } from './collections';
import { getLocalDateString, toEstado } from './reservaCommon';

const API_RESERVAS_ENDPOINT = 'https://macfer.crepesywaffles.com/api/working-reservas';
const RESERVAS_UPDATED_EVENT = 'working-reservas-updated';
const PAGE_SIZE = 40000;

const inMemoryStatusMap = new Map();

const toApiEstado = (merged = {}) => {
  const normalizedEstado = toEstado(merged.estado);

  if (merged.confirmada === true || normalizedEstado === 'Confirmada') return true;
  if (merged.confirmada === false || normalizedEstado === 'Cancelada') return false;
  return null;
};

const normalizeReserva = (item) => {
  const attrs = item?.attributes ?? item ?? {};
  const id = item?.id ?? attrs?.id;
  const horarioRel = attrs?.working_horarios?.data ?? attrs?.working_horarios ?? null;
  const puestoRel = attrs?.working_puestos?.data ?? attrs?.working_puestos ?? null;
  const override = id ? inMemoryStatusMap.get(String(id)) : null;

  const reserva = {
    id,
    key: id,
    nombre: attrs.Nombre || attrs.nombre || '',
    foto: attrs.foto || '',
    cedula: attrs.documento || attrs.cedula || '',
    area: attrs.area || attrs.area_nombre || '',
    fecha: attrs.fecha_reserva || attrs.fecha || null,
    estado: toEstado(attrs.estado),
    confirmada: attrs.confirmada !== undefined ? attrs.confirmada : (attrs.estado === true ? true : attrs.estado === false ? false : null),
    escritorio: attrs.escritorio || null,
    escritorioId: attrs.escritorioId || puestoRel?.id || null,
    horario: attrs.horario || null,
    turno: attrs.turno || null,
    horaInicio: attrs.horaInicio || null,
    horaFin: attrs.horaFin || null,
    horarioId: attrs.horarioId || horarioRel?.id || null,
    verificacionAsistencia: attrs.verificacionAsistencia || null,
    motivoCancelacion: attrs.motivo_cancelacion || attrs.motivoCancelacion || null,
    createdAt: attrs.createdAt || null,
    updatedAt: attrs.updatedAt || null,
    rawAttributes: attrs,
  };

  if (!override) return reserva;

  return {
    ...reserva,
    ...override,
    estado: override.estado || reserva.estado,
    confirmada: 'confirmada' in override ? override.confirmada : reserva.confirmada,
    motivoCancelacion: 'motivoCancelacion' in override ? override.motivoCancelacion : reserva.motivoCancelacion,
    verificacionAsistencia: 'verificacionAsistencia' in override ? override.verificacionAsistencia : reserva.verificacionAsistencia,
  };
};

const emitReservationsUpdated = (detail = {}) => {
  window.dispatchEvent(new CustomEvent(RESERVAS_UPDATED_EVENT, {
    detail: { timestamp: Date.now(), ...detail },
  }));
};

const buildQueryParams = (filters = {}) => {
  const params = {
    populate: '*',
    'pagination[pageSize]': PAGE_SIZE,
  };

  if (filters.cedula) {
    params['filters[documento][$eq]'] = String(filters.cedula);
  }

  if (filters.fecha) {
    params['filters[fecha_reserva][$eq]'] = filters.fecha;
  }

  return params;
};

const buildRemoteData = (baseReserva = {}, override = {}, options = {}) => {
  const { includeNullEstado = true } = options;
  const merged = { ...baseReserva, ...override };
  const apiEstado = toApiEstado(merged);

  const remoteData = {
    Nombre: merged.nombre || merged.Nombre || '',
    foto: merged.foto || '',
    documento: String(merged.cedula || merged.documento || ''),
    area: merged.area || merged.area_nombre || '',
    fecha_reserva: merged.fecha || merged.fecha_reserva || null,
    escritorio: merged.escritorio || undefined,
    escritorioId: merged.escritorioId || undefined,
    horario: merged.horario || undefined,
    turno: merged.turno || undefined,
    horaInicio: merged.horaInicio || undefined,
    horaFin: merged.horaFin || undefined,
    correo: merged.correo || undefined,
    cargo: merged.cargo || undefined,
    motivo_cancelacion: merged.motivo_cancelacion !== undefined
      ? merged.motivo_cancelacion
      : merged.motivoCancelacion !== undefined
        ? merged.motivoCancelacion
        : undefined,
  };

  if (apiEstado !== null || includeNullEstado) {
    remoteData.estado = apiEstado;
  }

  // Sincronizar explícitamente el campo confirmada si se proporciona en override
  if ('confirmada' in override) {
    remoteData.confirmada = override.confirmada;
  }

  return remoteData;
};

const saveOverride = (id, updateData) => {
  if (!id) return;

  inMemoryStatusMap.set(String(id), {
    estado: updateData.estado,
    confirmada: updateData.confirmada,
    motivoCancelacion: updateData.motivo_cancelacion ?? updateData.motivoCancelacion ?? null,
    verificacionAsistencia: updateData.verificacionAsistencia ?? null,
    updatedAt: new Date().toISOString(),
  });
};

export const getReservas = async (filters = {}) => {
  const response = await axiosInstance.get(API_RESERVAS_ENDPOINT, {
    params: buildQueryParams(filters),
  });

  return normalizeCollection(response.data)
    .map(normalizeReserva)
    .sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')) || Number(b.id || 0) - Number(a.id || 0));
};

export const getReservasByUsuario = async (cedula) => {
  if (!cedula) return [];
  return getReservas({ cedula });
};

export const updateReservaWithVerification = async (id, updateData, currentReserva = null) => {
  await axiosInstance.put(`${API_RESERVAS_ENDPOINT}/${id}`, {
    data: buildRemoteData(currentReserva, updateData),
  });

  saveOverride(id, updateData);
  emitReservationsUpdated({ id });

  return {
    ...(currentReserva || { id, key: id }),
    ...updateData,
    id,
    key: id,
  };
};

export const createReservaRecord = async (reservaData) => {
  const response = await axiosInstance.post(API_RESERVAS_ENDPOINT, {
    data: buildRemoteData(reservaData, {}, { includeNullEstado: true }),
  });

  const created = normalizeReserva(response.data?.data ?? response.data);

  if (reservaData?.estado || reservaData?.verificacionAsistencia) {
    saveOverride(created.id, {
      estado: reservaData.estado,
      confirmada: reservaData.confirmada,
      motivoCancelacion: reservaData.motivoCancelacion,
      verificacionAsistencia: reservaData.verificacionAsistencia,
    });
  }

  emitReservationsUpdated({ id: created.id });
  return normalizeReserva({ ...created, id: created.id, attributes: { ...created.rawAttributes } });
};

export const updateReservaRecord = async (id, reservaData, currentReserva = null) => {
  await axiosInstance.put(`${API_RESERVAS_ENDPOINT}/${id}`, {
    data: buildRemoteData(currentReserva, reservaData),
  });

  if (reservaData?.estado || reservaData?.verificacionAsistencia) {
    saveOverride(id, {
      estado: reservaData.estado,
      confirmada: reservaData.confirmada,
      motivoCancelacion: reservaData.motivoCancelacion,
      verificacionAsistencia: reservaData.verificacionAsistencia,
    });
  }

  emitReservationsUpdated({ id });

  return {
    ...(currentReserva || { id, key: id }),
    ...reservaData,
    id,
    key: id,
  };
};

export const deleteReservaRecord = async (id) => {
  await axiosInstance.delete(`${API_RESERVAS_ENDPOINT}/${id}`);
  inMemoryStatusMap.delete(String(id));
  emitReservationsUpdated({ id, deleted: true });
  return true;
};

export const cancelReserva = async (id, currentReserva = null, motivo = 'Reserva cancelada por el usuario.') => {
  return updateReservaWithVerification(id, {
    estado: 'Cancelada',
    confirmada: false,
    motivoCancelacion: motivo,
    motivo_cancelacion: motivo,
    verificacionAsistencia: {
      fecha: new Date().toISOString(),
      mensaje: motivo,
      tipo: 'cancelacion-manual',
    },
  }, currentReserva);
};

export const getReservasPendientesHoy = async () => {
  const today = getLocalDateString();
  const reservas = await getReservas({ fecha: today });
  return reservas.filter((reserva) => reserva.estado === 'Pendiente');
};

export const cancelarReservasVencidas = async () => {
  const horarios = await fetchWorkingHorarios();
  const reservasPendientes = await getReservasPendientesHoy();
  const motivoAutoCancelacion = 'Reserva cancelada por falta de confirmacion';

  let canceladas = 0;

  for (const reserva of reservasPendientes) {
    const evaluation = evaluateReservationStatus(reserva, horarios);

    // No cancelar durante la ventana activa de 25 minutos desde el inicio del turno.
    if (!evaluation.shouldUpdate || evaluation.newStatus !== 'Cancelada') {
      continue;
    }

    await updateReservaWithVerification(reserva.id, {
      estado: 'Cancelada',
      confirmada: false,
      motivoCancelacion: motivoAutoCancelacion,
      motivo_cancelacion: motivoAutoCancelacion,
      verificacionAsistencia: {
        fecha: new Date().toISOString(),
        mensaje: motivoAutoCancelacion,
        tipo: 'auto-cancelacion',
      },
    }, reserva);

    canceladas += 1;
  }

  return {
    canceled: canceladas,
    message: canceladas > 0
      ? `${canceladas} reserva(s) cancelada(s) automáticamente`
      : 'No hay reservas vencidas para cancelar',
  };
};

/**
 * Cancela TODAS las reservas pendientes del DÍA ACTUAL sin importar la ventana de confirmación.
 * Esta función se ejecuta a las 5 PM para limpiar reservas del día que no fueron confirmadas.
 * IMPORTANTE: Solo opera sobre reservas con fecha igual al día presente.
 */
export const cancelarTodasLasReservasPendientes = async () => {
  const hoy = getLocalDateString(); // Fecha actual en formato YYYY-MM-DD local
  const reservasPendientes = await getReservasPendientesHoy();
  const motivoAutoCancelacion = 'Reserva cancelada automáticamente al finalizar el día';

  let canceladas = 0;

  for (const reserva of reservasPendientes) {
    // Doble validación: asegurar que la reserva es del día actual
    const fechaReserva = reserva.fecha || reserva.rawAttributes?.fecha_reserva;
    if (fechaReserva !== hoy) {
      console.warn(`Saltando reserva ${reserva.id} - fecha ${fechaReserva} no coincide con hoy ${hoy}`);
      continue;
    }

    await updateReservaWithVerification(reserva.id, {
      estado: 'Cancelada',
      confirmada: false,
      motivoCancelacion: motivoAutoCancelacion,
      motivo_cancelacion: motivoAutoCancelacion,
      verificacionAsistencia: {
        fecha: new Date().toISOString(),
        mensaje: motivoAutoCancelacion,
        tipo: 'auto-cancelacion-fin-dia',
      },
    }, reserva);

    canceladas += 1;
  }

  return {
    canceled: canceladas,
    message: canceladas > 0
      ? `${canceladas} reserva(s) pendiente(s) cancelada(s) al finalizar el día`
      : 'No hay reservas pendientes para cancelar',
  };
};

/**
 * Verifica si un puesto está disponible para un horario específico en una fecha determinada.
 * Retorna true si está disponible, false si ya está reservado.
 */
export const verificarDisponibilidadPuesto = async (puestoId, horarioId, fecha) => {
  try {
    const reservas = await getReservas({ fecha });
    
    // Buscar reservas activas (Pendiente o Confirmada) para este puesto
    const reservasDelPuesto = reservas.filter((r) => {
      const esPendienteOConfirmada = r.estado === 'Pendiente' || r.estado === 'Confirmada';
      const esMismoPuesto = r.escritorioId === puestoId;
      
      if (!esPendienteOConfirmada || !esMismoPuesto) return false;
      
      // Verificar conflicto de horario
      const horarioReserva = r.horarioId;
      
      // Horario 3 (completo) bloquea todo
      if (horarioReserva === 3 || horarioId === 3) return true;
      
      // Mismo horario
      if (horarioReserva === horarioId) return true;
      
      // Horario 1 (AM) con Horario 2 (PM) no tienen conflicto
      return false;
    });
    
    return reservasDelPuesto.length === 0;
  } catch (error) {
    console.error('Error al verificar disponibilidad:', error);
    throw error;
  }
};

export { RESERVAS_UPDATED_EVENT };
