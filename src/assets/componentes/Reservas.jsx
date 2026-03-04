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

// ── SVG Icons ──────────────────────────────────────────────
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
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>
    <line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>
  </svg>
);
const IconCalendar = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
);
const IconMonitorLeyenda = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
);
const IconMonitorCard = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
);
const IconX = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
);
const IconUser = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);
const IconUserCard = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a8a29e" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);

const ESTADO_LABEL = { disponible: 'DISPONIBLE', limitado: 'DISPONIBILIDAD LIMITADA', ocupado: 'OCUPADO' };
const ESTADO_BADGE = {
  disponible: { bg: 'rgba(74,222,128,0.2)',  color: '#dcfce7' },
  limitado:   { bg: 'rgba(251,191,36,0.2)',  color: '#fef9c3' },
  ocupado:    { bg: 'rgba(156,163,175,0.2)', color: '#f3f4f6' },
};

// ── BookingCard integrada ──────────────────────────────────
const BookingCard = ({ escritorioId, usuario, onConfirm, onCancel, reservando, reservaOk, reservaErr }) => {
  if (!escritorioId) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '90%',
      maxWidth: '700px',
      zIndex: 50,
    }}>
      <div style={{
        background: '#1c1917',
        color: '#fff',
        borderRadius: '24px',
        padding: '14px 20px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        border: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        flexWrap: 'wrap',
      }}>

        {/* Foto + datos del empleado */}
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
              {/* Punto verde */}
              <div style={{
                position: 'absolute', bottom: '-2px', right: '-2px',
                width: '12px', height: '12px',
                background: '#22c55e',
                border: '2px solid #1c1917',
                borderRadius: '50%',
              }} />
            </div>
            <div>
              <div style={{ fontSize: '0.58rem', color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '700' }}>
                Reserva para
              </div>
              <div style={{ fontWeight: '800', fontSize: '0.9rem', maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {usuario.nombre}
              </div>
              <div style={{ fontSize: '0.68rem', color: '#f97316', fontWeight: '600' }}>
                {usuario.cargo}
              </div>
            </div>
          </div>
        )}

        {/* Escritorio seleccionado */}
        <div style={{ flex: 1, minWidth: '100px' }}>
          <div style={{ fontSize: '0.58rem', color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '700' }}>
            Ubicación
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
            <IconMonitorCard />
            <span style={{ fontWeight: '800', fontSize: '1rem' }}>Escritorio {escritorioId}</span>
          </div>
          {reservaErr && (
            <div style={{ fontSize: '0.68rem', color: '#fca5a5', marginTop: '2px' }}>{reservaErr}</div>
          )}
        </div>

        {/* Botones */}
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          <button
            onClick={onCancel}
            style={{
              padding: '9px 16px', borderRadius: '14px',
              background: '#292524', border: 'none',
              color: '#a8a29e', fontWeight: '700', fontSize: '0.8rem',
              cursor: 'pointer', transition: 'background 0.15s',
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
              ✅ ¡Reservado!
            </div>
          ) : (
            <button
              onClick={onConfirm}
              disabled={reservando}
              style={{
                padding: '9px 26px', borderRadius: '14px',
                background: '#f97316', border: 'none', color: '#fff',
                fontWeight: '800', fontSize: '0.85rem',
                cursor: reservando ? 'not-allowed' : 'pointer',
                opacity: reservando ? 0.7 : 1,
                boxShadow: '0 0 20px rgba(249,115,22,0.4)',
                transition: 'opacity 0.2s',
              }}
            >
              {reservando ? 'Reservando…' : 'Confirmar Reserva'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Componente principal ───────────────────────────────────
export default function Reservas() {
  const today    = new Date();
  const fechaISO = today.toISOString().split('T')[0];
  const location = useLocation();
  const navigate = useNavigate();
  const usuario  = location.state?.datosEmpleado || null;

  const [diaIndex,   setDiaIndex]   = useState(today.getDay() === 0 ? 6 : today.getDay() - 1);
  const [hoverId,    setHoverId]    = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [modalId,    setModalId]    = useState(null);
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

  const modalEstado   = modalId ? calcEstado(reservas, modalId) : STATUS.DISPONIBLE;
  const reservasModal = reservas.filter(r => Number(r.escritorioId) === Number(modalId));
  const fechaStr = today.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });

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
                    onDoubleClick={() => isAvail && setModalId(s.id)}
                    onMouseEnter={() => setHoverId(s.id)}
                    onMouseLeave={() => setHoverId(null)}
                    title="Clic: seleccionar · Doble clic: ver detalle"
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

      {/* ── BOOKING CARD con datos del usuario logueado ── */}
      <BookingCard
        escritorioId={selectedId}
        usuario={usuario}
        onConfirm={handleReservar}
        onCancel={() => { setSelectedId(null); setReservaErr(null); }}
        reservando={reservando}
        reservaOk={reservaOk}
        reservaErr={reservaErr}
      />

      {/* ── MODAL DETALLE ── */}
      {modalId && (
        <div onClick={() => setModalId(null)} style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100, padding: '16px',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#fff', borderRadius: '28px',
            width: '100%', maxWidth: '370px',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #fb923c, #f97316)',
              padding: '22px 22px 28px', position: 'relative',
            }}>
              <button onClick={() => setModalId(null)} style={{
                position: 'absolute', top: '12px', right: '12px',
                width: '30px', height: '30px',
                background: 'rgba(255,255,255,0.2)', border: 'none',
                borderRadius: '50%', color: '#fff', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}><IconX /></button>
              <div style={{ color: '#fff', fontWeight: '800', fontSize: '1.1rem' }}>
                Escritorio {modalId}
                {CON_MONITOR.includes(modalId) && (
                  <span style={{
                    marginLeft: '8px', fontSize: '0.68rem', fontWeight: '600',
                    background: 'rgba(255,255,255,0.25)', padding: '2px 8px',
                    borderRadius: '999px', verticalAlign: 'middle',
                  }}>
                    🖥 Con monitor
                  </span>
                )}
              </div>
              <div style={{
                display: 'inline-block', marginTop: '5px',
                padding: '3px 10px', borderRadius: '999px',
                background: ESTADO_BADGE[modalEstado].bg,
                color: ESTADO_BADGE[modalEstado].color,
                fontSize: '0.68rem', fontWeight: '700',
              }}>
                {ESTADO_LABEL[modalEstado]}
              </div>
            </div>

            <div style={{ padding: '14px 18px' }}>
              <div style={{
                background: '#f9fafb', border: '1px solid #f3f4f6',
                borderRadius: '14px', padding: '9px 14px',
                textAlign: 'center', fontSize: '0.82rem',
                fontWeight: '600', color: '#44403c', marginBottom: '10px',
              }}>{fechaStr}</div>

              {usuario ? (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  background: '#fafaf9', border: '1px solid #f3f4f6',
                  borderRadius: '14px', padding: '10px', marginBottom: '10px',
                }}>
                  {usuario.foto && usuario.foto !== 'null' ? (
                    <img src={usuario.foto} alt={usuario.nombre} style={{
                      width: '48px', height: '48px', borderRadius: '10px',
                      objectFit: 'cover', border: '2px solid #fed7aa', flexShrink: 0,
                    }} />
                  ) : (
                    <div style={{
                      width: '48px', height: '48px', borderRadius: '10px',
                      background: '#fff7ed', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}><IconUser /></div>
                  )}
                  <div style={{ fontSize: '0.75rem', color: '#57534e', lineHeight: '1.6' }}>
                    <div style={{ fontWeight: '800', fontSize: '0.85rem', color: '#1c1917' }}>{usuario.nombre}</div>
                    <div>📄 {usuario.document_number}</div>
                    <div>💼 {usuario.cargo}</div>
                    <div>📍 {usuario.area_nombre}</div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: '#a8a29e', fontSize: '0.8rem', padding: '6px 0 10px' }}>Sin datos de usuario</div>
              )}

              {reservasModal.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '120px', overflowY: 'auto', marginBottom: '10px' }}>
                  {reservasModal.map((r, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      background: '#fff7ed', border: '1px solid #fed7aa',
                      borderRadius: '10px', padding: '8px 10px',
                    }}>
                      <div style={{
                        width: '30px', height: '30px', borderRadius: '8px',
                        background: '#fed7aa', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem',
                      }}>🖱️</div>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.75rem', color: '#44403c' }}>{r.usuario ?? r.nombre ?? r.correo}</div>
                        <div style={{ fontSize: '0.68rem', color: '#a8a29e' }}>{r.horario ?? (r.horaInicio ? `${r.horaInicio} a ${r.horaFin}` : '')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ textAlign: 'center', color: '#a8a29e', fontSize: '0.75rem', marginBottom: '10px' }}>Sin reservas para este día</p>
              )}

              <button
                onClick={() => { setSelectedId(modalId); setModalId(null); }}
                disabled={modalEstado === STATUS.OCUPADO}
                style={{
                  width: '100%', padding: '12px',
                  background: modalEstado === STATUS.OCUPADO ? '#f3f4f6' : '#f97316',
                  color: modalEstado === STATUS.OCUPADO ? '#9ca3af' : '#fff',
                  border: 'none', borderRadius: '14px',
                  fontWeight: '700', fontSize: '0.875rem',
                  cursor: modalEstado === STATUS.OCUPADO ? 'not-allowed' : 'pointer',
                  boxShadow: modalEstado !== STATUS.OCUPADO ? '0 4px 14px rgba(249,115,22,0.3)' : 'none',
                  transition: 'all 0.2s',
                }}>
                {modalEstado === STATUS.OCUPADO ? 'No disponible' : 'Seleccionar este escritorio'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}