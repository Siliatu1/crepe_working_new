import axiosInstance from '../api/axiosInstance';
import { evaluateReservationStatus, fetchWorkingHorarios } from './geolocationService';

const API_RESERVAS_ENDPOINT = 'https://macfer.crepesywaffles.com/api/working-reservas';
const RESERVAS_UPDATED_EVENT = 'working-reservas-updated';
const PAGE_SIZE = 40000;

const inMemoryStatusMap = new Map();

const normalizeCollection = (payload) => {
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
};

const toEstado = (value) => {
  if (value === true) return 'Confirmada';
  if (value === false) return 'Cancelada';
  if (value == null) return 'Pendiente';

  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'confirmada') return 'Confirmada';
  if (normalized === 'cancelada') return 'Cancelada';
  return 'Pendiente';
};

const toApiEstado = (merged = {}) => {
  if (merged.confirmada === true || merged.estado === 'Confirmada') return true;
  if (merged.confirmada === false || merged.estado === 'Cancelada') return false;
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
    confirmada: attrs.estado === true ? true : attrs.estado === false ? false : null,
    escritorio: attrs.escritorio || null,
    escritorioId: attrs.escritorioId || puestoRel?.id || null,
    horario: attrs.horario || null,
    turno: attrs.turno || null,
    horaInicio: attrs.horaInicio || null,
    horaFin: attrs.horaFin || null,
    horarioId: attrs.horarioId || horarioRel?.id || null,
    verificacionAsistencia: attrs.verificacionAsistencia || null,
    motivoCancelacion: attrs.motivoCancelacion || null,
    createdAt: attrs.createdAt || null,
    updatedAt: attrs.updatedAt || null,
    rawAttributes: attrs,
  };

  if (!override) return reserva;

  return {
    ...reserva,
    ...override,
    estado: override.estado || reserva.estado,
    confirmada: override.confirmada ?? reserva.confirmada,
    motivoCancelacion: override.motivoCancelacion ?? reserva.motivoCancelacion,
    verificacionAsistencia: override.verificacionAsistencia ?? reserva.verificacionAsistencia,
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

const buildRemoteData = (baseReserva = {}, override = {}) => {
  const merged = { ...baseReserva, ...override };

  return {
    Nombre: merged.nombre || merged.Nombre || '',
    foto: merged.foto || '',
    documento: String(merged.cedula || merged.documento || ''),
    area: merged.area || merged.area_nombre || '',
    fecha_reserva: merged.fecha || merged.fecha_reserva || null,
    estado: toApiEstado(merged),
    escritorio: merged.escritorio || undefined,
    escritorioId: merged.escritorioId || undefined,
    horario: merged.horario || undefined,
    turno: merged.turno || undefined,
    horaInicio: merged.horaInicio || undefined,
    horaFin: merged.horaFin || undefined,
    correo: merged.correo || undefined,
    cargo: merged.cargo || undefined,
  };
};

const saveOverride = (id, updateData) => {
  if (!id) return;

  inMemoryStatusMap.set(String(id), {
    estado: updateData.estado,
    confirmada: updateData.confirmada,
    motivoCancelacion: updateData.motivoCancelacion ?? null,
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
    data: buildRemoteData(reservaData),
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
    verificacionAsistencia: {
      fecha: new Date().toISOString(),
      mensaje: motivo,
      tipo: 'cancelacion-manual',
    },
  }, currentReserva);
};

export const getReservasPendientesHoy = async () => {
  const today = new Date().toISOString().split('T')[0];
  const reservas = await getReservas({ fecha: today });
  return reservas.filter((reserva) => reserva.estado === 'Pendiente');
};

export const cancelarReservasVencidas = async () => {
  const horarios = await fetchWorkingHorarios();
  const reservasPendientes = await getReservasPendientesHoy();

  let canceladas = 0;

  for (const reserva of reservasPendientes) {
    const evaluation = evaluateReservationStatus(reserva, horarios);

    if (!evaluation.shouldUpdate || evaluation.newStatus !== 'Cancelada') {
      continue;
    }

    await updateReservaWithVerification(reserva.id, {
      estado: 'Cancelada',
      confirmada: false,
      motivoCancelacion: evaluation.message,
      verificacionAsistencia: {
        fecha: new Date().toISOString(),
        mensaje: evaluation.message,
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

export const getEscritoriosDisponibles = async (fecha) => {
  const reservas = await getReservas({ fecha });
  const activas = reservas.filter((reserva) => reserva.estado === 'Pendiente' || reserva.estado === 'Confirmada');
  const ocupados = activas.map((reserva) => Number(reserva.escritorioId)).filter((id) => !Number.isNaN(id));

  return [1, 2, 3, 4, 5, 6].filter((id) => !ocupados.includes(id));
};

export const clearReservasOverlay = () => {
  inMemoryStatusMap.clear();
  emitReservationsUpdated({ cleared: true });
  return true;
};

export const exportReservasToJSON = async () => {
  const reservas = await getReservas();
  const dataStr = JSON.stringify(reservas, null, 2);
  const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
  const fileName = `reservas_backup_${new Date().toISOString().split('T')[0]}.json`;

  const link = document.createElement('a');
  link.setAttribute('href', dataUri);
  link.setAttribute('download', fileName);
  link.click();

  return true;
};

export { RESERVAS_UPDATED_EVENT };
