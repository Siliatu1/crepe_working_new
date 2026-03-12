import axiosInstance from '../api/axiosInstance';

const WORKPLACE_COORDS = {
  latitude: 4.74488,
  longitude: -74.04483,
  name: 'Crepe-Working 1'
};

const ALLOWED_RADIUS_METERS = 1000;
const VERIFICATION_WINDOW_MINUTES = 25;
const CACHE_TTL_MS = 5 * 60 * 1000;
const WORKING_RESERVAS_ENDPOINT = 'https://macfer.crepesywaffles.com/api/working-reservas';

const DEFAULT_HORARIOS = [
  { id: 'manana', nombre: 'Turno 1', inicio: '08:00:00', fin: '12:00:00' },
  { id: 'tarde', nombre: 'Turno 2', inicio: '12:00:00', fin: '17:00:00' },
  { id: 'completo', nombre: 'Turno 3', inicio: '08:00:00', fin: '17:00:00' }
];

const metadataCache = {
  puestos: null,
  puestosFetchedAt: 0,
  horarios: null,
  horariosFetchedAt: 0
};

const fetchReservationsDataset = async () => {
  const response = await axiosInstance.get(WORKING_RESERVAS_ENDPOINT, {
    params: {
      populate: '*',
      'pagination[pageSize]': 40000,
    },
  });

  return normalizeCollection(response.data);
};

const normalizeText = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const resolveHorarioAlias = (value) => {
  const normalized = normalizeText(value);

  if (!normalized) return '';
  if (normalized === '1' || normalized === 'manana' || normalized === 'turno1' || normalized === 'am') return 'manana';
  if (normalized === '2' || normalized === 'tarde' || normalized === 'turno2' || normalized === 'pm') return 'tarde';
  if (normalized === '3' || normalized === 'completo' || normalized === 'diacompleto' || normalized === 'turno3' || normalized === 'fullday') return 'completo';

  return normalized;
};

