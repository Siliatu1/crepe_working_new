export const ADMIN_DOCUMENTS = ['1019096266'];

export const HORARIO_META = {
  1: { label: 'Mañana', hora: '8:00 am – 12:00 m', badge: 'AM', badgeKey: 'am' },
  2: { label: 'Tarde', hora: '1:00 pm – 5:00 pm', badge: 'PM', badgeKey: 'pm' },
  3: { label: 'Día completo', hora: '8:00 am – 5:00 pm', badge: 'Todo el día', badgeKey: 'full' },
};

export const extractId = (rel) => {
  if (rel == null) return null;
  if (typeof rel === 'number') return rel;
  if (typeof rel === 'object' && rel.id != null) return rel.id;

  if (typeof rel === 'object' && rel.data != null) {
    const data = rel.data;
    if (typeof data === 'number') return data;
    if (Array.isArray(data) && data.length > 0) return data[0]?.id ?? null;
    if (typeof data === 'object' && data.id != null) return data.id;
  }

  return null;
};

export const getPuestoId = (reserva) => (
  extractId(reserva?.attributes?.working_puestos) ??
  extractId(reserva?.working_puestos) ??
  reserva?.attributes?.escritorioId ??
  reserva?.escritorioId ??
  null
);

export const getHorarioId = (reserva) => (
  extractId(reserva?.attributes?.working_horarios) ??
  extractId(reserva?.working_horarios) ??
  reserva?.attributes?.horarioId ??
  reserva?.horarioId ??
  null
);

const normalizeEstadoText = (value = '') => String(value)
  .trim()
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

export const toEstado = (value) => {
  if (value === true) return 'Confirmada';
  if (value === false) return 'Cancelada';
  if (value == null) return 'Pendiente';

  const normalized = normalizeEstadoText(value);
  if (['confirmada', 'confirmado', 'completada', 'completado'].includes(normalized)) return 'Confirmada';
  if (['cancelada', 'cancelado'].includes(normalized)) return 'Cancelada';
  return 'Pendiente';
};

export const getEstadoReserva = (reserva) => toEstado(reserva?.attributes?.estado ?? reserva?.estado);

export const esReservaActiva = (reserva) => getEstadoReserva(reserva) !== 'Cancelada';

export const getNombreReserva = (reserva) => {
  const attrs = reserva?.attributes ?? reserva ?? {};
  const nombreCompleto = [
    attrs.Nombre,
    attrs.nombreCompleto,
    attrs.nombre_completo,
    attrs.fullName,
    attrs.full_name,
  ].find((value) => typeof value === 'string' && value.trim());

  if (nombreCompleto) return nombreCompleto;

  const nombres = [
    attrs.nombre,
    attrs.nombres,
    attrs.firstName,
    attrs.first_name,
  ].find((value) => typeof value === 'string' && value.trim());

  const apellidos = [
    attrs.apellidos,
    attrs.apellido,
    attrs.lastName,
    attrs.last_name,
    attrs.primer_apellido,
    attrs.segundo_apellido,
    attrs.apellido_paterno,
    attrs.apellido_materno,
  ].find((value) => typeof value === 'string' && value.trim());

  const combinado = [nombres, apellidos].filter(Boolean).join(' ').trim();
  return combinado || attrs.documento || '—';
};

export const getPrimerNombreReserva = (reserva) => getNombreReserva(reserva).split(' ')[0];

export const getNombreCorto = (nombre = '') => {
  const partes = String(nombre).trim().split(/\s+/).filter(Boolean);
  if (partes.length >= 3) return `${partes[0]} ${partes[partes.length - 2]}`;
  if (partes.length === 2) return `${partes[0]} ${partes[1]}`;
  return partes[0] ?? '';
};

export const formatFechaIso = (isoDate) => {
  if (!isoDate) return '';
  const [year, month, day] = String(isoDate).split('-').map(Number);
  if (!year || !month || !day) return String(isoDate);
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
};

export const getLocalDateString = (referenceDate = new Date()) => {
  const year = referenceDate.getFullYear();
  const month = String(referenceDate.getMonth() + 1).padStart(2, '0');
  const day = String(referenceDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};