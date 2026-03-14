import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowLeft, Armchair, Calendar, Monitor, Ticket, User, LogOut } from 'lucide-react';
import sillaDis from '../../assets/sillaDis.png';
import sillaLim from '../../assets/sillaLim.png';
import sillaOcu from '../../assets/sillaOcu.png';
import mesaImg  from '../../assets/mesa.png';

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

const generarFechasHabiles = (n = 2) => {
  const fechas = [];
  const hoy    = new Date();
  hoy.setHours(0, 0, 0, 0);
  let cursor = new Date(hoy);
  while (fechas.length < n) {
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) {
      const dia          = DIAS_CORTO[dow];
      const dd           = cursor.getDate();
      const mm           = cursor.getMonth() + 1;
      const formatoFecha = `${dia}. ${dd}/${mm}`;
      fechas.push({
        date:       new Date(cursor),
        iso:        cursor.toISOString().split('T')[0],
        label:      formatoFecha,
        diaLabel:   dia,
        fechaLabel: `${dd}/${mm}`,
        chipLabel:  formatoFecha,
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return fechas;
};

const buildGetUrl = (fecha) =>
  `${API_RESERVAS}?filters[fecha_reserva][$eq]=${fecha}&populate=*`;

const buildUserHistoryUrl = (documento, fecha) => {
  const params = new URLSearchParams();
  params.set('filters[documento][$eq]', documento);
  params.set('filters[fecha_reserva][$lt]', fecha);
  params.set('sort[0]', 'fecha_reserva:desc');
  params.set('pagination[pageSize]', '50');
  params.set('populate', '*');
  return `${API_RESERVAS}?${params.toString()}`;
};

// ─── Diagnóstico ──────────────────────────────────────────────────────────────
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
const getNombre = (r) => {
  const attrs = r?.attributes ?? r ?? {};
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
const getPrimerNombre = (r) => getNombre(r).split(' ')[0];
const getFoto      = (r) => r.attributes?.foto ?? r.foto ?? null;

const getEstado = (r) => {
  const estadoRaw = r.attributes?.estado ?? r.estado;
  if (estadoRaw === true || estadoRaw === 'Confirmada' || estadoRaw === 'confirmada' || estadoRaw === 'Completada' || estadoRaw === 'completada') {
    return 'Confirmada';
  }
  if (estadoRaw === false || estadoRaw === 'Cancelada' || estadoRaw === 'cancelada') {
    return 'Cancelada';
  }
  return 'Pendiente';
};

const esReservaActiva = (r) => getEstado(r) !== 'Cancelada';

const getNombreCorto = (nombre = '') => {
  const partes = String(nombre).trim().split(/\s+/).filter(Boolean);

  if (partes.length >= 3) {
    return `${partes[0]} ${partes[partes.length - 2]}`;
  }

  if (partes.length === 2) {
    return `${partes[0]} ${partes[1]}`;
  }

  return partes[0] ?? '';
};

const formatFechaIso = (isoDate) => {
  if (!isoDate) return '';
  const [y, m, d] = String(isoDate).split('-').map(Number);
  if (!y || !m || !d) return String(isoDate);
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
};

// ─── Lógica de disponibilidad ─────────────────────────────────────────────────
const turnosBloqueados = (reservas, puestoId) => {
  const bloq = new Set();
  reservas
    .filter(r => getPuestoId(r) === puestoId && esReservaActiva(r))
    .forEach(r => {
      const hId = getHorarioId(r);
      if (hId === H_AM)            { bloq.add(H_AM);  bloq.add(H_COMPLETO); }
      else if (hId === H_PM)       { bloq.add(H_PM);  bloq.add(H_COMPLETO); }
      else if (hId === H_COMPLETO) { bloq.add(H_AM);  bloq.add(H_PM); bloq.add(H_COMPLETO); }
    });
  return bloq;
};

const calcEstado = (reservas, puestoId) => {
  const rp            = reservas.filter(r => getPuestoId(r) === puestoId && esReservaActiva(r));
  const tieneAM       = rp.some(r => getHorarioId(r) === H_AM);
  const tienePM       = rp.some(r => getHorarioId(r) === H_PM);
  const tieneCompleto = rp.some(r => getHorarioId(r) === H_COMPLETO);
  if (tieneCompleto || (tieneAM && tienePM)) return 'ocupado';
  if (tieneAM || tienePM)                    return 'limitado';
  return 'disponible';
};

// ─── Selector de fecha ────────────────────────────────────────────────────────
const DateSelector = ({ fechas, fechaIndex, setFechaIndex }) => (
  <div className="reservas-dia-nav">
    <button
      className="reservas-dia-btn"
      onClick={() => setFechaIndex(i => Math.max(0, i - 1))}
      disabled={fechaIndex === 0}
      style={{ opacity: fechaIndex === 0 ? 0.28 : 1 }}
    >
      <ChevronLeft size={16} />
    </button>

    <div className="reservas-dia-label" style={{ gap: 6 }}>
      <Calendar size={13} />
      <span style={{ fontSize: '0.7rem', color: 'rgba(80,54,41,0.55)', fontWeight: 600 }}>
        {fechas[fechaIndex].chipLabel}
      </span>
    </div>

    <button
      className="reservas-dia-btn"
      onClick={() => setFechaIndex(i => Math.min(fechas.length - 1, i + 1))}
      disabled={fechaIndex === fechas.length - 1}
      style={{ opacity: fechaIndex === fechas.length - 1 ? 0.28 : 1 }}
    >
      <ChevronRight size={16} />
    </button>
  </div>
);

// ─── TimeBadge ────────────────────────────────────────────────────────────────
const TimeBadge = ({ time }) => {
  if (time === 'am')   return <span className="op-fila__turno op-fila__turno--am">AM</span>;
  if (time === 'pm')   return <span className="op-fila__turno op-fila__turno--pm">PM</span>;
  return <span className="op-fila__turno op-fila__turno--full">Todo el día</span>;
};

// ─── OcupantesPanelContent ────────────────────────────────────────────────────
const OcupantesPanelContent = ({ reservas, asCard = false }) => {
  return (
    <div className={asCard ? 'op-tabla' : undefined}>
      {[1, 2, 3, 4, 5, 6].map(id => {
        const rp   = reservas.filter(r => getPuestoId(r) === id && esReservaActiva(r));
        const hasM = CON_MONITOR.includes(id);
        return (
          <div
            key={id}
            className="op-fila"
            style={{ gridTemplateColumns: '1fr' }}
          >
            <div className="op-fila__personas">
              {rp.length > 0 ? (
                <>
                  <div className="op-fila__persona-top">
                    <span className="op-fila__escritorio-label">Escritorio {id}</span>
                    {hasM && (
                      <div className="op-fila__monitor-inline" title="Con monitor de apoyo">
                        <Monitor size={12} strokeWidth={2} />
                      </div>
                    )}
                  </div>
                  {rp.map((r, i) => {
                    const hId    = getHorarioId(r);
                    const meta   = HORARIO_META[hId];
                    const foto   = getFoto(r);
                    const nombre = getPrimerNombre(r);
                    return (
                      <div key={i} className="op-fila__persona-card">
                        <div className="op-fila__persona">
                          {foto && foto !== 'null' ? (
                            <img
                              src={foto}
                              alt={nombre}
                              className="op-fila__foto"
                            />
                          ) : (
                            <div className="op-fila__avatar">
                              <User size={10} strokeWidth={2.5} />
                            </div>
                          )}
                          <div className="op-fila__persona-main">
                            <span className="op-fila__nombre">
                              {nombre}
                            </span>
                            {meta && <TimeBadge time={meta.badgeKey} />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              ) : (
                <div className="op-fila__persona-card">
                  <div className="op-fila__persona-top">
                    <span className="op-fila__escritorio-label">Escritorio {id}</span>
                    {hasM && (
                      <div className="op-fila__monitor-inline" title="Con monitor de apoyo">
                        <Monitor size={12} strokeWidth={2} />
                      </div>
                    )}
                  </div>
                  <div className="op-fila__persona">
                    <div className="op-fila__avatar op-fila__avatar--empty">
                      <User size={10} strokeWidth={2.5} />
                    </div>
                    <span className="text-muted" style={{ fontSize: '0.68rem', fontWeight: 600 }}>
                      Disponible
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── OcupantesPanel — wrapper desktop + drawer móvil ─────────────────────────
const OcupantesPanel = ({ reservas }) => {
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  return (
    <>
      {/* Desktop/tablet */}
      <div className="ocupantes-panel">
        <OcupantesPanelContent reservas={reservas} />
      </div>

      {/* FAB móvil */}
      <button
        className="ocupantes-fab"
        onClick={() => setDrawerOpen(true)}
        aria-label="Ver estado de escritorios"
      >
        <Monitor size={10} strokeWidth={2.5} />
        <span>Escritorios</span>
      </button>

      {/* Drawer móvil */}
      {drawerOpen && (
        <div className="ocupantes-drawer-backdrop" onClick={() => setDrawerOpen(false)}>
            <div className="ocupantes-drawer__body"><OcupantesPanelContent reservas={reservas} asCard />
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
  loadingRotacion,
  rotacionBloqueada,
  rotationMessage,
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

  const bloq          = turnosBloqueados(reservas, escritorioId);
  const todoBloqueado = bloq.size >= 3;
  const tieneMonitor  = CON_MONITOR.includes(escritorioId);
  const horarioSelObj = horarios.find(h => h.id === horarioSelId);
  const puedeReservar = canReserveNow && !loadingRotacion && !yaReservoHoy && !rotacionBloqueada && !todoBloqueado && !!horarioSelId && !reservaOk;

  const aviso = !canReserveNow
    ? reserveWindowMessage
    : loadingRotacion
    ? 'Validando regla de rotación...'
    : yaReservoHoy
    ? 'Ya tienes una reserva para este día'
    : rotacionBloqueada
    ? rotationMessage
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
                  <User size={24} strokeWidth={2} color="#92614F" />
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
            <Ticket size={16} strokeWidth={2.5} color="#503629" />
            <span className="booking-escritorio-nombre">Escritorio {escritorioId}</span>
            {tieneMonitor && <span className="booking-badge-monitor">Con monitor</span>}
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
              const deshabilitado = esBloq;
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
              {reservaOk  && <div className="booking-feedback booking-feedback--ok">Reservado!</div>}
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
            {reservaOk      ? 'Reservar'       :
             reservando     ? 'Reservar'    :
             !puedeReservar ? 'Reservar'  :
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

  const FECHAS = React.useMemo(() => generarFechasHabiles(2), []);

  const [fechaIndex,  setFechaIndex]  = useState(0);
  const [horarios,    setHorarios]    = useState([]);
  const [reservas,    setReservas]    = useState([]);
  const [loadingR,    setLoadingR]    = useState(false);
  const [hoverId,     setHoverId]     = useState(null);
  const [selectedId,  setSelectedId]  = useState(null);
  const [reservando,  setReservando]  = useState(false);
  const [reservaOk,   setReservaOk]   = useState(false);
  const [reservaErr,  setReservaErr]  = useState(null);
  const [loadingRotacion, setLoadingRotacion] = useState(false);
  const [ultimaReservaPrevia, setUltimaReservaPrevia] = useState(null);

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

  const ultimoPuestoReservado = ultimaReservaPrevia?.puestoId ?? null;

  const getRotationMessage = useCallback(
    (puestoId = ultimoPuestoReservado) => {
      if (!puestoId) return 'Debes elegir un escritorio distinto al de tu última reserva.';
      const fechaUltima = formatFechaIso(ultimaReservaPrevia?.fecha);
      return fechaUltima
        ? `Tu última reserva fue el ${fechaUltima} en el escritorio ${puestoId}. Debes hacer rotación y elegir otro escritorio.`
        : 'Debes elegir un escritorio distinto al de tu última reserva.';
    },
    [ultimoPuestoReservado, ultimaReservaPrevia?.fecha]
  );

  useEffect(() => {
    fetch(API_HORARIOS)
      .then(r => r.json())
      .then(json => setHorarios((json.data ?? []).sort((a, b) => a.id - b.id)))
      .catch(() => setHorarios([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const documento = String(usuario?.document_number ?? '').trim();

    if (!documento) {
      setUltimaReservaPrevia(null);
      setLoadingRotacion(false);
      return;
    }

    setLoadingRotacion(true);
    fetch(buildUserHistoryUrl(documento, fechaISO))
      .then(r => r.json())
      .then(json => {
        if (cancelled) return;
        const data = Array.isArray(json.data) ? json.data : [];
        const ultimaActiva = data.find(esReservaActiva);
        const puestoId = getPuestoId(ultimaActiva);
        const fecha = ultimaActiva?.attributes?.fecha_reserva ?? ultimaActiva?.fecha_reserva ?? null;
        setUltimaReservaPrevia(puestoId ? { puestoId, fecha } : null);
      })
      .catch(() => {
        if (!cancelled) setUltimaReservaPrevia(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingRotacion(false);
      });

    return () => {
      cancelled = true;
    };
  }, [usuario?.document_number, fechaISO]);

  const cargarReservas = useCallback(() => {
    setLoadingR(true);
    fetch(buildGetUrl(fechaISO))
      .then(r => r.json())
      .then(json => {
        const data = Array.isArray(json.data) ? json.data : [];
        setReservas(data);
      })
      .catch(err => { console.error('[Reservas] error:', err); setReservas([]); })
      .finally(() => setLoadingR(false));
  }, [fechaISO]);

  useEffect(() => {
    cargarReservas();
    setSelectedId(null);
    setReservaErr(null);
    setReservaOk(false);
  }, [fechaISO, cargarReservas]);

  useEffect(() => {
    if (selectedId && calcEstado(reservas, selectedId) === 'ocupado') {
      setSelectedId(null);
      setReservaErr('Este escritorio acaba de ser reservado por otro usuario.');
    }
  }, [reservas, selectedId]);

  useEffect(() => {
    if (!selectedId || loadingRotacion) return;
    if (ultimoPuestoReservado && selectedId === ultimoPuestoReservado) {
      setSelectedId(null);
      setReservaErr(getRotationMessage(selectedId));
    }
  }, [selectedId, ultimoPuestoReservado, loadingRotacion, getRotationMessage]);

  const yaReservoHoy = reservas.some(
    r => String(r.attributes?.documento ?? r.documento) === String(usuario?.document_number) && esReservaActiva(r)
  );

  const handleReservar = async (horarioObj) => {
    if (!usuario || !selectedId || !horarioObj) return;
    if (!canReserveNow) { setReservaErr(reserveWindowMessage); return; }
    if (loadingRotacion) { setReservaErr('Aún estamos validando la rotación de puestos. Intenta de nuevo en unos segundos.'); return; }
    if (yaReservoHoy) { setReservaErr('Ya tienes una reserva para este día.'); return; }
    if (ultimoPuestoReservado && selectedId === ultimoPuestoReservado) {
      setReservaErr(getRotationMessage(selectedId));
      return;
    }
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

  const getSilla   = (id) => {
    const e = calcEstado(reservas, id);
    if (e === 'ocupado')  return sillaOcu;
    if (e === 'limitado') return sillaLim;
    return sillaDis;
  };
  const getTooltip = (id) => {
    if (!loadingRotacion && ultimoPuestoReservado && id === ultimoPuestoReservado) {
      return `Rotación activa: elige un escritorio distinto al ${id}`;
    }
    const e = calcEstado(reservas, id);
    if (e === 'ocupado')  return 'Escritorio lleno — sin turnos disponibles';
    if (e === 'limitado') return 'Clic para ver turnos disponibles';
    return 'Clic para reservar';
  };

  return (
    <div className="reservas-wrapper">
      <div className="reservas-inner">
        <div className="top-right-nav-actions reservas-top-right-nav-actions">
          <DateSelector
            fechas={FECHAS}
            fechaIndex={fechaIndex}
            setFechaIndex={setFechaIndex}
          />

          <div className="top-nav-btn-group">
          <button
            className="btn-outline top-nav-icon-btn"
            onClick={() => navigate('/panel', { state: { datosEmpleado: usuario } })}
            title={esAdmin ? 'Panel Admin' : 'Mis Reservas'}
          >
            <Armchair size={14} strokeWidth={2.5} />
          </button>

          <button
            className="btn-outline top-nav-icon-btn"
            style={{
              borderColor: 'rgba(192,57,43,0.35)',
              color: '#c0392b',
            }}
            onClick={() => navigate('/')}
            title="Cerrar sesión"
          >
            <LogOut size={14} strokeWidth={2} />
          </button>

          <button
            className="btn-outline reservas-btn-atras top-nav-icon-btn"
            onClick={() => navigate(-1)}
            title="Volver"
          >
            <ArrowLeft size={14} strokeWidth={2.5} />
          </button>
          </div>
        </div>

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
                const bloqueadoPorRotacion = !loadingRotacion && ultimoPuestoReservado === s.id;
                const isAvail  = estado !== 'ocupado' && !bloqueadoPorRotacion;
                const isHover  = hoverId    === s.id;
                const isSelect = selectedId === s.id;
                return (
                  <img
                    key={s.id}
                    src={getSilla(s.id)}
                    alt={`Escritorio ${s.id}`}
                    onClick={() => {
                      if (bloqueadoPorRotacion) {
                        setReservaErr(getRotationMessage(s.id));
                        return;
                      }
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
                        : bloqueadoPorRotacion
                        ? 'grayscale(0.55) brightness(0.9)'
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
            <Monitor size={13} strokeWidth={2.5} />
            Con monitor: Esc. 1, 3 y 6
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {[
              { img: sillaDis, label: 'Disponible'              },
              { img: sillaLim, label: 'Limitado'  },
              { img: sillaOcu, label: 'Ocupado'                  },
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
        loadingRotacion={loadingRotacion}
        rotacionBloqueada={!loadingRotacion && !!selectedId && selectedId === ultimoPuestoReservado}
        rotationMessage={getRotationMessage(selectedId)}
        reserveWindowMessage={reserveWindowMessage}
      />
    </div>
  );
}