const getTodayString = (referenceDate = new Date()) => {
  const year = referenceDate.getFullYear();
  const month = String(referenceDate.getMonth() + 1).padStart(2, '0');
  const day = String(referenceDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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

const buildDateFromMinutes = (dateString, totalMinutes) => {
  const [year, month, day] = String(dateString ?? '').split('-').map(Number);

  if (!year || !month || !day) {
    return null;
  }

  const safeMinutes = Math.max(0, totalMinutes);
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
};

const formatMinutes = (totalMinutes) => {
  const safeMinutes = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = String(Math.floor(safeMinutes / 60)).padStart(2, '0');
  const minutes = String(safeMinutes % 60).padStart(2, '0');
  return `${hours}:${minutes}`;
};

const parseTimeToMinutes = (value, hint = '') => {
  if (value == null || value === '') {
    return null;
  }

  const rawValue = String(value).trim().toLowerCase();
  if (!rawValue) {
    return null;
  }

  const meridianMatch = rawValue.match(/^(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?\s*(am|pm)$/i);
  if (meridianMatch) {
    let hours = Number(meridianMatch[1]);
    const minutes = Number(meridianMatch[2] ?? '0');
    const meridian = meridianMatch[4].toLowerCase();

    if (Number.isNaN(hours) || Number.isNaN(minutes) || minutes >= 60) {
      return null;
    }

    if (meridian === 'am' && hours === 12) {
      hours = 0;
    }

    if (meridian === 'pm' && hours < 12) {
      hours += 12;
    }

    return hours * 60 + minutes;
  }

  const parts = rawValue.replace(/\s/g, '').split(':');
  if (parts.length < 2) {
    return null;
  }

  let hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  const normalizedHint = normalizeText(hint);

  if (Number.isNaN(hours) || Number.isNaN(minutes) || hours > 24 || minutes >= 60) {
    return null;
  }

  if (hours < 8 && (normalizedHint.includes('turno2') || normalizedHint.includes('tarde'))) {
    hours += 12;
  }

  if (hours === 24) {
    hours = 0;
  }

  return hours * 60 + minutes;
};

const normalizeHorarioId = (nombre, startMinutes, endMinutes, index) => {
  const normalizedName = normalizeText(nombre);

  if (normalizedName.includes('turno1') || (startMinutes === 480 && endMinutes === 720)) {
    return 'manana';
  }

  if (normalizedName.includes('turno2') || (startMinutes === 780 && endMinutes === 1020)) {
    return 'tarde';
  }

  if (normalizedName.includes('turno3') || (startMinutes === 480 && endMinutes === 1020)) {
    return 'completo';
  }

  return `horario-${index + 1}`;
};

const normalizeHorario = (item, index) => {
  const attributes = extractAttributes(item);
  const startMinutes = parseTimeToMinutes(attributes.inicio, attributes.nombre);
  const endMinutes = parseTimeToMinutes(attributes.fin, attributes.nombre);

  return {
    id: normalizeHorarioId(attributes.nombre, startMinutes, endMinutes, index),
    sourceId: item?.id ?? attributes.id ?? index + 1,
    nombre: attributes.nombre || `Turno ${index + 1}`,
    inicio: attributes.inicio,
    fin: attributes.fin,
    startMinutes,
    endMinutes,
    verificationWindowMinutes: VERIFICATION_WINDOW_MINUTES,
    verificationEndMinutes:
      startMinutes == null ? null : startMinutes + VERIFICATION_WINDOW_MINUTES
  };
};

const getDefaultHorarios = () => DEFAULT_HORARIOS.map(normalizeHorario);

const normalizePuesto = (item, index) => {
  const attributes = extractAttributes(item);
  const parsedPosition = Number(String(attributes.nombre ?? '').replace(/\D/g, ''));

  return {
    id: item?.id ?? attributes.id ?? index + 1,
    nombre: attributes.nombre || `escritorio${index + 1}`,
    estado: Boolean(attributes.estado),
    puestoNumero: Number.isNaN(parsedPosition) ? index + 1 : parsedPosition
  };
};

const resolveHorarioFromReserva = (reserva, horarios = []) => {
  const sourceHorarios = Array.isArray(horarios) && horarios.length > 0
    ? horarios
    : getDefaultHorarios();

  const normalizedHorario = normalizeText(reserva?.horario);
  const normalizedTurno = normalizeText(reserva?.turno);
  const normalizedTurnoLabel = normalizeText(reserva?.turnoLabel);
  const normalizedHorarioNombre = normalizeText(reserva?.horarioNombre);
  const normalizedHorarioId = resolveHorarioAlias(reserva?.horarioId);
  const normalizedWorkingHorarioId = resolveHorarioAlias(reserva?.workingHorarioId);
  const startMinutes = parseTimeToMinutes(reserva?.horaInicio, reserva?.turno);
  const endMinutes = parseTimeToMinutes(reserva?.horaFin, reserva?.turno);

  return sourceHorarios.find((horario) => {
    const horarioSourceId = String(horario.sourceId ?? '');
    const normalizedSourceId = resolveHorarioAlias(horarioSourceId);
    const horarioName = normalizeText(horario.nombre);
    const horarioAlias = resolveHorarioAlias(horario.id);

    return (
      normalizedHorario === horarioAlias ||
      normalizedHorario === horarioName ||
      normalizedTurno === horarioName ||
      normalizedTurnoLabel === horarioName ||
      normalizedTurno === horarioAlias ||
      normalizedTurnoLabel === horarioAlias ||
      normalizedHorarioNombre === horarioName ||
      normalizedHorarioId === normalizedSourceId ||
      normalizedHorarioId === horarioAlias ||
      normalizedWorkingHorarioId === normalizedSourceId ||
      normalizedWorkingHorarioId === horarioAlias ||
      (startMinutes != null && startMinutes === horario.startMinutes &&
        (endMinutes == null || endMinutes === horario.endMinutes)) ||
      ((normalizedTurno.includes('manana') || normalizedTurnoLabel.includes('manana')) && horarioAlias === 'manana') ||
      ((normalizedTurno.includes('tarde') || normalizedTurnoLabel.includes('tarde')) && horarioAlias === 'tarde') ||
      ((normalizedTurno.includes('completo') || normalizedTurno.includes('dia') || normalizedTurnoLabel.includes('completo') || normalizedTurnoLabel.includes('dia')) && horarioAlias === 'completo')
    );
  }) ?? null;
};

const isReservationConfirmed = (reserva) =>
  reserva?.estado === 'Confirmada' || reserva?.confirmada === true;

const isReservationCanceled = (reserva) =>
  reserva?.estado === 'Cancelada' ||
  String(reserva?.motivoCancelacion ?? '').trim().length > 0 ||
  String(reserva?.verificacionAsistencia?.tipo ?? '').toLowerCase().includes('cancelacion');

const buildPendingResult = (reserva, overrides = {}) => ({
  success: false,
  shouldUpdate: false,
  newStatus: reserva?.estado || 'Pendiente',
  confirmed: reserva?.confirmada ?? null,
  alertType: 'info',
  ...overrides
});

export const fetchWorkingPuestos = async ({ force = false } = {}) => {
  const now = Date.now();

  if (!force && metadataCache.puestos && now - metadataCache.puestosFetchedAt < CACHE_TTL_MS) {
    return metadataCache.puestos;
  }

  try {
    const reservations = await fetchReservationsDataset();
    const puestosMap = new Map();

    reservations.forEach((item) => {
      const attrs = extractAttributes(item);
      const rel = attrs?.working_puestos?.data ?? attrs?.working_puestos;

      if (rel) {
        const normalized = normalizePuesto(rel, puestosMap.size);
        puestosMap.set(String(normalized.id), normalized);
      }

      if (attrs?.escritorioId != null) {
        const escritorioId = Number(attrs.escritorioId);
        if (!Number.isNaN(escritorioId) && !puestosMap.has(String(escritorioId))) {
          puestosMap.set(String(escritorioId), {
            id: escritorioId,
            nombre: attrs.escritorio || `escritorio${escritorioId}`,
            estado: false,
            puestoNumero: escritorioId,
          });
        }
      }
    });

    const puestos = Array.from(puestosMap.values());

    metadataCache.puestos = puestos;
    metadataCache.puestosFetchedAt = now;
    return puestos;
  } catch (error) {
    console.warn('No se pudieron cargar los puestos remotos:', error);

    if (metadataCache.puestos) {
      return metadataCache.puestos;
    }

    const fallback = Array.from({ length: 6 }, (_, index) => ({
      id: index + 1,
      nombre: `escritorio${index + 1}`,
      estado: false,
      puestoNumero: index + 1
    }));

    metadataCache.puestos = fallback;
    metadataCache.puestosFetchedAt = now;
    return fallback;
  }
};

export const fetchWorkingHorarios = async ({ force = false } = {}) => {
  const now = Date.now();

  if (!force && metadataCache.horarios && now - metadataCache.horariosFetchedAt < CACHE_TTL_MS) {
    return metadataCache.horarios;
  }

  try {
    const reservations = await fetchReservationsDataset();
    const horariosMap = new Map();

    reservations.forEach((item) => {
      const attrs = extractAttributes(item);
      const rel = attrs?.working_horarios?.data ?? attrs?.working_horarios;

      if (rel) {
        const normalized = normalizeHorario(rel, horariosMap.size);
        if (normalized.startMinutes != null && normalized.endMinutes != null) {
          horariosMap.set(String(normalized.sourceId), normalized);
        }
      }

      if (attrs?.horario || attrs?.turno || attrs?.horaInicio) {
        const fallbackHorario = normalizeHorario({
          id: attrs?.horarioId ?? horariosMap.size + 1,
          attributes: {
            nombre: attrs.horario || attrs.turno || `Turno ${horariosMap.size + 1}`,
            inicio: attrs.horaInicio || '08:00:00',
            fin: attrs.horaFin || '17:00:00',
          },
        }, horariosMap.size);

        if (fallbackHorario.startMinutes != null && fallbackHorario.endMinutes != null) {
          horariosMap.set(String(fallbackHorario.sourceId), fallbackHorario);
        }
      }
    });

    const horarios = Array.from(horariosMap.values());

    if (horarios.length === 0) {
      throw new Error('La API no devolvió horarios válidos');
    }

    metadataCache.horarios = horarios;
    metadataCache.horariosFetchedAt = now;
    return horarios;
  } catch (error) {
    console.warn('No se pudieron cargar los horarios remotos:', error);

    if (metadataCache.horarios) {
      return metadataCache.horarios;
    }

    const fallback = getDefaultHorarios();
    metadataCache.horarios = fallback;
    metadataCache.horariosFetchedAt = now;
    return fallback;
  }
};

/**
 * Calcula la distancia entre dos coordenadas usando la fórmula de Haversine
 * @param {number} lat1 - Latitud del punto 1
 * @param {number} lon1 - Longitud del punto 1
 * @param {number} lat2 - Latitud del punto 2
 * @param {number} lon2 - Longitud del punto 2
 * @returns {number} Distancia en metros
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Radio de la Tierra en metros
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
};

/**
 * Verifica si una coordenada está dentro del radio permitido
 * @param {number} userLat - Latitud del usuario
 * @param {number} userLon - Longitud del usuario
 * @returns {boolean} true si está dentro del radio
 */
export const isWithinRadius = (userLat, userLon) => {
  const distance = calculateDistance(
    userLat,
    userLon,
    WORKPLACE_COORDS.latitude,
    WORKPLACE_COORDS.longitude
  );
  
  console.log(` Distancia al lugar de trabajo: ${distance.toFixed(2)} metros`);
  
  return distance <= ALLOWED_RADIUS_METERS;
};

/**
 * Verifica el estado de los permisos de geolocalización
 * @returns {Promise<string>} Estado del permiso: 'granted', 'denied', 'prompt', 'unsupported'
 */
export const checkLocationPermission = async () => {
  try {
    // Verificar si la API de permisos está disponible
    if (!navigator.permissions) {
      console.warn('API de permisos no disponible, intentando geolocalización directa');
      return 'unsupported';
    }

    const result = await navigator.permissions.query({ name: 'geolocation' });
    console.log('📋 Estado de permiso de ubicación:', result.state);
    return result.state; // 'granted', 'denied', o 'prompt'
  } catch (error) {
    console.warn('Error al verificar permisos:', error);
    // En iOS Safari y algunos navegadores antiguos, la API de permisos no está disponible
    return 'unsupported';
  }
};

/**
 * Solicita permiso de ubicación de manera explícita
 * @returns {Promise<boolean>} true si se otorgó el permiso
 */
export const requestLocationPermission = async () => {
  try {
    const permissionStatus = await checkLocationPermission();
    
    if (permissionStatus === 'granted') {
      console.log('Permiso de ubicación ya otorgado');
      return true;
    }
    
    if (permissionStatus === 'denied') {
      console.log(' Permiso de ubicación denegado previamente');
      return false;
    }

    // Intentar obtener ubicación para activar el prompt de permisos
    console.log(' Solicitando permiso de ubicación...');
    await getCurrentPosition();
    return true;
  } catch (error) {
    console.error('Error al solicitar permiso:', error);
    return false;
  }
};

/**
 * Obtiene la posición actual del usuario
 * @returns {Promise<{latitude: number, longitude: number, accuracy: number}>}
 */
export const getCurrentPosition = () => {
  return new Promise((resolve, reject) => {
    // Verificar soporte de geolocalización
    if (!navigator.geolocation) {
      reject(new Error('La geolocalización no está soportada en este navegador. Intenta usar Chrome, Firefox, Safari o Edge actualizados.'));
      return;
    }

    // Opciones de geolocalización optimizadas para diferentes dispositivos
    const options = {
      enableHighAccuracy: true,     // Usar GPS si está disponible
      timeout: 15000,                // 15 segundos (aumentado para dispositivos lentos)
      maximumAge: 5000               // Acepta posiciones de hasta 5 segundos
    };

    console.log('📍 Solicitando ubicación GPS...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('✅ Ubicación obtenida:', {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
        
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          altitudeAccuracy: position.coords.altitudeAccuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
          timestamp: position.timestamp
        });
      },
      (error) => {
        let errorMessage = 'Error al obtener la ubicación';
        let errorDetails = '';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Permiso de ubicación denegado';
            errorDetails = 'Debes habilitar los permisos de ubicación en tu navegador. ';
            
            // Instrucciones específicas por navegador/dispositivo
            if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
              errorDetails += 'En iOS: Ajustes > Safari > Ubicación > Permitir.';
            } else if (/Android/.test(navigator.userAgent)) {
              errorDetails += 'En Android: Ajustes > Aplicaciones > Chrome/Navegador > Permisos > Ubicación > Permitir.';
            } else {
              errorDetails += 'Haz clic en el ícono de candado en la barra de direcciones y activa "Ubicación".';
            }
            break;
            
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Ubicación no disponible';
            errorDetails = 'Tu dispositivo no puede determinar tu ubicación. Asegúrate de tener GPS/WiFi activado y estar en un lugar con señal.';
            break;
            
          case error.TIMEOUT:
            errorMessage = 'Tiempo de espera agotado';
            errorDetails = 'No se pudo obtener tu ubicación a tiempo. Verifica tu conexión, activa el GPS e intenta nuevamente.';
            break;
            
          default:
            errorMessage = 'Error desconocido al obtener ubicación';
            errorDetails = 'Por favor verifica que tengas GPS/WiFi activado y permisos de ubicación habilitados.';
        }
        
        console.error('❌ Error de geolocalización:', errorMessage, error);
        
        const fullError = new Error(errorMessage);
        fullError.details = errorDetails;
        fullError.code = error.code;
        
        reject(fullError);
      },
      options
    );
  });
};

