import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import sillaDis from '../../assets/sillaDis.png';
import sillaLim from '../../assets/sillaLim.png';
import sillaOcu from '../../assets/sillaOcu.png';
import mesaImg  from '../../assets/mesa.png';

// ─── Constantes ────────────────────────────────────────────────────────────────
const API_HORARIOS  = 'https://macfer.crepesywaffles.com/api/working-horarios';
const API_PUESTOS   = 'https://macfer.crepesywaffles.com/api/working-puestos';
const API_RESERVAS  = 'https://macfer.crepesywaffles.com/api/working-reservas';
const SALA_ID       = 1; // Crepe_working1
const CON_MONITOR   = [1, 3, 6];
const ADMINS        = ['1028783377'];

// IDs de horario que vienen de la API (working-horarios)
// turno 1 = AM (id:1), turno 2 = PM (id:2), turno 3 = día completo (id:3)
const HORARIO_AM       = 1;
const HORARIO_PM       = 2;
const HORARIO_COMPLETO = 3;

// Posiciones de las sillas en el mapa
const SILLAS = [
  { id: 1, top: '-5%',  left: '0%',   rotate: '-15deg' },
  { id: 2, top: '-25%', left: '45%',  rotate: '25deg'  },
  { id: 3, top: '-25%', left: '70%',  rotate: '-20deg' },
  { id: 4, top: '95%',  left: '0%',   rotate: '210deg' },
  { id: 5, top: '75%',  left: '40%',  rotate: '180deg' },
  { id: 6, top: '75%',  right: '15%', rotate: '210deg' },
];

// Etiquetas visuales de los horarios (se mapean desde la API)
const HORARIO_META = {
  [HORARIO_AM]:       { label: 'Mañana',      hora: '8:00 am – 12:00 m' },
  [HORARIO_PM]:       { label: 'Tarde',        hora: '1:00 pm – 5:00 pm' },
  [HORARIO_COMPLETO]: { label: 'Día completo', hora: '8:00 am – 5:00 pm' },
};

