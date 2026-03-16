export const ADMIN_DOCUMENTS = ['1028783377', '1019096266'];

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