/**
 * Verifica si la fecha de una reserva es hoy
 * @param {string} fechaReserva - Fecha en formato ISO (YYYY-MM-DD)
 * @param {Date} referenceDate - Fecha de referencia
 * @returns {boolean} true si la reserva es para hoy
 */
export const isReservationForToday = (fechaReserva, referenceDate = new Date()) => {
  return fechaReserva === getTodayString(referenceDate);
};

/**
 * Obtiene información de la ventana de verificación de una reserva
 */
export const getVerificationTimeInfo = (reserva, horarios = [], referenceDate = new Date()) => {
  const horario = resolveHorarioFromReserva(reserva, horarios);
  const fechaReserva = reserva?.fecha;
  const isToday = isReservationForToday(fechaReserva, referenceDate);

  if (!horario || !fechaReserva) {
    return {
      scheduleResolved: false,
      isToday,
      isBefore: false,
      isActive: false,
      isPast: false,
      startTime: null,
      endTime: null,
      shiftStartTime: null,
      shiftEndTime: null,
      horario: null,
      message: 'No se pudo resolver el horario de la reserva'
    };
  }

  const verificationStart = buildDateFromMinutes(fechaReserva, horario.startMinutes);
  const verificationEnd = buildDateFromMinutes(
    fechaReserva,
    horario.startMinutes + horario.verificationWindowMinutes
  );
  const shiftEnd = buildDateFromMinutes(fechaReserva, horario.endMinutes);

  if (!verificationStart || !verificationEnd || !shiftEnd) {
    return {
      scheduleResolved: false,
      isToday,
      isBefore: false,
      isActive: false,
      isPast: false,
      startTime: null,
      endTime: null,
      shiftStartTime: null,
      shiftEndTime: null,
      horario,
      message: 'El horario de la reserva no tiene una hora válida'
    };
  }

  const isBefore = referenceDate < verificationStart;
  const isPast = referenceDate > verificationEnd;
  const isActive = !isBefore && !isPast;

  let message = `Puedes confirmar entre ${formatMinutes(horario.startMinutes)} y ${formatMinutes(horario.startMinutes + horario.verificationWindowMinutes)}.`;
  if (!isToday) {
    message = 'La reserva no corresponde al día actual.';
  } else if (isBefore) {
    message = `La confirmación para este turno inicia a las ${formatMinutes(horario.startMinutes)}.`;
  } else if (isPast) {
    message = `La ventana de confirmación terminó a las ${formatMinutes(horario.startMinutes + horario.verificationWindowMinutes)}.`;
  }

  return {
    scheduleResolved: true,
    isToday,
    isBefore,
    isActive,
    isPast,
    startTime: formatMinutes(horario.startMinutes),
    endTime: formatMinutes(horario.startMinutes + horario.verificationWindowMinutes),
    shiftStartTime: formatMinutes(horario.startMinutes),
    shiftEndTime: formatMinutes(horario.endMinutes),
    verificationStart,
    verificationEnd,
    shiftEnd,
    horario,
    message
  };
};