// ─── Utilidades de fecha ────────────────────────────────────────────────────────
const toISO = (date) => date.toISOString().split('T')[0];
const toLabel = (date) => {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}`;
};
const DIAS_NOMBRE = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];

// ─── Lógica de disponibilidad ───────────────────────────────────────────────────
/**
 * Dado el array de reservas del día y el id del puesto,
 * devuelve un Set con los IDs de horario que NO se pueden reservar.
 */
const turnosBloqueados = (reservas, puestoId) => {
  const bloqueados = new Set();
  const delPuesto = reservas.filter(
    r => r.attributes?.puesto?.data?.id === puestoId
  );
  delPuesto.forEach(r => {
    const hId = r.attributes?.horario?.data?.id;
    if (hId === HORARIO_AM) {
      bloqueados.add(HORARIO_AM);
      bloqueados.add(HORARIO_COMPLETO);
    } else if (hId === HORARIO_PM) {
      bloqueados.add(HORARIO_PM);
      bloqueados.add(HORARIO_COMPLETO);
    } else if (hId === HORARIO_COMPLETO) {
      bloqueados.add(HORARIO_AM);
      bloqueados.add(HORARIO_PM);
      bloqueados.add(HORARIO_COMPLETO);
    }
  });
  return bloqueados;
};

/**
 * Estado visual de la silla según cuántos turnos están bloqueados.
 * 0 bloqueados → disponible | 1-2 → limitado | 3 → ocupado
 */
const calcEstado = (reservas, puestoId) => {
  const b = turnosBloqueados(reservas, puestoId).size;
  if (b === 0) return 'disponible';
  if (b >= 3)  return 'ocupado';
  return 'limitado';
};

// ─── Iconos SVG ────────────────────────────────────────────────────────────────
const IconChevronLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
);
const IconChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
);
const IconArrowLeft = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
);
const IconShield = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
);
const IconCalendar = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const IconMonitorLeyenda = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
  </svg>
);
const IconMonitorCard = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#503629" strokeWidth="2.5" strokeLinecap="round">
    <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
  </svg>
);
const IconUserCardLarge = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#92614F" strokeWidth="2" strokeLinecap="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);

// ─── BookingCard ────────────────────────────────────────────────────────────────
const BookingCard = ({
  escritorioId, usuario, reservas, horarios,
  onConfirm, onCancel,
  reservando, reservaOk, reservaErr,
  yaReservoHoy,
}) => {
  const [horarioSelId, setHorarioSelId] = React.useState(null);

  // Cuando cambia el escritorio, selecciona el primer turno disponible
  React.useEffect(() => {
    if (!escritorioId || !horarios.length) return;
    const bloqueados = turnosBloqueados(reservas, escritorioId);
    const primero = horarios.find(h => !bloqueados.has(h.id));
    setHorarioSelId(primero ? primero.id : null);
  }, [escritorioId, reservas, horarios]);

  if (!escritorioId) return null;

  const bloqueados   = turnosBloqueados(reservas, escritorioId);
  const tieneMonitor = CON_MONITOR.includes(escritorioId);
  const todoBloqueado = bloqueados.size >= 3;

  // Ocupantes ya reservados en este puesto
  const reservasDesk = reservas.filter(
    r => r.attributes?.puesto?.data?.id === escritorioId
  );

  const horarioSelObj = horarios.find(h => h.id === horarioSelId);
  const meta = horarioSelId ? HORARIO_META[horarioSelId] : null;

  // Razón por la que no se puede reservar
  const motivoBloqueo = yaReservoHoy
    ? 'Ya tienes una reserva para este día'
    : todoBloqueado
    ? 'Este escritorio no tiene turnos disponibles'
    : !horarioSelId
    ? 'Selecciona un turno'
    : null;

  const puedeReservar = !yaReservoHoy && !todoBloqueado && !!horarioSelId && !reservaOk;

  return (
    <div className="booking-card-wrapper">
      <div className="booking-card">

        {/* Usuario */}
        <div className="booking-section">
          <div className="booking-section-label">Reserva para</div>
          {usuario && (
            <div className="booking-user">
              {usuario.foto && usuario.foto !== 'null' ? (
                <img src={usuario.foto} alt={usuario.nombre} className="booking-user-foto" />
              ) : (
                <div className="booking-user-placeholder"><IconUserCardLarge /></div>
              )}
              <div className="booking-user-info">
                <div className="booking-user-nombre">{usuario.nombre}</div>
                <div className="booking-user-cargo">{usuario.cargo}</div>
                <div className="booking-user-area">{usuario.area_nombre}</div>
              </div>
            </div>
          )}
        </div>
        <div className="booking-divider" />

        {/* Escritorio */}
        <div className="booking-section">
          <div className="booking-section-label">Ubicación</div>
          <div className="booking-ubicacion-row">
            <IconMonitorCard />
            <span className="booking-escritorio-nombre">Escritorio {escritorioId}</span>
            {tieneMonitor && <span className="booking-badge-monitor">Con monitor</span>}
          </div>
          {/* Ocupantes actuales */}
          {reservasDesk.length > 0 && (
            <div className="booking-ocupantes">
              {reservasDesk.map((r, i) => {
                const hId   = r.attributes?.horario?.data?.id;
                const hMeta = hId ? HORARIO_META[hId] : null;
                const nombre = r.attributes?.usuario ?? '—';
                return (
                  <div key={i} className="booking-ocupante-item">
                    <span>🖱️</span>
                    <span className="booking-ocupante-nombre">{nombre}</span>
                    {hMeta && (
                      <span className="booking-ocupante-hora">· {hMeta.label}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="booking-divider" />

        {/* Selector de horario */}
        <div className="booking-section">
          <div className="booking-section-label">Horario</div>
          <div className="booking-horarios">
            {horarios.map(h => {
              const esBloqueado = bloqueados.has(h.id);
              const esSel = horarioSelId === h.id;
              const m = HORARIO_META[h.id];
              return (
                <button
                  key={h.id}
                  onClick={() => !esBloqueado && setHorarioSelId(h.id)}
                  disabled={esBloqueado || yaReservoHoy}
                  className={`booking-horario-btn${esSel ? ' booking-horario-btn--selected' : ''}${esBloqueado ? ' booking-horario-btn--bloqueado' : ''}`}
                  style={{ opacity: esBloqueado ? 0.4 : 1, cursor: esBloqueado ? 'not-allowed' : 'pointer' }}
                >
                  <span className="booking-horario-label">{m?.label ?? h.attributes?.nombre}</span>
                  <span className="booking-horario-hora">{m?.hora ?? `${h.attributes?.inicio?.slice(0,5)} – ${h.attributes?.fin?.slice(0,5)}`}</span>
                  {esBloqueado && <span style={{ fontSize: '0.65rem', color: '#c0392b', marginTop: 2 }}>No disponible</span>}
                </button>
              );
            })}
          </div>
        </div>
        <div className="booking-divider" />

        {/* Feedback */}
        {(reservaErr || reservaOk || motivoBloqueo) && (
          <div className="booking-section">
            {reservaErr    && <div className="booking-feedback booking-feedback--error">{reservaErr}</div>}
            {reservaOk     && <div className="booking-feedback booking-feedback--ok">✓ ¡Reservado con éxito!</div>}
            {!reservaErr && !reservaOk && motivoBloqueo && (
              <div className="booking-feedback booking-feedback--error" style={{ background: 'rgba(192,57,43,0.08)' }}>
                {motivoBloqueo}
              </div>
            )}
          </div>
        )}

        {/* Botones */}
        <div className="booking-botones">
          <button className="booking-btn-cancelar" onClick={onCancel}>Cancelar</button>
          <button
            className={`booking-btn-confirmar${!puedeReservar && !reservaOk ? ' booking-btn-confirmar--ocupado' : ''}${reservaOk ? ' booking-btn-confirmar--ok' : ''}`}
            onClick={() => puedeReservar && onConfirm(horarioSelObj)}
            disabled={reservando || !puedeReservar}
          >
            {reservaOk   ? '¡Listo!'      :
             reservando  ? 'Reservando…'  :
             !puedeReservar ? 'No disponible' :
             'Reservar'}
          </button>
        </div>

      </div>
    </div>
  );
};

// ─── Componente principal ───────────────────────────────────────────────────────
export default function Reservas() {
  const location = useLocation();
  const navigate = useNavigate();
  const usuario  = location.state?.datosEmpleado || null;
  const esAdmin  = usuario && ADMINS.includes(String(usuario.document_number));

  // ── Fechas disponibles: solo hoy y mañana ──
  const hoy     = new Date();
  const manana  = new Date(Date.now() + 86_400_000);
  const FECHAS  = [
    { date: hoy,    label: 'Hoy',    diaLabel: DIAS_NOMBRE[hoy.getDay()],   fechaLabel: toLabel(hoy) },
    { date: manana, label: 'Mañana', diaLabel: DIAS_NOMBRE[manana.getDay()], fechaLabel: toLabel(manana) },
  ];

  const [fechaIndex, setFechaIndex] = useState(0);
  const fechaActual = FECHAS[fechaIndex];
  const fechaISO    = toISO(fechaActual.date);

  // ── Estado ──
  const [horarios,   setHorarios]   = useState([]);   // de /api/working-horarios
  const [reservas,   setReservas]   = useState([]);   // de /api/working-reservas?fecha=...
  const [loadingR,   setLoadingR]   = useState(false);
  const [hoverId,    setHoverId]    = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [reservando, setReservando] = useState(false);
  const [reservaOk,  setReservaOk]  = useState(false);
  const [reservaErr, setReservaErr] = useState(null);

  // ── Carga de horarios (solo una vez al montar) ──
  useEffect(() => {
    fetch(API_HORARIOS)
      .then(r => r.json())
      .then(json => setHorarios(json.data ?? []))
      .catch(() => setHorarios([]));
  }, []);

  // ── Carga de reservas del día seleccionado ──
  const cargarReservas = () => {
    setLoadingR(true);
    // populate=* para que Strapi incluya puesto y horario relacionados
    fetch(`${API_RESERVAS}?filters[fecha][$eq]=${fechaISO}&populate=*`)
      .then(r => r.json())
      .then(json => setReservas(Array.isArray(json.data) ? json.data : []))
      .catch(() => setReservas([]))
      .finally(() => setLoadingR(false));
  };

  useEffect(() => {
    cargarReservas();
    setSelectedId(null); // limpia selección al cambiar fecha
    setReservaErr(null);
  }, [fechaISO]);

  // ── ¿El usuario ya reservó hoy? ──
  const yaReservoHoy = reservas.some(
    r => String(r.attributes?.usuario) === String(usuario?.document_number)
  );

  // ── POST de reserva ──
  const handleReservar = async (horarioObj) => {
    if (!usuario || !selectedId || !horarioObj) return;

    // Doble validación antes de enviar
    if (yaReservoHoy) {
      setReservaErr('Ya tienes una reserva para este día.');
      return;
    }
    const bloq = turnosBloqueados(reservas, selectedId);
    if (bloq.has(horarioObj.id)) {
      setReservaErr('Este turno ya no está disponible.');
      return;
    }

    setReservando(true);
    setReservaErr(null);
    try {
      // Strapi espera el body en { data: { ... } }
      // Las relaciones se pasan como { id: X }
      await fetch(API_RESERVAS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {
            fecha:   fechaISO,
            usuario: String(usuario.document_number),
            puesto:  { id: selectedId },
            horario: { id: horarioObj.id },
            sala:    { id: SALA_ID },
          },
        }),
      }).then(async res => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error?.message || 'Error al reservar.');
        }
        return res.json();
      });

      setReservaOk(true);
      cargarReservas();
      setTimeout(() => { setSelectedId(null); setReservaOk(false); }, 2500);
    } catch (err) {
      setReservaErr(err.message || 'Error al reservar.');
    } finally {
      setReservando(false);
    }
  };

  // ── Imagen de silla según estado ──
  const getSilla = (id) => {
    const estado = calcEstado(reservas, id);
    if (estado === 'ocupado')  return sillaOcu;
    if (estado === 'limitado') return sillaLim;
    return sillaDis;
  };

  // ── Render ──
  return (
    <div className="reservas-wrapper">
      <div className="reservas-inner">

        <header className="reservas-header">
          <div className="reservas-header-left">
            <div className="reservas-titulo">
              Crepe-Working <span className="text-accent">1</span>
            </div>
          </div>

          <div className="reservas-header-right" style={{ flexWrap: 'nowrap' }}>

            {/* Selector de fecha: solo Hoy / Mañana */}
            <div className="reservas-dia-nav">
              <button
                className="reservas-dia-btn"
                onClick={() => setFechaIndex(i => Math.max(0, i - 1))}
                disabled={fechaIndex === 0}
                style={{ opacity: fechaIndex === 0 ? 0.3 : 1 }}
              >
                <IconChevronLeft />
              </button>
              <div className="reservas-dia-label">
                <IconCalendar />
                <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                  {fechaActual.label}
                </span>
                <span style={{ opacity: 0.55, fontSize: '0.75rem', fontWeight: 500 }}>
                  {fechaActual.diaLabel} {fechaActual.fechaLabel}
                </span>
              </div>
              <button
                className="reservas-dia-btn"
                onClick={() => setFechaIndex(i => Math.min(FECHAS.length - 1, i + 1))}
                disabled={fechaIndex === FECHAS.length - 1}
                style={{ opacity: fechaIndex === FECHAS.length - 1 ? 0.3 : 1 }}
              >
                <IconChevronRight />
              </button>
            </div>

            <div style={{ width: 1, height: 26, background: 'rgba(80,54,41,0.15)', flexShrink: 0 }} />

            {esAdmin && (
              <button
                className="btn-continuar"
                style={{ width: 34, height: 34, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '999px', flexShrink: 0 }}
                onClick={() => navigate('/panel', { state: { datosEmpleado: usuario } })}
              >
                <IconShield />
              </button>
            )}

            <button
              className="btn-outline reservas-btn-atras"
              style={{ width: 34, height: 34, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '999px', flexShrink: 0 }}
              onClick={() => navigate(-1)}
            >
              <IconArrowLeft />
            </button>
          </div>
        </header>

        {/* Mapa de escritorios */}
        <div className="reservas-mapa" style={{ padding: '0 16px' }}>
          {loadingR ? (
            <div className="reservas-loading">Cargando escritorios…</div>
          ) : (
            <div className="reservas-mesa-container" style={{ width: 'clamp(420px, 74vh, 840px)' }}>
              <img src={mesaImg} alt="Mesa" className="reservas-mesa-img" />
              {SILLAS.map(s => {
                const estado   = calcEstado(reservas, s.id);
                const isAvail  = estado !== 'ocupado';
                const isHover  = hoverId === s.id;
                const isSelect = selectedId === s.id;
                return (
                  <img
                    key={s.id}
                    src={getSilla(s.id)}
                    alt={`Silla ${s.id}`}
                    onClick={() => {
                      if (!isAvail) return;
                      setSelectedId(isSelect ? null : s.id);
                      setReservaErr(null);
                      setReservaOk(false);
                    }}
                    onMouseEnter={() => setHoverId(s.id)}
                    onMouseLeave={() => setHoverId(null)}
                    title={isAvail ? 'Clic para seleccionar' : 'No disponible'}
                    style={{
                      position: 'absolute',
                      width: isHover || isSelect ? '22%' : '18%',
                      top: s.top, left: s.left, right: s.right, bottom: s.bottom,
                      transform: `rotate(${s.rotate})${isSelect ? ' scale(1.15)' : ''}`,
                      cursor: isAvail ? 'pointer' : 'not-allowed',
                      transition: 'width 0.2s ease, filter 0.2s ease, transform 0.2s ease',
                      filter: isSelect
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
      />
    </div>
  );
}