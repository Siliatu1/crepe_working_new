import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import sillaDis from '../../assets/sillaDis.png';
import sillaLim from '../../assets/sillaLim.png';
import sillaOcu from '../../assets/sillaOcu.png';
import mesaImg  from '../../assets/mesa.png';

const API_RESERVAS = '/api/reservas';
const STATUS = { DISPONIBLE: 'disponible', LIMITADO: 'limitado', OCUPADO: 'ocupado' };
const DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const CON_MONITOR = [1, 3, 6];
const ADMINS = ['1028783377'];

const calcEstado = (reservas, escritorioId) => {
  const n = reservas.filter(r => Number(r.escritorioId) === Number(escritorioId)).length;
  if (n === 0) return STATUS.DISPONIBLE;
  if (n >= 3)  return STATUS.OCUPADO;
  return STATUS.LIMITADO;
};

const SILLAS = [
  { id: 1, top: '-5%',  left: '0%',   rotate: '-15deg' },
  { id: 2, top: '-25%', left: '45%',  rotate: '25deg'  },
  { id: 3, top: '-25%', left: '70%',  rotate: '-20deg' },
  { id: 4, top: '95%',  left: '0%',   rotate: '210deg' },
  { id: 5, top: '75%',  left: '40%',  rotate: '180deg' },
  { id: 6, top: '75%',  right: '15%', rotate: '210deg' },
];

const HORARIOS = [
  { id: 'manana',   label: 'Mañana',      hora: '8:00 am – 12:00 m' },
  { id: 'tarde',    label: 'Tarde',        hora: '1:00 pm – 5:00 pm' },
  { id: 'completo', label: 'Día completo', hora: '8:00 am – 5:00 pm' },
];

// ── Iconos ────────────────────────────────────────────────────
const IconChevronLeft = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
);
const IconChevronRight = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
);
const IconArrowLeft = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
);
const IconCoffee = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7F3A14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>
    <line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>
  </svg>
);
const IconCalendar = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7F3A14" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
);
const IconMonitorLeyenda = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
);
const IconMonitorCard = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#503629" strokeWidth="2.5" strokeLinecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
);
const IconUserCard = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#92614F" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);
const IconShield = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