/**
 * Verifica si la hora actual está dentro del rango de verificación
 * @returns {boolean} true si está dentro del horario de verificación
 */
export const isWithinVerificationTime = (reserva, horarios = [], referenceDate = new Date()) => {
  if (!reserva) {
    const currentMinutes = referenceDate.getHours() * 60 + referenceDate.getMinutes();
    return currentMinutes >= 480 && currentMinutes <= 505;
  }

  return getVerificationTimeInfo(reserva, horarios, referenceDate).isActive;
};

/**
 * Verifica si ya pasó el tiempo límite de verificación
 * @returns {boolean} true si ya pasó el tiempo límite
 */
export const isPastVerificationDeadline = (reserva, horarios = [], referenceDate = new Date()) => {
  if (!reserva) {
    const currentMinutes = referenceDate.getHours() * 60 + referenceDate.getMinutes();
    return currentMinutes > 505;
  }

  return getVerificationTimeInfo(reserva, horarios, referenceDate).isPast;
};

/**
 * Evalúa si una reserva pendiente debe cancelarse por vencimiento del turno
 */
export const evaluateReservationStatus = (reserva, horarios = [], referenceDate = new Date()) => {
  const timeInfo = getVerificationTimeInfo(reserva, horarios, referenceDate);

  if (!reserva) {
    return buildPendingResult(reserva, {
      message: 'No se recibió información de la reserva',
      alertType: 'error'
    });
  }

  if (!timeInfo.scheduleResolved) {
    return buildPendingResult(reserva, {
      message: timeInfo.message,
      timeInfo,
      alertType: 'warning'
    });
  }

  if (!timeInfo.isToday) {
    return buildPendingResult(reserva, {
      message: 'La reserva no corresponde al día actual',
      timeInfo
    });
  }

  if (isReservationConfirmed(reserva)) {
    return {
      success: true,
      shouldUpdate: false,
      newStatus: 'Confirmada',
      confirmed: true,
      message: 'La reserva ya fue confirmada',
      timeInfo,
      alertType: 'success'
    };
  }

  if (isReservationCanceled(reserva)) {
    return {
      success: true,
      shouldUpdate: false,
      newStatus: 'Cancelada',
      confirmed: false,
      message: 'La reserva ya estaba cancelada',
      timeInfo,
      alertType: 'warning'
    };
  }

  if (timeInfo.isBefore) {
    return buildPendingResult(reserva, {
      message: timeInfo.message,
      timeInfo
    });
  }

  if (timeInfo.isPast) {
    return {
      success: true,
      shouldUpdate: true,
      newStatus: 'Cancelada',
      confirmed: false,
      message: `Reserva cancelada por no confirmar dentro de los primeros ${VERIFICATION_WINDOW_MINUTES} minutos del turno.`,
      timeInfo,
      alertType: 'warning'
    };
  }

  return buildPendingResult(reserva, {
    message: `La reserva sigue pendiente. Puedes confirmar hasta las ${timeInfo.endTime}.`,
    timeInfo,
    alertType: 'info'
  });
};

