import axiosInstance from '../api/axiosInstance';
import {
  evaluateReservationStatus,
  fetchWorkingHorarios,
} from './geolocationService';

const API_RESERVAS_ENDPOINT = 'https://macfer.crepesywaffles.com/api/working-reservas';
const API_PAGE_SIZE = 40000;
const RESERVAS_UPDATED_EVENT = 'working-reservas-updated';
const reservationOverlay = {};

const extractAttributes = (item) => item?.attributes ?? item ?? {};

const normalizeCollection = (payload) => {
  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  return [];
};

const normalizeStatus = (value, fallback = 'Pendiente') => {
  if (value === true) {
    return 'Confirmada';
  }

  if (value === false || value == null) {
    return fallback;
  }

  const text = String(value).trim().toLowerCase();
  if (text === 'confirmada') {
    return 'Confirmada';
  }

  if (text === 'cancelada') {
    return 'Cancelada';
  }

  if (text === 'pendiente') {
    return 'Pendiente';
  }

  return fallback;
};

const getOverlayMap = () => reservationOverlay;

const notifyReservationsUpdated = (detail = {}) => {
  window.dispatchEvent(new CustomEvent(RESERVAS_UPDATED_EVENT, {
    detail: {
      timestamp: Date.now(),
      ...detail,
    },
  }));
};

const mergeReservationState = (reserva, overlay = {}) => {
  const merged = {
    ...reserva,
    ...overlay,
  };

  merged.estado = normalizeStatus(
    overlay.estado,
    normalizeStatus(
      reserva.estado,
      overlay.confirmada === false && overlay.motivoCancelacion ? 'Cancelada' : 'Pendiente'
    )
  );

  if (overlay.confirmada !== undefined) {
    merged.confirmada = overlay.confirmada;
  } else if (merged.estado === 'Confirmada') {
    merged.confirmada = true;
  } else if (merged.estado === 'Cancelada') {
    merged.confirmada = false;
  } else {
    merged.confirmada = reserva.confirmada ?? null;
  }

  return merged;
};

const normalizeReserva = (item, overlayMap = {}) => {
  const attributes = extractAttributes(item);
  const id = item?.id ?? attributes.id ?? attributes.documento ?? Date.now();
  const overlay = overlayMap[String(id)] ?? {};

  const baseReservation = {
    id,
    key: id,
    nombre: attributes.Nombre || attributes.nombre || '',
    foto: attributes.foto || '',
    cedula: attributes.documento || attributes.cedula || '',
    area: attributes.area || attributes.area_nombre || '',
    fecha: attributes.fecha_reserva || attributes.fecha || null,
    estado: normalizeStatus(attributes.estado),
    confirmada: attributes.confirmada ?? (attributes.estado === true ? true : null),
    escritorio: attributes.escritorio || null,
    escritorioId: attributes.escritorioId ?? null,
    horario: attributes.horario || attributes.turno || null,
    turno: attributes.turno || attributes.horario || null,
    horaInicio: attributes.horaInicio || null,
    horaFin: attributes.horaFin || null,
    motivoCancelacion: attributes.motivoCancelacion || null,
    canceladaAutomaticamente: Boolean(attributes.canceladaAutomaticamente),
    verificacionAsistencia: attributes.verificacionAsistencia || null,
    createdAt: attributes.createdAt || null,
    updatedAt: attributes.updatedAt || null,
    rawAttributes: attributes,
  };

  return mergeReservationState(baseReservation, overlay);
};

const normalizeFallbackReserva = (reserva, overlayMap = {}) => {
  const id = reserva?.id ?? reserva?.key ?? Date.now();
  const overlay = overlayMap[String(id)] ?? {};

  return mergeReservationState({
    ...reserva,
    id,
    key: id,
    estado: normalizeStatus(reserva?.estado),
  }, overlay);
};

const buildRequestParams = (filters = {}) => {
  const params = {
    'pagination[pageSize]': API_PAGE_SIZE,
  };

  if (filters.cedula) {
    params['filters[documento][$eq]'] = String(filters.cedula);
  }

  if (filters.fecha) {
    params['filters[fecha_reserva][$eq]'] = filters.fecha;
  }

  return params;
};

const sortReservas = (reservas) => (
  [...reservas].sort((left, right) => {
    const leftDate = String(left.fecha || '');
    const rightDate = String(right.fecha || '');

    if (leftDate !== rightDate) {
      return rightDate.localeCompare(leftDate);
    }

    return Number(right.id || 0) - Number(left.id || 0);
  })
);

