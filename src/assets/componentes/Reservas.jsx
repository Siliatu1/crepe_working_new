import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import sillaDis from '../../assets/sillaDis.png';
import sillaLim from '../../assets/sillaLim.png';
import sillaOcu from '../../assets/sillaOcu.png';
import mesaImg  from '../../assets/mesa.png';

// ─── URLs ────────────────────────────────────────────────────────────────────
const BASE         = 'https://macfer.crepesywaffles.com';
const API_HORARIOS = `${BASE}/api/working-horarios`;
const API_RESERVAS = `${BASE}/api/working-reservas`;

// ─── Constantes ──────────────────────────────────────────────────────────────
const CON_MONITOR = [1, 3, 6];
const ADMINS      = ['1028783377'];
const H_AM        = 1;   // turno 1 = Mañana
const H_PM        = 2;   // turno 2 = Tarde
const H_COMPLETO  = 3;   // turno 3 = Día completo

const HORARIO_META = {
  [H_AM]:       { label: 'Mañana',      hora: '8:00 am – 12:00 m' },
  [H_PM]:       { label: 'Tarde',        hora: '1:00 pm – 5:00 pm' },
  [H_COMPLETO]: { label: 'Día completo', hora: '8:00 am – 5:00 pm' },
};

const SILLAS = [
  { id: 1, top: '-5%',  left: '0%',   rotate: '-15deg' },
  { id: 2, top: '-25%', left: '45%',  rotate: '25deg'  },
  { id: 3, top: '-25%', left: '70%',  rotate: '-20deg' },
  { id: 4, top: '95%',  left: '0%',   rotate: '210deg' },
  { id: 5, top: '75%',  left: '40%',  rotate: '180deg' },
  { id: 6, top: '75%',  right: '15%', rotate: '210deg' },
];

const DIAS = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];