/**
 * Verifica la asistencia del usuario y devuelve el nuevo estado de la reserva
 * @param {Object} reserva - Objeto de reserva
 * @param {Object} options - Horarios y posición opcionales
 * @returns {Promise<{success: boolean, newStatus: string, message: string, distance?: number}>}
 */
export const verifyAttendance = async (reserva, options = {}) => {
  try {
    console.log('🔍 Verificando asistencia para reserva:', reserva?.id);

    const horarios = Array.isArray(options.horarios) && options.horarios.length > 0
      ? options.horarios
      : await fetchWorkingHorarios();
    const timeInfo = getVerificationTimeInfo(reserva, horarios, options.referenceDate ?? new Date());

    if (!timeInfo.scheduleResolved) {
      return buildPendingResult(reserva, {
        message: timeInfo.message,
        timeInfo,
        alertType: 'warning'
      });
    }

    if (!timeInfo.isToday) {
      return buildPendingResult(reserva, {
        message: 'La reserva no es para hoy',
        timeInfo
      });
    }

    if (isReservationConfirmed(reserva)) {
      return {
        success: true,
        shouldUpdate: false,
        newStatus: 'Confirmada',
        confirmed: true,
        message: 'La reserva ya fue confirmada previamente',
        timeInfo,
        alertType: 'success'
      };
    }

    if (timeInfo.isBefore) {
      return buildPendingResult(reserva, {
        message: timeInfo.message,
        timeInfo
      });
    }

    if (timeInfo.isPast) {
      return {
        success: true,
        shouldUpdate: !isReservationCanceled(reserva),
        newStatus: 'Cancelada',
        confirmed: false,
        message: `La reserva quedó cancelada porque no se confirmó durante los primeros ${VERIFICATION_WINDOW_MINUTES} minutos del turno.`,
        timeInfo,
        alertType: 'warning'
      };
    }

    const workplaceInfo = options.workplaceInfo ?? getWorkplaceInfo();
    const position = options.position ?? await getCurrentPosition();

    console.log(` Ubicación usuario: ${position.latitude}, ${position.longitude}`);
    console.log(` Precisión: ${position.accuracy} metros`);

    const distance = calculateDistance(
      position.latitude,
      position.longitude,
      workplaceInfo.latitude,
      workplaceInfo.longitude
    );

    if (distance <= workplaceInfo.radius) {
      return {
        success: true,
        shouldUpdate: true,
        newStatus: 'Confirmada',
        confirmed: true,
        withinPerimeter: true,
        message: `Asistencia confirmada. Distancia: ${distance.toFixed(0)} metros.`,
        distance,
        position,
        timeInfo,
        alertType: 'success'
      };
    }

    return {
      success: false,
      shouldUpdate: false,
      newStatus: reserva?.estado || 'Pendiente',
      confirmed: null,
      withinPerimeter: false,
      message: `Estás a ${distance.toFixed(0)} metros del punto. Debes estar dentro de ${workplaceInfo.radius} metros antes de las ${timeInfo.endTime}.`,
      distance,
      position,
      timeInfo,
      alertType: 'warning'
    };
  } catch (error) {
    console.error('Error al verificar asistencia:', error);

    return buildPendingResult(reserva, {
      message: error.message || 'Error al verificar ubicación',
      details: error.details,
      alertType: 'error'
    });
  }
};

