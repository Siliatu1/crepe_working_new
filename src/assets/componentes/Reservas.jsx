import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import sillaDis from '../../assets/sillaDis.png';
import sillaLim from '../../assets/sillaLim.png';
import sillaOcu from '../../assets/sillaOcu.png';
import mesaImg  from '../../assets/mesa.png';
import useRealtimeSync from '../../hooks/useRealtimeSync';

// ─── URLs ─────────────────────────────────────────────────────────────────────
const BASE         = 'https://macfer.crepesywaffles.com';
const API_HORARIOS = `${BASE}/api/working-horarios`;
const API_RESERVAS = `${BASE}/api/working-reservas`;

// ─── Constantes ───────────────────────────────────────────────────────────────
const CON_MONITOR = [1, 3, 6];
const ADMINS      = ['1028783377'];
const H_AM        = 1;
const H_PM        = 2;
const H_COMPLETO  = 3;

const HORARIO_META = {
  [H_AM]:       { label: 'Mañana',      hora: '8:00 am – 12:00 m',  badge: 'AM',          badgeKey: 'am'   },
  [H_PM]:       { label: 'Tarde',        hora: '1:00 pm – 5:00 pm',  badge: 'PM',          badgeKey: 'pm'   },
  [H_COMPLETO]: { label: 'Día completo', hora: '8:00 am – 5:00 pm',  badge: 'Todo el día', badgeKey: 'full' },
};

const SILLAS = [
  { id: 1, top: '-5%',  left: '0%',   rotate: '-15deg' },
  { id: 2, top: '-25%', left: '45%',  rotate: '25deg'  },
  { id: 3, top: '-25%', left: '70%',  rotate: '-20deg' },
  { id: 4, top: '95%',  left: '0%',   rotate: '210deg' },
  { id: 5, top: '75%',  left: '40%',  rotate: '180deg' },
  { id: 6, top: '75%',  right: '15%', rotate: '210deg' },
];