const persistOverlay = (id, updates, currentReserva = null) => {
  const overlayMap = getOverlayMap();
  const reservationId = String(id);
  const nextOverlay = {
    ...(overlayMap[reservationId] ?? {}),
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  overlayMap[reservationId] = nextOverlay;
  notifyReservationsUpdated({ id });

  if (currentReserva) {
    return mergeReservationState(currentReserva, nextOverlay);
  }

  return {
    id,
    key: id,
    ...nextOverlay,
  };
};

const getBooleanStatus = (reserva) => {
  if (reserva?.confirmada === true || reserva?.estado === 'Confirmada') {
    return true;
  }

  return false;
};

const buildRemotePayload = (baseReserva = {}, overrides = {}) => {
  const merged = {
    ...baseReserva,
    ...overrides,
  };

  const payload = {
    Nombre: merged.nombre || merged.Nombre || '',
    foto: merged.foto || '',
    documento: String(merged.cedula || merged.documento || ''),
    area: merged.area || merged.area_nombre || '',
    fecha_reserva: merged.fecha || merged.fecha_reserva || null,
    estado: getBooleanStatus(merged),
  };

  if (merged.escritorio != null) {
    payload.escritorio = merged.escritorio;
  }

  if (merged.escritorioId != null) {
    payload.escritorioId = Number(merged.escritorioId);
  }

  if (merged.horario != null) {
    payload.horario = merged.horario;
  }

  if (merged.turno != null) {
    payload.turno = merged.turno;
  }

  if (merged.horaInicio != null) {
    payload.horaInicio = merged.horaInicio;
  }

  if (merged.horaFin != null) {
    payload.horaFin = merged.horaFin;
  }

  if (merged.correo != null) {
    payload.correo = merged.correo;
  }

  if (merged.cargo != null) {
    payload.cargo = merged.cargo;
  }

  return payload;
};

const tryRemoteUpdate = async (id, updates, currentReserva = null) => {
  const payload = buildRemotePayload(currentReserva, updates);

  if (Object.keys(payload).length === 0) {
    return null;
  }

  const response = await axiosInstance.put(`${API_RESERVAS_ENDPOINT}/${id}`, {
    data: payload,
  });

  return response.data?.data ?? response.data ?? null;
};

export const getReservas = async (filters = {}) => {
  const overlayMap = getOverlayMap();

  try {
    const response = await axiosInstance.get(API_RESERVAS_ENDPOINT, {
      params: buildRequestParams(filters),
    });

    return sortReservas(
      normalizeCollection(response.data).map((item) => normalizeReserva(item, overlayMap))
    );
  } catch (error) {
    console.error('Error al consultar reservas remotas:', error);
    return [];
  }
};

export const getReservasByUsuario = async (cedula) => {
  if (!cedula) {
    return [];
  }

  return getReservas({ cedula });
};

export const updateReservaWithVerification = async (id, updateData, currentReserva = null) => {
  try {
    let remoteReservation = null;

    try {
      remoteReservation = await tryRemoteUpdate(id, updateData, currentReserva);
    } catch (error) {
      console.warn('No se pudo persistir la actualización en la API de working-reservas:', error);
    }

    const baseReservation = remoteReservation
      ? normalizeReserva(remoteReservation, getOverlayMap())
      : currentReserva;

    return persistOverlay(id, updateData, baseReservation);
  } catch (error) {
    console.error('Error al actualizar reserva con verificación:', error);
    return null;
  }
};

export const createReservaRecord = async (reservaData) => {
  const response = await axiosInstance.post(API_RESERVAS_ENDPOINT, {
    data: buildRemotePayload(reservaData),
  });

  const created = normalizeReserva(response.data?.data ?? response.data ?? null, getOverlayMap());

  if (reservaData?.estado || reservaData?.verificacionAsistencia || reservaData?.motivoCancelacion) {
    return persistOverlay(created.id, {
      estado: reservaData.estado,
      confirmada: reservaData.confirmada,
      motivoCancelacion: reservaData.motivoCancelacion ?? null,
      verificacionAsistencia: reservaData.verificacionAsistencia ?? null,
      canceladaAutomaticamente: reservaData.canceladaAutomaticamente ?? false,
      escritorio: reservaData.escritorio ?? created.escritorio,
      escritorioId: reservaData.escritorioId ?? created.escritorioId,
      horario: reservaData.horario ?? created.horario,
      turno: reservaData.turno ?? created.turno,
      horaInicio: reservaData.horaInicio ?? created.horaInicio,
      horaFin: reservaData.horaFin ?? created.horaFin,
      correo: reservaData.correo ?? created.correo,
      cargo: reservaData.cargo ?? created.cargo,
    }, created);
  }

  notifyReservationsUpdated({ id: created.id });
  return created;
};

export const updateReservaRecord = async (id, reservaData, currentReserva = null) => {
  const response = await axiosInstance.put(`${API_RESERVAS_ENDPOINT}/${id}`, {
    data: buildRemotePayload(currentReserva, reservaData),
  });

  const updated = normalizeReserva(response.data?.data ?? response.data ?? null, getOverlayMap());

  return persistOverlay(id, {
    estado: reservaData.estado,
    confirmada: reservaData.confirmada,
    motivoCancelacion: reservaData.motivoCancelacion ?? null,
    verificacionAsistencia: reservaData.verificacionAsistencia ?? null,
    canceladaAutomaticamente: reservaData.canceladaAutomaticamente ?? false,
    escritorio: reservaData.escritorio ?? updated.escritorio,
    escritorioId: reservaData.escritorioId ?? updated.escritorioId,
    horario: reservaData.horario ?? updated.horario,
    turno: reservaData.turno ?? updated.turno,
    horaInicio: reservaData.horaInicio ?? updated.horaInicio,
    horaFin: reservaData.horaFin ?? updated.horaFin,
    correo: reservaData.correo ?? updated.correo,
    cargo: reservaData.cargo ?? updated.cargo,
  }, updated);
};

export const deleteReservaRecord = async (id) => {
  await axiosInstance.delete(`${API_RESERVAS_ENDPOINT}/${id}`);
  delete reservationOverlay[String(id)];
  notifyReservationsUpdated({ id, deleted: true });
  return true;
};

export const cancelReserva = async (id, currentReserva = null, motivo = 'Reserva cancelada por el usuario.') => (
  updateReservaWithVerification(id, {
    estado: 'Cancelada',
    confirmada: false,
    motivoCancelacion: motivo,
    canceladaAutomaticamente: false,
    verificacionAsistencia: {
      fecha: new Date().toISOString(),
      mensaje: motivo,
      tipo: 'cancelacion-manual',
    },
  }, currentReserva)
);

export const getReservasPendientesHoy = async () => {
  const today = new Date().toISOString().split('T')[0];
  const reservas = await getReservas({ fecha: today });
  return reservas.filter((reserva) => reserva.estado === 'Pendiente');
};

export const cancelarReservasVencidas = async () => {
  try {
    const horarios = await fetchWorkingHorarios();
    const reservasPendientes = await getReservasPendientesHoy();
    let canceladas = 0;

    for (const reserva of reservasPendientes) {
      const evaluation = evaluateReservationStatus(reserva, horarios);

      if (!evaluation.shouldUpdate || evaluation.newStatus !== 'Cancelada') {
        continue;
      }

      const updated = await updateReservaWithVerification(reserva.id, {
        estado: 'Cancelada',
        confirmada: false,
        motivoCancelacion: evaluation.message,
        canceladaAutomaticamente: true,
        verificacionAsistencia: {
          fecha: new Date().toISOString(),
          mensaje: evaluation.message,
          tipo: 'auto-cancelacion',
        },
      }, reserva);

      if (updated) {
        canceladas += 1;
      }
    }

    if (canceladas === 0) {
      return {
        canceled: 0,
        message: 'No hay reservas vencidas para cancelar',
      };
    }

    return {
      canceled: canceladas,
      message: `${canceladas} reserva(s) cancelada(s) automáticamente`,
    };
  } catch (error) {
    console.error('Error al cancelar reservas vencidas:', error);
    return { canceled: 0, message: 'Error al cancelar reservas' };
  }
};

export const getEscritoriosDisponibles = async (fecha) => {
  try {
    const reservas = await getReservas({ fecha });
    const activas = reservas.filter(
      (reserva) => reserva.estado === 'Confirmada' || reserva.estado === 'Pendiente'
    );

    const todosEscritorios = [1, 2, 3, 4, 5, 6];
    const escritoriosOcupados = activas
      .map((reserva) => Number(reserva.escritorioId))
      .filter((value) => !Number.isNaN(value));

    return todosEscritorios.filter((id) => !escritoriosOcupados.includes(id));
  } catch (error) {
    console.error('Error al obtener escritorios disponibles:', error);
    return [];
  }
};

export const clearReservasOverlay = () => {
  try {
    Object.keys(reservationOverlay).forEach((key) => {
      delete reservationOverlay[key];
    });
    notifyReservationsUpdated({ cleared: true });
    return true;
  } catch (error) {
    console.error('Error al limpiar overlay de reservas:', error);
    return false;
  }
};

export const exportReservasToJSON = async () => {
  try {
    const reservas = await getReservas();
    const dataStr = JSON.stringify(reservas, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
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

export { RESERVAS_UPDATED_EVENT };