// ── Booking Card ─────────────────────────────────────────────
const BookingCard = ({ escritorioId, usuario, reservas, onConfirm, onCancel, reservando, reservaOk, reservaErr }) => {
  const [horarioId, setHorarioId] = React.useState('manana');
  if (!escritorioId) return null;

  const estado       = calcEstado(reservas, escritorioId);
  const reservasDesk = reservas.filter(r => Number(r.escritorioId) === Number(escritorioId));
  const tieneMonitor = CON_MONITOR.includes(escritorioId);
  const estaOcupado  = estado === STATUS.OCUPADO;
  const horarioSel   = HORARIOS.find(h => h.id === horarioId);

  return (
    <div className="booking-card-wrapper">
      <div className="booking-card">

        {/* Reserva para */}
        <div className="booking-section">
          <div className="booking-section-label">Reserva para</div>
          {usuario && (
            <div className="booking-user">
              {usuario.foto && usuario.foto !== 'null' ? (
                <img src={usuario.foto} alt={usuario.nombre} className="booking-user-foto" />
              ) : (
                <div className="booking-user-placeholder"><IconUserCard /></div>
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

        {/* Ubicación */}
        <div className="booking-section">
          <div className="booking-section-label">Ubicación</div>
          <div className="booking-ubicacion-row">
            <IconMonitorCard />
            <span className="booking-escritorio-nombre">Escritorio {escritorioId}</span>
            {tieneMonitor && <span className="booking-badge-monitor">Con monitor</span>}
          </div>
          {reservasDesk.length > 0 && (
            <div className="booking-ocupantes">
              {reservasDesk.map((r, i) => (
                <div key={i} className="booking-ocupante-item">
                  <span>🖱️</span>
                  <span className="booking-ocupante-nombre">{r.usuario ?? r.nombre ?? r.correo}</span>
                  {(r.horario || r.horaInicio) && (
                    <span className="booking-ocupante-hora">· {r.horario ?? `${r.horaInicio}–${r.horaFin}`}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="booking-divider" />

        {/* Horario */}
        <div className="booking-section">
          <div className="booking-section-label">Horario</div>
          <div className="booking-horarios">
            {HORARIOS.map(h => {
              const sel = horarioId === h.id;
              return (
                <button
                  key={h.id}
                  onClick={() => setHorarioId(h.id)}
                  className={`booking-horario-btn${sel ? ' booking-horario-btn--selected' : ''}`}
                >
                  <span className="booking-horario-label">{h.label}</span>
                  <span className="booking-horario-hora">{h.hora}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="booking-divider" />

        {/* Feedback */}
        {(reservaErr || reservaOk) && (
          <div className="booking-section">
            {reservaErr && <div className="booking-feedback booking-feedback--error">{reservaErr}</div>}
            {reservaOk  && <div className="booking-feedback booking-feedback--ok">✓ ¡Reservado con éxito!</div>}
          </div>
        )}

        {/* Botones */}
        <div className="booking-botones">
          <button className="booking-btn-cancelar" onClick={onCancel}>Cancelar</button>
          <button
            className={`booking-btn-confirmar${estaOcupado ? ' booking-btn-confirmar--ocupado' : ''}${reservaOk ? ' booking-btn-confirmar--ok' : ''}`}
            onClick={() => onConfirm(horarioSel)}
            disabled={reservando || estaOcupado || reservaOk}
          >
            {estaOcupado ? 'No disponible' : reservando ? 'Reservando…' : reservaOk ? '¡Listo!' : 'Reservar'}
          </button>
        </div>

      </div>
    </div>
  );
};

// ── Componente principal ─────────────────────────────────────
export default function Reservas() {
  const today    = new Date();
  const fechaISO = today.toISOString().split('T')[0];
  const location = useLocation();
  const navigate = useNavigate();
  const usuario  = location.state?.datosEmpleado || null;

  const esAdmin = usuario && ADMINS.includes(String(usuario.document_number));

  const [diaIndex,   setDiaIndex]   = useState(today.getDay() === 0 ? 6 : today.getDay() - 1);
  const [hoverId,    setHoverId]    = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [reservas,   setReservas]   = useState([]);
  const [loadingR,   setLoadingR]   = useState(false);
  const [reservando, setReservando] = useState(false);
  const [reservaOk,  setReservaOk]  = useState(false);
  const [reservaErr, setReservaErr] = useState(null);

  const cargarReservas = () => {
    setLoadingR(true);
    axiosInstance.get(API_RESERVAS, { params: { fecha: fechaISO } })
      .then(res => setReservas(Array.isArray(res.data) ? res.data : []))
      .catch(() => setReservas([]))
      .finally(() => setLoadingR(false));
  };

  useEffect(() => { cargarReservas(); }, [diaIndex]);

  const handleReservar = async (horario) => {
    if (!usuario || !selectedId) return;
    setReservando(true);
    setReservaErr(null);
    try {
      await axiosInstance.post(API_RESERVAS, {
        escritorioId: selectedId,
        fecha: fechaISO,
        userId: usuario.document_number,
        horario: horario?.id,
        horaInicio: horario?.hora.split('–')[0].trim(),
        horaFin: horario?.hora.split('–')[1].trim(),
      });
      setReservaOk(true);
      cargarReservas();
      setTimeout(() => { setSelectedId(null); setReservaOk(false); }, 2500);
    } catch (err) {
      setReservaErr(err?.response?.data?.message || 'Error al reservar.');
    } finally {
      setReservando(false);
    }
  };

  const getSilla = (id) => {
    const estado = calcEstado(reservas, id);
    if (estado === STATUS.OCUPADO)  return sillaOcu;
    if (estado === STATUS.LIMITADO) return sillaLim;
    return sillaDis;
  };

  return (
    <div className="reservas-wrapper">
      <div className="reservas-inner">

        {/* Header */}
        <header className="reservas-header">
          <div className="reservas-header-left">
            <div className="reservas-logo-box">
              <IconCoffee />
            </div>
            <div>
              <div className="reservas-titulo">
                Crepe-Working <span className="text-accent">1</span>
              </div>
              <div className="text-muted">Selecciona tu espacio de trabajo</div>
            </div>
          </div>

          <div className="reservas-header-right">
            <div className="reservas-dia-nav">
              <button className="reservas-dia-btn" onClick={() => setDiaIndex(d => (d - 1 + DIAS.length) % DIAS.length)}>
                <IconChevronLeft />
              </button>
              <div className="reservas-dia-label">
                <IconCalendar />
                {DIAS[diaIndex]}-{String(today.getDate()).padStart(2, '0')}
              </div>
              <button className="reservas-dia-btn" onClick={() => setDiaIndex(d => (d + 1) % DIAS.length)}>
                <IconChevronRight />
              </button>
            </div>

            {esAdmin && (
              <button
                className="btn-continuar"
                style={{ padding: '6px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={() => navigate('/panel', { state: { datosEmpleado: usuario } })}
              >
                <IconShield /> Panel
              </button>
            )}

            <button className="btn-outline reservas-btn-atras" onClick={() => navigate(-1)}>
              <IconArrowLeft /> Atrás
            </button>
          </div>
        </header>

        {/* Mapa */}
        <div className="reservas-mapa">
          {loadingR ? (
            <div className="reservas-loading">Cargando escritorios…</div>
          ) : (
            <div className="reservas-mesa-container">
              <img src={mesaImg} alt="Mesa" className="reservas-mesa-img" />
              {SILLAS.map(s => {
                const estado   = calcEstado(reservas, s.id);
                const isAvail  = estado !== STATUS.OCUPADO;
                const isHover  = hoverId === s.id;
                const isSelect = selectedId === s.id;
                return (
                  <img
                    key={s.id}
                    src={getSilla(s.id)}
                    alt={`Silla ${s.id}`}
                    onClick={() => { if (!isAvail) return; setSelectedId(isSelect ? null : s.id); setReservaErr(null); }}
                    onMouseEnter={() => setHoverId(s.id)}
                    onMouseLeave={() => setHoverId(null)}
                    title="Clic para seleccionar"
                    style={{
                      position: 'absolute',
                      width: isHover || isSelect ? '22%' : '18%',
                      top: s.top, left: s.left, right: s.right, bottom: s.bottom,
                      transform: `rotate(${s.rotate})${isSelect ? ' scale(1.15)' : ''}`,
                      cursor: isAvail ? 'pointer' : 'not-allowed',
                      transition: 'width 0.2s ease, filter 0.2s ease, transform 0.2s ease',
                      filter: isSelect
                        ? 'drop-shadow(0 0 8px rgba(127,58,20,0.7)) brightness(1.1)'
                        : isHover && isAvail
                        ? 'brightness(1.15) drop-shadow(0 4px 8px rgba(0,0,0,0.2))'
                        : 'none',
                      zIndex: isHover || isSelect ? 10 : 1,
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Leyenda */}
        <footer className="reservas-leyenda">
          <div className="reservas-leyenda-badge">
            <IconMonitorLeyenda /> Cuenta con monitor (Esc. 1, 3 y 6)
          </div>
          <div className="reservas-leyenda-sep" />
          <div className="reservas-leyenda-item">
            <img src={sillaDis} alt="Disponible" className="reservas-leyenda-img" />
            <span className="text-muted">Disponible</span>
          </div>
          <div className="reservas-leyenda-item">
            <img src={sillaLim} alt="Limitada" className="reservas-leyenda-img" />
            <span className="text-muted">Disponibilidad limitada</span>
          </div>
          <div className="reservas-leyenda-item">
            <img src={sillaOcu} alt="Ocupado" className="reservas-leyenda-img" />
            <span className="text-muted">Ocupado</span>
          </div>
        </footer>

      </div>

      {/* Booking Card */}
      <BookingCard
        escritorioId={selectedId}
        usuario={usuario}
        reservas={reservas}
        onConfirm={handleReservar}
        onCancel={() => { setSelectedId(null); setReservaErr(null); }}
        reservando={reservando}
        reservaOk={reservaOk}
        reservaErr={reservaErr}
      />
    </div>
  );
}