// ─── Días y fecha ─────────────────────────────────────────────────────────────
const DIAS_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/** Genera los próximos `n` días hábiles a partir de hoy (incluye hoy si es hábil) */
const generarFechasHabiles = (n = 5) => {
  const fechas = [];
  const hoy    = new Date();
  hoy.setHours(0, 0, 0, 0);
  let cursor = new Date(hoy);
  while (fechas.length < n) {
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) {  // excluye sábado (6) y domingo (0)
      const esHoy    = fechas.length === 0;
      const esManana = fechas.length === 1;
      const dia      = DIAS_CORTO[dow];
      const dd       = cursor.getDate();
      const mm       = cursor.getMonth() + 1;
      fechas.push({
        date:       new Date(cursor),
        iso:        cursor.toISOString().split('T')[0],
        label:      esHoy ? 'Hoy' : esManana ? 'Mañana' : dia,
        diaLabel:   dia,
        fechaLabel: `${dd}/${mm}`,          // "11/3"
        chipLabel:  `${dia}. ${dd}/${mm}`,  // "Mié. 11/3"
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return fechas;
};

const getReservationWindowForDate = (selectedDate) => {
  const start = new Date(selectedDate);
  start.setHours(5, 0, 0, 0);

  const end = new Date(selectedDate);
  end.setHours(17, 0, 0, 0);

  return { start, end };
};

const buildGetUrl = (fecha) =>
  `${API_RESERVAS}?filters[fecha_reserva][$eq]=${fecha}&populate=*`;

// ─── Diagnóstico ──────────────────────────────────────────────────────────────
const logEstructura = (reservas) => {
  if (!reservas.length) return;
  const r = reservas[0];
  console.group('🔍 [DEBUG] Estructura de reserva de la API');
  console.log('Reserva completa:', JSON.stringify(r, null, 2));
  console.groupEnd();
};

// ─── Extracción de IDs ────────────────────────────────────────────────────────
const extractId = (rel) => {
  if (rel === null || rel === undefined) return null;
  if (typeof rel === 'number') return rel;
  if (typeof rel === 'object' && rel.id !== undefined) return rel.id;
  if (rel.data !== null && rel.data !== undefined) {
    const d = rel.data;
    if (typeof d === 'number') return d;
    if (Array.isArray(d) && d.length > 0) return d[0].id ?? null;
    if (typeof d === 'object' && d.id !== undefined) return d.id;
  }
  return null;
};

const getPuestoId  = (r) => extractId(r.attributes?.working_puestos)  ?? extractId(r.working_puestos)  ?? null;
const getHorarioId = (r) => extractId(r.attributes?.working_horarios) ?? extractId(r.working_horarios) ?? null;
const getNombre    = (r) => r.attributes?.Nombre ?? r.attributes?.documento ?? r.Nombre ?? r.documento ?? '—';
const getPrimerNombre = (r) => getNombre(r).split(' ')[0];
const getFoto      = (r) => r.attributes?.foto ?? r.foto ?? null;

/** Primer nombre + primer apellido */
const getNombreCorto = (nombre = '') => {
  const partes = nombre.trim().split(/\s+/);
  return partes.length >= 2 ? `${partes[0]} ${partes[1]}` : partes[0] ?? '';
};

// ─── Lógica de disponibilidad ─────────────────────────────────────────────────
const turnosBloqueados = (reservas, puestoId) => {
  const bloq = new Set();
  reservas
    .filter(r => getPuestoId(r) === puestoId)
    .forEach(r => {
      const hId = getHorarioId(r);
      if (hId === H_AM)            { bloq.add(H_AM);  bloq.add(H_COMPLETO); }
      else if (hId === H_PM)       { bloq.add(H_PM);  bloq.add(H_COMPLETO); }
      else if (hId === H_COMPLETO) { bloq.add(H_AM);  bloq.add(H_PM); bloq.add(H_COMPLETO); }
    });
  return bloq;
};

const calcEstado = (reservas, puestoId) => {
  const rp           = reservas.filter(r => getPuestoId(r) === puestoId);
  const tieneAM      = rp.some(r => getHorarioId(r) === H_AM);
  const tienePM      = rp.some(r => getHorarioId(r) === H_PM);
  const tieneCompleto= rp.some(r => getHorarioId(r) === H_COMPLETO);
  if (tieneCompleto || (tieneAM && tienePM)) return 'ocupado';
  if (tieneAM || tienePM)                    return 'limitado';
  return 'disponible';
};

// ─── Iconos ───────────────────────────────────────────────────────────────────
const IconChevronLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);
const IconChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);
const IconArrowLeft = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
  </svg>
);
const IconShield = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const IconCalendar = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8"  y1="2" x2="8"  y2="6"/>
    <line x1="3"  y1="10" x2="21" y2="10"/>
  </svg>
);
const IconRefresh = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"/>
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
  </svg>
);
const IconMonitorLeyenda = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <rect x="2" y="3" width="20" height="14" rx="2"/>
    <line x1="8" y1="21" x2="16" y2="21"/>
    <line x1="12" y1="17" x2="12" y2="21"/>
  </svg>
);
const IconMonitorCard = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#503629" strokeWidth="2.5" strokeLinecap="round">
    <rect x="2" y="3" width="20" height="14" rx="2"/>
    <line x1="8" y1="21" x2="16" y2="21"/>
    <line x1="12" y1="17" x2="12" y2="21"/>
  </svg>
);
const IconUserCardLarge = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#92614F" strokeWidth="2" strokeLinecap="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);
const IconUser = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);
const IconMonitorSmall = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <rect x="2" y="3" width="20" height="14" rx="2"/>
    <line x1="8" y1="21" x2="16" y2="21"/>
    <line x1="12" y1="17" x2="12" y2="21"/>
  </svg>
);
const IconX = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6"  y1="6" x2="18" y2="18"/>
  </svg>
);
const IconLogout = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