// ─── Utilidades ──────────────────────────────────────────────────────────────
const toISO   = d => d.toISOString().split('T')[0];
const toLabel = d =>
  `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;

/**
 * Construye la URL de GET con populate explícito.
 * Strapi v4 requiere nombrar cada relación para que los datos se incluyan.
 * populate=* a veces no funciona si los permisos de las relaciones
 * no están habilitados en Settings → Roles → Public.
 */
const buildGetUrl = (fecha) =>
  `${API_RESERVAS}` +
  `?filters[fecha_reserva][$eq]=${fecha}` +
  `&populate[working_puestos][fields][0]=id` +   // solo necesitamos el id del puesto
  `&populate[working_horarios][fields][0]=id`;    // solo necesitamos el id del horario

// ─── Lógica de disponibilidad ─────────────────────────────────────────────────
/**
 * Extrae el id del puesto de una reserva.
 * Strapi puede devolver la relación de dos formas:
 *   A) { data: { id: X } }         ← con populate
 *   B) { id: X }                   ← si Strapi lo serializa directo
 * Esta función maneja ambos casos.
 */
const getPuestoId = (r) => {
  const rel = r.attributes?.working_puestos;
  if (!rel) return null;
  if (rel.data) return rel.data.id;   // forma A
  if (rel.id)   return rel.id;        // forma B
  return null;
};

const getHorarioId = (r) => {
  const rel = r.attributes?.working_horarios;
  if (!rel) return null;
  if (rel.data) return rel.data.id;
  if (rel.id)   return rel.id;
  return null;
};

const turnosBloqueados = (reservas, puestoId) => {
  const bloq = new Set();
  reservas
    .filter(r => getPuestoId(r) === puestoId)
    .forEach(r => {
      const hId = getHorarioId(r);
      if (hId === H_AM)       { bloq.add(H_AM);      bloq.add(H_COMPLETO); }
      else if (hId === H_PM)  { bloq.add(H_PM);      bloq.add(H_COMPLETO); }
      else if (hId === H_COMPLETO) { bloq.add(H_AM); bloq.add(H_PM); bloq.add(H_COMPLETO); }
    });
  return bloq;
};

const calcEstado = (reservas, puestoId) => {
  const n = turnosBloqueados(reservas, puestoId).size;
  if (n === 0) return 'disponible';
  if (n >= 3)  return 'ocupado';
  return 'limitado';
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

// ─── BookingCard ──────────────────────────────────────────────────────────────
const BookingCard = ({
  escritorioId, usuario, reservas, horarios,
  onConfirm, onCancel,
  reservando, reservaOk, reservaErr,
  yaReservoHoy,
}) => {
  const [horarioSelId, setHorarioSelId] = React.useState(null);

  React.useEffect(() => {
    if (!escritorioId || !horarios.length) return;
    const bloq     = turnosBloqueados(reservas, escritorioId);
    const primero  = horarios.find(h => !bloq.has(h.id));
    setHorarioSelId(primero?.id ?? null);
  }, [escritorioId, reservas, horarios]);

  if (!escritorioId) return null;

  const bloq          = turnosBloqueados(reservas, escritorioId);
  const todoBloqueado = bloq.size >= 3;
  const tieneMonitor  = CON_MONITOR.includes(escritorioId);
  const horarioSelObj = horarios.find(h => h.id === horarioSelId);
  const puedeReservar = !yaReservoHoy && !todoBloqueado && !!horarioSelId && !reservaOk;

  const reservasDelPuesto = reservas.filter(r => getPuestoId(r) === escritorioId);

  const aviso = yaReservoHoy
    ? '⚠ Ya tienes una reserva para este día'
    : todoBloqueado
    ? 'Este escritorio no tiene turnos disponibles'
    : null;

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
          {reservasDelPuesto.length > 0 && (
            <div className="booking-ocupantes">
              {reservasDelPuesto.map((r, i) => {
                const hId   = getHorarioId(r);
                const hMeta = HORARIO_META[hId];
                return (
                  <div key={i} className="booking-ocupante-item">
                    <span>🖱️</span>
                    <span className="booking-ocupante-nombre">
                      {r.attributes?.Nombre ?? r.attributes?.documento ?? '—'}
                    </span>
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

        {/* Horarios */}
        <div className="booking-section">
          <div className="booking-section-label">Horario</div>
          <div className="booking-horarios">
            {horarios.map(h => {
              const esBloq = bloq.has(h.id);
              const esSel  = horarioSelId === h.id;
              const meta   = HORARIO_META[h.id];
              return (
                <button
                  key={h.id}
                  onClick={() => !esBloq && !yaReservoHoy && setHorarioSelId(h.id)}
                  disabled={esBloq || yaReservoHoy}
                  className={[
                    'booking-horario-btn',
                    esSel  ? 'booking-horario-btn--selected'  : '',
                    esBloq ? 'booking-horario-btn--bloqueado' : '',
                  ].join(' ')}
                  style={{
                    opacity: esBloq || yaReservoHoy ? 0.38 : 1,
                    cursor:  esBloq || yaReservoHoy ? 'not-allowed' : 'pointer',
                  }}
                >
                  <span className="booking-horario-label">{meta?.label}</span>
                  <span className="booking-horario-hora">{meta?.hora}</span>
                  {esBloq && (
                    <span style={{ fontSize: '0.63rem', color: '#c0392b', marginTop: 2 }}>
                      No disponible
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        <div className="booking-divider" />

        {/* Feedback */}
        {(aviso || reservaErr || reservaOk) && (
          <div className="booking-section">
            {reservaOk  && <div className="booking-feedback booking-feedback--ok">✓ ¡Reservado con éxito!</div>}
            {reservaErr && <div className="booking-feedback booking-feedback--error">{reservaErr}</div>}
            {!reservaOk && !reservaErr && aviso && (
              <div className="booking-feedback booking-feedback--error"
                style={{ background: 'rgba(192,57,43,0.08)' }}>
                {aviso}
              </div>
            )}
          </div>
        )}

        {/* Botones */}
        <div className="booking-botones">
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
            {reservaOk      ? '¡Listo!'         :
             reservando     ? 'Reservando…'      :
             !puedeReservar ? 'No disponible'    :
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

  const hoy    = new Date();
  const manana = new Date(Date.now() + 86_400_000);
  const FECHAS = [
    { date: hoy,    label: 'Hoy',    diaLabel: DIAS[hoy.getDay()],    fechaLabel: toLabel(hoy)    },
    { date: manana, label: 'Mañana', diaLabel: DIAS[manana.getDay()], fechaLabel: toLabel(manana) },
  ];

  const [fechaIndex, setFechaIndex] = useState(0);
  const fechaActual = FECHAS[fechaIndex];
  const fechaISO    = toISO(fechaActual.date);

  const [horarios,   setHorarios]   = useState([]);
  const [reservas,   setReservas]   = useState([]);
  const [loadingR,   setLoadingR]   = useState(false);
  const [hoverId,    setHoverId]    = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [reservando, setReservando] = useState(false);
  const [reservaOk,  setReservaOk]  = useState(false);
  const [reservaErr, setReservaErr] = useState(null);

  // Carga horarios una sola vez
  useEffect(() => {
    fetch(API_HORARIOS)
      .then(r => r.json())
      .then(json => setHorarios((json.data ?? []).sort((a, b) => a.id - b.id)))
      .catch(() => setHorarios([]));
  }, []);

  // Carga reservas del día con populate explícito de las relaciones
  const cargarReservas = () => {
    setLoadingR(true);
    fetch(buildGetUrl(fechaISO))
      .then(r => r.json())
      .then(json => {
        const data = Array.isArray(json.data) ? json.data : [];
        // Log de diagnóstico: puedes ver en consola si llegan las relaciones
        console.log('[Reservas] cargadas para', fechaISO, data);
        setReservas(data);
      })
      .catch(err => {
        console.error('[Reservas] error cargando:', err);
        setReservas([]);
      })
      .finally(() => setLoadingR(false));
  };

  useEffect(() => {
    cargarReservas();
    setSelectedId(null);
    setReservaErr(null);
    setReservaOk(false);
  }, [fechaISO]);

  // 1 reserva por persona por día
  const yaReservoHoy = reservas.some(
    r => String(r.attributes?.documento) === String(usuario?.document_number)
  );

  const handleReservar = async (horarioObj) => {
    if (!usuario || !selectedId || !horarioObj) return;
    if (yaReservoHoy) { setReservaErr('Ya tienes una reserva para este día.'); return; }
    if (turnosBloqueados(reservas, selectedId).has(horarioObj.id)) {
      setReservaErr('Este turno ya no está disponible.');
      return;
    }

    setReservando(true);
    setReservaErr(null);

    try {
      /*
       * IMPORTANTE — formato que Strapi v4 espera para relaciones:
       *   campo_relacion: { id: X }
       *
       * Si el servidor devuelve 400 "relation expected" puede ser que
       * Strapi espere solo el número: campo_relacion: X
       * En ese caso cambia { id: selectedId } por selectedId directamente.
       */
      const body = {
        data: {
          Nombre:           usuario.nombre      ?? '',
          foto:             usuario.foto        ?? '',
          documento:        String(usuario.document_number),
          area:             usuario.area_nombre ?? '',
          fecha_reserva:    fechaISO,
          estado:           false,
          working_puestos:  { id: selectedId },
          working_horarios: { id: horarioObj.id },
        },
      };

      console.log('[Reservas] POST body:', JSON.stringify(body, null, 2));

      const res = await fetch(API_RESERVAS, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });

      const resJson = await res.json().catch(() => ({}));
      console.log('[Reservas] POST response:', resJson);

      if (!res.ok) {
        throw new Error(resJson?.error?.message ?? `Error ${res.status}`);
      }

      setReservaOk(true);
      cargarReservas();
      setTimeout(() => { setSelectedId(null); setReservaOk(false); }, 2500);
    } catch (err) {
      setReservaErr(err.message || 'Error al reservar. Intenta de nuevo.');
    } finally {
      setReservando(false);
    }
  };

  const getSilla = (id) => {
    const e = calcEstado(reservas, id);
    if (e === 'ocupado')  return sillaOcu;
    if (e === 'limitado') return sillaLim;
    return sillaDis;
  };

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
            <div className="reservas-dia-nav">
              <button
                className="reservas-dia-btn"
                onClick={() => setFechaIndex(i => Math.max(0, i - 1))}
                disabled={fechaIndex === 0}
                style={{ opacity: fechaIndex === 0 ? 0.28 : 1 }}
              >
                <IconChevronLeft />
              </button>
              <div className="reservas-dia-label">
                <IconCalendar />
                <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{fechaActual.label}</span>
                <span style={{ opacity: 0.55, fontSize: '0.75rem', fontWeight: 500 }}>
                  {fechaActual.diaLabel} {fechaActual.fechaLabel}
                </span>
              </div>
              <button
                className="reservas-dia-btn"
                onClick={() => setFechaIndex(i => Math.min(FECHAS.length - 1, i + 1))}
                disabled={fechaIndex === FECHAS.length - 1}
                style={{ opacity: fechaIndex === FECHAS.length - 1 ? 0.28 : 1 }}
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

        <div className="reservas-mapa" style={{ padding: '0 16px' }}>
          {loadingR ? (
            <div className="reservas-loading">Cargando escritorios…</div>
          ) : (
            <div className="reservas-mesa-container" style={{ width: 'clamp(420px, 74vh, 840px)' }}>
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
                      position:   'absolute',
                      width:      isHover || isSelect ? '22%' : '18%',
                      top:        s.top, left: s.left, right: s.right, bottom: s.bottom,
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

        <footer className="reservas-leyenda">
          <div className="reservas-leyenda-badge">
            <IconMonitorLeyenda />
            Con monitor: Esc. 1, 3 y 6
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {[
              { img: sillaDis, label: 'Disponible'              },
              { img: sillaLim, label: 'Disponibilidad limitada'  },
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