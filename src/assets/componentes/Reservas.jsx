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

//ICONOS
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
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="brown" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>
    <line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>
  </svg>
);
const IconCalendar = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="brown" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
);
const IconMonitorLeyenda = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
);
const IconMonitorCard = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
);
const IconUserCard = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a8a29e" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);

// CARD
const BookingCard = ({ escritorioId, usuario, reservas, onConfirm, onCancel, reservando, reservaOk, reservaErr }) => {
  if (!escritorioId) return null;

  const estado         = calcEstado(reservas, escritorioId);
  const reservasDesk   = reservas.filter(r => Number(r.escritorioId) === Number(escritorioId));
  const tieneMonitor   = CON_MONITOR.includes(escritorioId);
  const estaOcupado    = estado === STATUS.OCUPADO;

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '90%',
      maxWidth: '740px',
      zIndex: 50,
    }}>
      <div style={{
        background: '#44372e',
        color: '#fff',
        borderRadius: '24px',
        padding: '16px 20px',
        border: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '16px',
        flexWrap: 'wrap',
        boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
      }}>

        {/* Foto y datos de empleado */}
        {usuario && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            paddingRight: '16px',
            borderRight: '1px solid rgba(255,255,255,0.1)',
            flexShrink: 0,
          }}>
            <div style={{ position: 'relative' }}>
              {usuario.foto && usuario.foto !== 'null' ? (
                <img
                  src={usuario.foto}
                  alt={usuario.nombre}
                  style={{
                    width: '46px', height: '46px',
                    borderRadius: '12px',
                    objectFit: 'cover',
                    border: '2px solid rgba(255,255,255,0.12)',
                  }}
                />
              ) : (
                <div style={{
                  width: '46px', height: '46px',
                  borderRadius: '12px',
                  background: '#292524',
                  border: '2px solid rgba(255,255,255,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <IconUserCard />
                </div>
              )}
            </div>
            <div>
              <div style={{ fontSize: '0.58rem', color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '700' }}>
                Reserva para
              </div>
              <div style={{ fontWeight: '800', fontSize: '0.88rem', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {usuario.nombre}
              </div>
              <div style={{ fontSize: '0.68rem', fontWeight: '600' }}>{usuario.cargo}</div>
              <div style={{ fontSize: '0.65rem', fontWeight: '600' }}>{usuario.area_nombre}</div>
            </div>
          </div>
        )}

        {/* Escritorio y reservas actuales */}
        <div style={{ flex: 1, minWidth: '120px' }}>
          <div style={{ fontSize: '0.58rem', color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '700', marginBottom: '4px' }}>
            Ubicación
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <IconMonitorCard />
              <span style={{ fontWeight: '800', fontSize: '0.95rem' }}>Escritorio {escritorioId}</span>
            </div>
            {tieneMonitor && (
              <span style={{
                fontSize: '0.62rem', fontWeight: '700',
                background: 'rgba(255,255,255,0.12)', padding: '2px 7px',
                borderRadius: '999px', color: '#e7e5e4',
              }}>Con monitor</span>
            )}
          </div>

          {/* Personas que ya reservaron */}
          {reservasDesk.length > 0 && (
            <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '3px', maxHeight: '60px', overflowY: 'auto' }}>
              {reservasDesk.map((r, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  fontSize: '0.67rem', color: '#a8a29e',
                }}>
                  <span style={{ fontSize: '0.7rem' }}>🖱️</span>
                  <span style={{ fontWeight: '600', color: '#d6d3d1' }}>{r.usuario ?? r.nombre ?? r.correo}</span>
                  {(r.horario || r.horaInicio) && (
                    <span style={{ color: '#78716c' }}>· {r.horario ?? `${r.horaInicio}–${r.horaFin}`}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {reservaErr && (
            <div style={{ fontSize: '0.68rem', color: '#fca5a5', marginTop: '4px' }}>{reservaErr}</div>
          )}
        </div>

        {/* Botones */}
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0, alignSelf: 'center' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '9px 16px', borderRadius: '14px',
              background: '#292524', border: 'none',
              color: '#a8a29e', fontWeight: '700', fontSize: '0.8rem',
              cursor: 'pointer',
            }}
          >
            Cancelar
          </button>

          {reservaOk ? (
            <div style={{
              padding: '9px 22px', borderRadius: '14px',
              background: '#22c55e', color: '#fff',
              fontWeight: '800', fontSize: '0.82rem',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              ¡Reservado!
            </div>
          ) : (
            <button
              onClick={onConfirm}
              disabled={reservando || estaOcupado}
              style={{
                padding: '9px 22px', borderRadius: '14px',
                background: estaOcupado ? '#57534e' : '#f97316',
                border: 'none', color: estaOcupado ? '#a8a29e' : '#fff',
                fontWeight: '800', fontSize: '0.85rem',
                cursor: (reservando || estaOcupado) ? 'not-allowed' : 'pointer',
                opacity: reservando ? 0.7 : 1,
                boxShadow: !estaOcupado ? '0 0 20px rgba(249,115,22,0.4)' : 'none',
                transition: 'opacity 0.2s',
              }}
            >
              {estaOcupado ? 'No disponible' : reservando ? 'Reservando…' : 'Confirmar Reserva'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Componente principal
export default function Reservas() {
  const today    = new Date();
  const fechaISO = today.toISOString().split('T')[0];
  const location = useLocation();
  const navigate = useNavigate();
  const usuario  = location.state?.datosEmpleado || null;

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

  const handleReservar = async () => {
    if (!usuario || !selectedId) return;
    setReservando(true);
    setReservaErr(null);
    try {
      await axiosInstance.post(API_RESERVAS, {
        escritorioId: selectedId,
        fecha: fechaISO,
        userId: usuario.document_number,
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
    <div style={{
      position: 'fixed', inset: 0,
      background: '#F4F1ED',
      display: 'flex',
      alignItems: 'stretch',
      justifyContent: 'center',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      overflow: 'hidden',
    }}>
      <div style={{
        width: '100%',
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }}>

        {/* ── HEADER ── */}
        <div style={{
          padding: '14px 32px',
          borderBottom: '1px solid #f5f5f4',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          background: '#fff',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px', height: '42px', borderRadius: '14px',
              background: '#fff7ed', border: '1px solid #fed7aa',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <IconCoffee />
            </div>
            <div>
              <div style={{ fontSize: '1.15rem', fontWeight: '800', letterSpacing: '-0.5px', color: '#1c1917' }}>
                Crepe-Working <span style={{ color: '#f97316' }}>1</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#a8a29e', fontWeight: '500' }}>
                Selecciona tu espacio de trabajo
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{
              display: 'flex', alignItems: 'center',
              background: '#fafaf9', borderRadius: '999px',
              border: '1px solid #e7e5e4', padding: '3px',
            }}>
              <button onClick={() => setDiaIndex(d => (d - 1 + DIAS.length) % DIAS.length)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px 9px', borderRadius: '999px', color: '#78716c', display: 'flex', alignItems: 'center' }}>
                <IconChevronLeft />
              </button>
              <div style={{ padding: '0 12px', fontWeight: '600', color: '#44403c', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <IconCalendar />
                {DIAS[diaIndex]}-{String(today.getDate()).padStart(2, '0')}
              </div>
              <button onClick={() => setDiaIndex(d => (d + 1) % DIAS.length)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px 9px', borderRadius: '999px', color: '#78716c', display: 'flex', alignItems: 'center' }}>
                <IconChevronRight />
              </button>
            </div>
            <button onClick={() => navigate(-1)} style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '8px 18px', borderRadius: '999px',
              background: '#fff', border: '1px solid #e7e5e4',
              color: '#57534e', fontWeight: '600', fontSize: '0.8rem', cursor: 'pointer',
            }}>
              <IconArrowLeft /> Atrás
            </button>
          </div>
        </div>

        {/* ── ÁREA MAPA ── */}
        <div style={{
          flex: 1,
          background: '#fafaf9',
          backgroundImage: 'radial-gradient(#00000010 1.5px, transparent 1.5px)',
          backgroundSize: '28px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          minHeight: 0,
        }}>
          {loadingR ? (
            <div style={{ color: '#a8a29e', fontWeight: '600' }}>Cargando escritorios…</div>
          ) : (
            <div style={{ position: 'relative', width: 'clamp(320px, 60vh, 680px)' }}>
              <img src={mesaImg} alt="Mesa" style={{ width: '100%', height: 'auto', display: 'block' }} />
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
                        ? 'drop-shadow(0 0 8px rgba(249,115,22,0.8)) brightness(1.1)'
                        : isHover && isAvail
                        ? 'brightness(1.15) drop-shadow(0 4px 8px rgba(0,0,0,0.25))'
                        : 'none',
                      zIndex: isHover || isSelect ? 10 : 1,
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* ── LEYENDA ── */}
        <div style={{
          padding: '10px 32px',
          borderTop: '1px solid #f5f5f4',
          background: '#fff',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px 28px',
          flexShrink: 0,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            background: '#f9fafb', border: '1px solid #e7e5e4',
            borderRadius: '999px', padding: '4px 12px',
            fontSize: '0.72rem', fontWeight: '600', color: '#57534e',
          }}>
            <IconMonitorLeyenda /> Cuenta con monitor (Esc. 1, 3 y 6)
          </div>
          <div style={{ width: '1px', height: '20px', background: '#e7e5e4' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <img src={sillaDis} alt="Disponible" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
            <span style={{ fontSize: '0.78rem', fontWeight: '600', color: '#78716c' }}>Disponible</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <img src={sillaLim} alt="Limitada" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
            <span style={{ fontSize: '0.78rem', fontWeight: '600', color: '#78716c' }}>Disponibilidad limitada</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <img src={sillaOcu} alt="Ocupado" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
            <span style={{ fontSize: '0.78rem', fontWeight: '600', color: '#78716c' }}>Ocupado</span>
          </div>
        </div>
      </div>

      {/* ── BOOKING CARD unificada ── */}
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