// ─── Selector de fecha tipo chips ─────────────────────────────────────────────
const DateSelector = ({ fechas, fechaIndex, setFechaIndex }) => (
  <div className="reservas-dia-nav">
    <button
      className="reservas-dia-btn"
      onClick={() => setFechaIndex(i => Math.max(0, i - 1))}
      disabled={fechaIndex === 0}
      style={{ opacity: fechaIndex === 0 ? 0.28 : 1 }}
    >
      <IconChevronLeft />
    </button>

    {/* Chip de fecha */}
    <div className="reservas-dia-label" style={{ gap: 6 }}>
      <IconCalendar />
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
        <span style={{ fontWeight: 800, fontSize: '0.82rem', color: '#503629' }}>
          {fechas[fechaIndex].label}
        </span>
        <span style={{ fontSize: '0.7rem', color: 'rgba(80,54,41,0.55)', fontWeight: 600 }}>
          {fechas[fechaIndex].chipLabel}
        </span>
      </div>
    </div>

    <button
      className="reservas-dia-btn"
      onClick={() => setFechaIndex(i => Math.min(fechas.length - 1, i + 1))}
      disabled={fechaIndex === fechas.length - 1}
      style={{ opacity: fechaIndex === fechas.length - 1 ? 0.28 : 1 }}
    >
      <IconChevronRight />
    </button>
  </div>
);