/**
 * Obtiene las coordenadas del lugar de trabajo
 * @returns {Object} Coordenadas y radio
 */
export const getWorkplaceInfo = () => {
  return {
    ...WORKPLACE_COORDS,
    radius: ALLOWED_RADIUS_METERS,
    radiusKm: (ALLOWED_RADIUS_METERS / 1000).toFixed(2)
  };
};

/**
 * Detecta el tipo de dispositivo y navegador del usuario
 * @returns {Object} Información del dispositivo
 */
export const getDeviceInfo = () => {
  const ua = navigator.userAgent;
  
  const isIOS = /iPhone|iPad|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);
  const isMobile = isIOS || isAndroid || /Mobile/.test(ua);
  
  const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
  const isChrome = /Chrome/.test(ua) && !/Edge/.test(ua);
  const isFirefox = /Firefox/.test(ua);
  const isEdge = /Edge|Edg/.test(ua);
  
  return {
    isIOS,
    isAndroid,
    isMobile,
    isDesktop: !isMobile,
    browser: {
      isSafari,
      isChrome,
      isFirefox,
      isEdge,
      name: isChrome ? 'Chrome' : isSafari ? 'Safari' : isFirefox ? 'Firefox' : isEdge ? 'Edge' : 'Desconocido'
    }
  };
};

/**
 * Obtiene instrucciones de permisos específicas para el dispositivo
 * @returns {Object} Instrucciones paso a paso
 */
export const getPermissionInstructions = () => {
  const device = getDeviceInfo();
  
  if (device.isIOS) {
    return {
      title: 'Cómo habilitar ubicación en iOS',
      steps: [
        'Abre Ajustes en tu iPhone/iPad',
        'Busca y toca "Safari" o tu navegador',
        'Toca "Ubicación"',
        'Selecciona "Permitir" o "Permitir al usar la app"',
        'Recarga esta página y vuelve a intentar'
      ]
    };
  }
  
  if (device.isAndroid) {
    return {
      title: 'Cómo habilitar ubicación en Android',
      steps: [
        'Abre Ajustes en tu dispositivo',
        'Ve a "Aplicaciones" o "Apps"',
        `Busca "${device.browser.name}" (tu navegador)`,
        'Toca "Permisos"',
        'Toca "Ubicación" y selecciona "Permitir"',
        'Recarga esta página y vuelve a intentar'
      ]
    };
  }
  
  // Desktop
  return {
    title: 'Cómo habilitar ubicación en navegador',
    steps: [
      'Haz clic en el ícono de candado (🔒) en la barra de direcciones',
      'Busca "Ubicación" en el menú',
      'Selecciona "Permitir" o "Preguntar"',
      'Recarga esta página',
      'Haz clic en "Permitir" cuando el navegador pregunte'
    ]
  };
};

/**
 * Verifica si el dispositivo tiene capacidades de geolocalización
 * @returns {Object} Estado de capacidades
 */
export const checkGeolocationSupport = () => {
  const hasGeolocation = 'geolocation' in navigator;
  const hasPermissionsAPI = 'permissions' in navigator;
  const isSecureContext = window.isSecureContext || window.location.protocol === 'https:';
  
  return {
    supported: hasGeolocation,
    hasPermissionsAPI,
    isSecureContext,
    warnings: [
      ...(!hasGeolocation ? ['Tu navegador no soporta geolocalización'] : []),
      ...(!isSecureContext ? ['La geolocalización requiere HTTPS o localhost'] : []),
      ...(!hasPermissionsAPI ? ['API de permisos no disponible (normal en iOS)'] : [])
    ]
  };
};

// Exportar constantes para usar en otros componentes
export const WORKPLACE_LOCATION = WORKPLACE_COORDS;
export const VERIFICATION_RADIUS = ALLOWED_RADIUS_METERS;
export const VERIFICATION_HOURS = {
  windowMinutes: VERIFICATION_WINDOW_MINUTES
};