// ─── OcupantesPanel ───────────────────────────────────────────────────────────
const OcupantesPanelContent = ({ reservas }) => (
  <div className="op-tabla">
    <div className="op-tabla__head">
      <span className="op-tabla__head-esc text-label">#</span>
      <span className="op-tabla__head-info text-label">Ocupante</span>
    </div>
    {[1, 2, 3, 4, 5, 6].map(id => {
      const estado       = calcEstado(reservas, id);
      const rp           = reservas.filter(r => getPuestoId(r) === id);
      const tieneMonitor = CON_MONITOR.includes(id);
      const vacio        = rp.length === 0;

      return (
        <div key={id} className={`op-fila op-fila--${estado} ${vacio ? 'op-fila--vacio' : ''}`}>
          <span className="op-fila__num">{id}</span>
          <div className="op-fila__personas">
            {rp.map((r, i) => {
              const hId   = getHorarioId(r);
              const hMeta = HORARIO_META[hId];
              const foto  = getFoto(r);
              const nombre= getPrimerNombre(r);
              return (
                <div key={i} className="op-fila__persona">
                  {foto && foto !== 'null' ? (
                    <img src={foto} alt={nombre} className="op-fila__foto" />
                  ) : (
                    <div className="op-fila__avatar"><IconUser /></div>
                  )}
                  <span className="op-fila__nombre">{nombre}</span>
                  {hMeta && (
                    <span className={`op-fila__turno op-fila__turno--${hMeta.badgeKey}`}>
                      {hMeta.badge}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          {tieneMonitor && (
            <span className="op-fila__monitor">
              <IconMonitorSmall />
            </span>
          )}
        </div>
      );
    })}
  </div>
);

// Estado visual mejorado por fila
const EstadoLinea = ({ estado }) => {
  const config = {
    disponible: { color: '#27ae60', label: 'Libre',     bg: 'rgba(39,174,96,0.1)'  },
    limitado:   { color: '#f0a500', label: 'Parcial',   bg: 'rgba(240,165,0,0.1)'  },
    ocupado:    { color: '#e74c3c', label: 'Ocupado',   bg: 'rgba(231,76,60,0.1)'  },
  }[estado] ?? { color: '#92614F', label: '—', bg: 'transparent' };

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: '0.58rem', fontWeight: 700,
      padding: '2px 6px', borderRadius: '999px',
      background: config.bg, color: config.color,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: config.color, flexShrink: 0 }} />
      {config.label}
    </span>
  );
};

// Wrapper panel desktop + drawer móvil
const OcupantesPanel = ({ reservas }) => {
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  return (
    <>
      {/* Desktop/tablet */}
      <div className="ocupantes-panel">
        <div className="ocupantes-panel__titulo text-label">Escritorios</div>
        <OcupantesPanelContent reservas={reservas} />
      </div>

      {/* FAB móvil */}
      <button
        className="ocupantes-fab"
        onClick={() => setDrawerOpen(true)}
        aria-label="Ver estado de escritorios"
      >
        <IconMonitorSmall />
        <span>Escritorios</span>
      </button>

      {/* Drawer móvil */}
      {drawerOpen && (
        <div className="ocupantes-drawer-backdrop" onClick={() => setDrawerOpen(false)}>
          <div className="ocupantes-drawer" onClick={e => e.stopPropagation()}>
            <div className="ocupantes-drawer__header">
              <span className="text-label">Estado de escritorios</span>
              <button
                className="ocupantes-drawer__close btn-outline"
                onClick={() => setDrawerOpen(false)}
                aria-label="Cerrar"
              >
                <IconX />
              </button>
            </div>
            <div className="ocupantes-drawer__body">
              <OcupantesPanelContent reservas={reservas} />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ─── BookingCard ──────────────────────────────────────────────────────────────
const BookingCard = ({
  escritorioId, usuario, reservas, horarios,
  onConfirm, onCancel,
  reservando, reservaOk, reservaErr,
  yaReservoHoy,
  canReserveNow,
  reserveWindowMessage,
}) => {
  const [horarioSelId, setHorarioSelId] = React.useState(null);

  React.useEffect(() => {
    if (!escritorioId || !horarios.length) return;
    const bloq    = turnosBloqueados(reservas, escritorioId);
    const primero = horarios.find(h => !bloq.has(h.id));
    setHorarioSelId(primero?.id ?? null);
  }, [escritorioId, reservas, horarios]);

  if (!escritorioId) return null;

  const bloq            = turnosBloqueados(reservas, escritorioId);
  const todoBloqueado   = bloq.size >= 3;
  const tieneMonitor    = CON_MONITOR.includes(escritorioId);
  const horarioSelObj   = horarios.find(h => h.id === horarioSelId);
  const puedeReservar   = canReserveNow && !yaReservoHoy && !todoBloqueado && !!horarioSelId && !reservaOk;

  const aviso = !canReserveNow
    ? reserveWindowMessage
    : yaReservoHoy
    ? '⚠ Ya tienes una reserva para este día'
    : todoBloqueado
    ? 'Este escritorio no tiene turnos disponibles'
    : null;

  return (
    <div className="booking-card-wrapper">
      <div className="booking-card">

        {/* Usuario */}
        <div className="booking-section booking-section--compact">
          <div className="booking-section-label">Reserva para</div>
          {usuario && (
            <div className="booking-user booking-user--row">
              {usuario.foto && usuario.foto !== 'null' ? (
                <img src={usuario.foto} alt={usuario.nombre} className="booking-user-foto booking-user-foto--sm" />
              ) : (
                <div className="booking-user-placeholder booking-user-placeholder--sm">
                  <IconUserCardLarge />
                </div>
              )}
              <div className="booking-user-info booking-user-info--row">
                <div className="booking-user-nombre">{getNombreCorto(usuario.nombre)}</div>
                <div className="booking-user-cargo">{usuario.cargo}</div>
                <div className="booking-user-area">{usuario.area_nombre}</div>
              </div>
            </div>
          )}
        </div>
        <div className="booking-divider" />

        {/* Ubicación */}
        <div className="booking-section booking-section--compact">
          <div className="booking-section-label">Ubicación</div>
          <div className="booking-ubicacion-row">
            <IconMonitorCard />
            <span className="booking-escritorio-nombre">Escritorio {escritorioId}</span>
            {tieneMonitor && <span className="booking-badge-monitor">Con monitor</span>}
          </div>
          {/* Estado del escritorio */}
          <div style={{ marginTop: 6 }}>
            <EstadoLinea estado={calcEstado(reservas, escritorioId)} />
          </div>
        </div>
        <div className="booking-divider" />

        {/* Horarios */}
        <div className="booking-section booking-section--compact">
          <div className="booking-section-label">Horario</div>
          <div className="booking-horarios">
            {horarios.map(h => {
              const esBloq        = bloq.has(h.id);
              const esSel         = horarioSelId === h.id;
              const meta          = HORARIO_META[h.id];
              const deshabilitado = esBloq || yaReservoHoy;
              return (
                <button
                  key={h.id}
                  onClick={() => !deshabilitado && setHorarioSelId(h.id)}
                  disabled={deshabilitado}
                  className={[
                    'booking-horario-btn',
                    esSel  ? 'booking-horario-btn--selected'  : '',
                    esBloq ? 'booking-horario-btn--bloqueado' : '',
                  ].join(' ')}
                  style={{
                    opacity: deshabilitado ? 0.38 : 1,
                    cursor:  deshabilitado ? 'not-allowed' : 'pointer',
                  }}
                >
                  <span className="booking-horario-label">{meta?.label}</span>
                  <span className="booking-horario-hora">{meta?.hora}</span>
                  {esBloq && (
                    <span style={{ fontSize: '0.6rem', color: '#c0392b', marginTop: 1 }}>
                      No disponible
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Feedback */}
        {(aviso || reservaErr || reservaOk) && (
          <>
            <div className="booking-divider" />
            <div className="booking-section booking-section--compact">
              {reservaOk  && <div className="booking-feedback booking-feedback--ok">✓ ¡Reservado con éxito!</div>}
              {reservaErr && <div className="booking-feedback booking-feedback--error">{reservaErr}</div>}
              {!reservaOk && !reservaErr && aviso && (
                <div className="booking-feedback booking-feedback--error" style={{ background: 'rgba(192,57,43,0.08)' }}>
                  {aviso}
                </div>
              )}
            </div>
          </>
        )}

        {/* Botones */}
        <div className="booking-botones booking-botones--compact">
          <button className="booking-btn-cancelar" onClick={onCancel}>Cancelar</button>
          <button
            className={[
              'booking-btn-confirmar',
              !puedeReservar && !reservaOk ? 'booking-btn-confirmar--ocupado' : '',
              reservaOk ? 'booking-btn-confirmar--ok' : '',
            ].join(' ')}
            onClick={() => puedeReservar && onConfirm(horarioSelObj)}
            disabled={reservando || !puedeReservar}
          >
            {reservaOk      ? '¡Listo!'        :
             reservando     ? 'Reservando…'     :
             !puedeReservar ? 'No disponible'   :
                              'Reservar'}
          </button>
        </div>

      </div>
    </div>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────
export default function Reservas() {
  const location = useLocation();
  const navigate = useNavigate();
  const usuario  = location.state?.datosEmpleado ?? null;
  const esAdmin  = usuario && ADMINS.includes(String(usuario.document_number));

  // Fechas hábiles (hoy + próximos 4 días hábiles)
  const FECHAS = React.useMemo(() => generarFechasHabiles(5), []);

  const [fechaIndex,    setFechaIndex]    = useState(0);
  const [horarios,      setHorarios]      = useState([]);
  const [reservas,      setReservas]      = useState([]);
  const [loadingR,      setLoadingR]      = useState(false);
  const [hoverId,       setHoverId]       = useState(null);
  const [selectedId,    setSelectedId]    = useState(null);
  const [reservando,    setReservando]    = useState(false);
  const [reservaOk,     setReservaOk]     = useState(false);
  const [reservaErr,    setReservaErr]    = useState(null);
  const [ultimaSync,    setUltimaSync]    = useState(null);
  const [mostrarMisRes, setMostrarMisRes] = useState(false);

  const fechaActual = FECHAS[fechaIndex];
  const fechaISO    = fechaActual.iso;
  const now = new Date();
  const hoyLocal = new Date(now);
  hoyLocal.setHours(0, 0, 0, 0);

  const fechaSeleccionada = new Date(fechaActual.date);
  fechaSeleccionada.setHours(0, 0, 0, 0);

  const dayMs = 24 * 60 * 60 * 1000;
  const diasDiferencia = Math.round((fechaSeleccionada.getTime() - hoyLocal.getTime()) / dayMs);
  const currentHour = now.getHours();
  const isEarlyMorning = currentHour < 5;
  const isPasadoMananaOMas = diasDiferencia >= 2;

  const canReserveNow = !(isEarlyMorning && isPasadoMananaOMas);

  const reserveWindowMessage = isEarlyMorning && isPasadoMananaOMas
    ? 'No puede reservar para pasado mañana (o fechas posteriores) entre 12:00 am y 5:00 am.'
    : '';

  useEffect(() => {
    fetch(API_HORARIOS)
      .then(r => r.json())
      .then(json => setHorarios((json.data ?? []).sort((a, b) => a.id - b.id)))
      .catch(() => setHorarios([]));
  }, []);

  const cargarReservas = useCallback(() => {
    setLoadingR(true);
    fetch(buildGetUrl(fechaISO))
      .then(r => r.json())
      .then(json => {
        const data = Array.isArray(json.data) ? json.data : [];
        console.group(`📦 [API] Reservas para ${fechaISO} — total: ${data.length}`);
        logEstructura(data);
        console.groupEnd();
        setReservas(data);
        setUltimaSync(new Date());
      })
      .catch(err => { console.error('[Reservas] error:', err); setReservas([]); })
      .finally(() => setLoadingR(false));
  }, [fechaISO]);

  useEffect(() => {
    cargarReservas();
    setSelectedId(null);
    setReservaErr(null);
    setReservaOk(false);
  }, [fechaISO]);

  useRealtimeSync(cargarReservas);

  // Si la silla seleccionada se ocupa: deseleccionar sin recargar página
  useEffect(() => {
    if (selectedId && calcEstado(reservas, selectedId) === 'ocupado') {
      setSelectedId(null);
      setReservaErr('Este escritorio acaba de ser reservado por otro usuario.');
    }
  }, [reservas, selectedId]);

  const yaReservoHoy = reservas.some(
    r => String(r.attributes?.documento ?? r.documento) === String(usuario?.document_number)
  );

  const handleReservar = async (horarioObj) => {
    if (!usuario || !selectedId || !horarioObj) return;
    if (!canReserveNow) { setReservaErr(reserveWindowMessage); return; }
    if (yaReservoHoy) { setReservaErr('Ya tienes una reserva para este día.'); return; }
    if (turnosBloqueados(reservas, selectedId).has(horarioObj.id)) {
      setReservaErr('Este turno ya no está disponible. Elige otro.');
      return;
    }
    setReservando(true);
    setReservaErr(null);
    try {
      const body = {
        data: {
          Nombre:           usuario.nombre      ?? '',
          foto:             usuario.foto        ?? '',
          documento:        String(usuario.document_number),
          area:             usuario.area_nombre ?? '',
          fecha_reserva:    fechaISO,
          estado:           null,
          working_puestos:  { id: selectedId },
          working_horarios: { id: horarioObj.id },
        },
      };
      const res = await fetch(API_RESERVAS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const resJson = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(resJson?.error?.message ?? `Error ${res.status}`);
      setReservaOk(true);
      window.dispatchEvent(new CustomEvent('working-reservas-updated'));
      cargarReservas();
      setTimeout(() => { setSelectedId(null); setReservaOk(false); }, 2500);
    } catch (err) {
      setReservaErr(err.message || 'Error al reservar. Intenta de nuevo.');
    } finally {
      setReservando(false);
    }
  };

  const getSilla    = (id) => {
    const e = calcEstado(reservas, id);
    if (e === 'ocupado')  return sillaOcu;
    if (e === 'limitado') return sillaLim;
    return sillaDis;
  };
  const getTooltip  = (id) => {
    const e = calcEstado(reservas, id);
    if (e === 'ocupado')  return 'Escritorio lleno — sin turnos disponibles';
    if (e === 'limitado') return 'Clic para ver turnos disponibles';
    return 'Clic para reservar';
  };

  return (
    <div className="reservas-wrapper">
      <div className="reservas-inner">

        {/* ── Header ── */}
        <header className="reservas-header">
          <div className="reservas-header-left">
            <div className="reservas-titulo">
              Crepe-Working <span className="text-accent">1</span>
            </div>
            {ultimaSync && (
              <div style={{ fontSize: '0.65rem', color: 'rgba(80,54,41,0.45)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <IconRefresh />
                Actualizado {ultimaSync.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>

          <div className="reservas-header-right" style={{ flexWrap: 'nowrap' }}>

            {/* Selector de fecha mejorado */}
            <DateSelector
              fechas={FECHAS}
              fechaIndex={fechaIndex}
              setFechaIndex={setFechaIndex}
            />

            <div style={{ width: 1, height: 26, background: 'rgba(80,54,41,0.15)', flexShrink: 0 }} />

            {/* Panel / Admin */}
            <button
              className="btn-outline"
              style={{ width: 34, height: 34, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '999px', flexShrink: 0 }}
              onClick={() => navigate('/panel', { state: { datosEmpleado: usuario } })}
              title={esAdmin ? 'Panel Admin' : 'Mis Reservas'}
            >
              {esAdmin ? <IconShield /> : <IconMonitorCard />}
            </button>

            {/* Cerrar sesión */}
            <button
              className="btn-outline"
              style={{
                width: 34, height: 34, padding: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '999px', flexShrink: 0,
                borderColor: 'rgba(192,57,43,0.35)',
                color: '#c0392b',
              }}
              onClick={() => navigate('/')}
              title="Cerrar sesión"
            >
              <IconLogout />
            </button>

            {/* Atrás */}
            <button
              className="btn-outline reservas-btn-atras"
              style={{ width: 34, height: 34, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '999px', flexShrink: 0 }}
              onClick={() => navigate(-1)}
              title="Volver"
            >
              <IconArrowLeft />
            </button>
          </div>
        </header>

        {/* ── Mapa ── */}
        <div className="reservas-mapa reservas-mapa--con-panel">
          <OcupantesPanel reservas={reservas} />

          {loadingR ? (
            <div className="reservas-loading">Cargando escritorios…</div>
          ) : (
            <div className="reservas-mesa-container">
              <img src={mesaImg} alt="Mesa" className="reservas-mesa-img" />
              {SILLAS.map(s => {
                const estado   = calcEstado(reservas, s.id);
                const isAvail  = estado !== 'ocupado';
                const isHover  = hoverId    === s.id;
                const isSelect = selectedId === s.id;
                return (
                  <img
                    key={s.id}
                    src={getSilla(s.id)}
                    alt={`Escritorio ${s.id}`}
                    onClick={() => {
                      if (!isAvail) return;
                      setSelectedId(isSelect ? null : s.id);
                      setReservaErr(null);
                      setReservaOk(false);
                    }}
                    onMouseEnter={() => setHoverId(s.id)}
                    onMouseLeave={() => setHoverId(null)}
                    title={getTooltip(s.id)}
                    style={{
                      position:   'absolute',
                      width:      isHover || isSelect ? '22%' : '18%',
                      top: s.top, left: s.left, right: s.right, bottom: s.bottom,
                      transform:  `rotate(${s.rotate})${isSelect ? ' scale(1.15)' : ''}`,
                      cursor:     isAvail ? 'pointer' : 'not-allowed',
                      transition: 'width 0.2s ease, filter 0.2s ease, transform 0.2s ease',
                      filter:     isSelect
                        ? 'drop-shadow(0 0 10px rgba(127,58,20,0.75)) brightness(1.1)'
                        : isHover && isAvail
                        ? 'brightness(1.15) drop-shadow(0 4px 10px rgba(0,0,0,0.2))'
                        : 'none',
                      zIndex: isHover || isSelect ? 10 : 1,
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* ── Leyenda ── */}
        <footer className="reservas-leyenda">
          <div className="reservas-leyenda-badge">
            <IconMonitorLeyenda />
            Con monitor: Esc. 1, 3 y 6
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {[
              { img: sillaDis, label: 'Disponible'             },
              { img: sillaLim, label: 'Disponibilidad limitada' },
              { img: sillaOcu, label: 'Ocupado'                 },
            ].map(({ img, label }) => (
              <div key={label} className="reservas-leyenda-item">
                <img src={img} alt={label} className="reservas-leyenda-img" />
                <span className="text-muted" style={{ fontSize: '0.77rem', fontWeight: 600 }}>{label}</span>
              </div>
            ))}
          </div>
        </footer>
      </div>

      {/* ── Booking card ── */}
      <BookingCard
        escritorioId={selectedId}
        usuario={usuario}
        reservas={reservas}
        horarios={horarios}
        onConfirm={handleReservar}
        onCancel={() => { setSelectedId(null); setReservaErr(null); setReservaOk(false); }}
        reservando={reservando}
        reservaOk={reservaOk}
        reservaErr={reservaErr}
        yaReservoHoy={yaReservoHoy}
        canReserveNow={canReserveNow}
        reserveWindowMessage={reserveWindowMessage}
      />
    </div>
  );
}