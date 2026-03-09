import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import reservasIniciales from '../../data/reservas.json';
import syncService from '../../utils/syncService';
import sillaDis from '../../assets/sillaDis.png';
import sillaLim from '../../assets/sillaLim.png';
import sillaOcu from '../../assets/sillaOcu.png';
import mesaImg from '../../assets/mesa.png';

const STATUS = { DISPONIBLE: 'disponible', LIMITADO: 'limitado', OCUPADO: 'ocupado' };
const CON_MONITOR = [1, 3, 6];

const calcEstado = (reservas, escritorioId) => {
  // Filtrar reservas por escritorio (ej: "Escritorio 3" o escritorioId = 3)
  const n = reservas.filter(r => {
    const escritorioNum = typeof r.escritorio === 'string' 
      ? r.escritorio.match(/\d+/)?.[0] 
      : r.escritorioId;
    return Number(escritorioNum) === Number(escritorioId);
  }).length;
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
const IconUser = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
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

const HORARIOS = [
  { id: 'manana',   label: 'Mañana',      hora: '8:00 am – 12:00 m' },
  { id: 'tarde',    label: 'Tarde',        hora: '1:00 pm – 5:00 pm' },
  { id: 'completo', label: 'Día completo', hora: '8:00 am – 5:00 pm' },
];

// CARD — layout vertical
const BookingCard = ({ escritorioId, usuario, reservas, onConfirm, onCancel, reservando, reservaOk, reservaErr }) => {
  const [horarioId, setHorarioId] = React.useState('manana');
  if (!escritorioId) return null;

  const estado       = calcEstado(reservas, escritorioId);
  const reservasDesk = reservas.filter(r => Number(r.escritorioId) === Number(escritorioId));
  const tieneMonitor = CON_MONITOR.includes(escritorioId);
  const estaOcupado  = estado === STATUS.OCUPADO;
  const horarioSel   = HORARIOS.find(h => h.id === horarioId);

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '24px',
      width: '272px',
      zIndex: 50,
    }}>
      <div style={{
        background: '#000000',
        color: '#fff',
        borderRadius: '24px',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}>

        {/* ── SECCIÓN: Reserva para ── */}
        <div style={{ padding: '18px 18px 14px' }}>
          <div style={{
            fontSize: '0.58rem', color: '#a8a29e',
            textTransform: 'uppercase', letterSpacing: '0.1em',
            fontWeight: '700', marginBottom: '14px',
          }}>
            Reserva para
          </div>

          {usuario && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              {/* Foto centrada arriba */}
              {usuario.foto && usuario.foto !== 'null' ? (
                <img
                  src={usuario.foto}
                  alt={usuario.nombre}
                  style={{
                    width: '64px', height: '64px',
                    borderRadius: '18px', objectFit: 'cover',
                    border: '2px solid rgba(255,255,255,0.15)',
                  }}
                />
              ) : (
                <div style={{
                  width: '64px', height: '64px',
                  borderRadius: '18px', background: '#292524',
                  border: '2px solid rgba(255,255,255,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <IconUserCard />
                </div>
              )}

              {/* Datos centrados abajo */}
              <div style={{ textAlign: 'center', width: '100%' }}>
                <div style={{
                  fontWeight: '800', fontSize: '0.95rem',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {usuario.nombre}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#d6d3d1', fontWeight: '600', marginTop: '3px' }}>
                  {usuario.cargo}
                </div>
                <div style={{ fontSize: '0.67rem', color: '#a8a29e', fontWeight: '500', marginTop: '2px' }}>
                  {usuario.area_nombre}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '0 18px' }} />

        {/* ── SECCIÓN: Ubicación ── */}
        <div style={{ padding: '14px 18px' }}>
          <div style={{
            fontSize: '0.58rem', color: '#a8a29e',
            textTransform: 'uppercase', letterSpacing: '0.1em',
            fontWeight: '700', marginBottom: '8px',
          }}>
            Ubicación
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <IconMonitorCard />
              <span style={{ fontWeight: '800', fontSize: '0.95rem' }}>Escritorio {escritorioId}</span>
            </div>
            {tieneMonitor && (
              <span style={{
                fontSize: '0.6rem', fontWeight: '700',
                background: 'rgba(255,255,255,0.1)', padding: '2px 8px',
                borderRadius: '999px', color: '#e7e5e4',
              }}>Con monitor</span>
            )}
          </div>

          {/* Personas que ya reservaron */}
          {reservasDesk.length > 0 && (
            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '56px', overflowY: 'auto' }}>
              {reservasDesk.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.67rem', color: '#a8a29e' }}>
                  <span>🖱️</span>
                  <span style={{ fontWeight: '600', color: '#d6d3d1' }}>{r.usuario ?? r.nombre ?? r.correo}</span>
                  {(r.horario || r.horaInicio) && (
                    <span style={{ color: '#78716c' }}>· {r.horario ?? `${r.horaInicio}–${r.horaFin}`}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '0 18px' }} />

        {/* ── SECCIÓN: Horario ── */}
        <div style={{ padding: '14px 18px' }}>
          <div style={{
            fontSize: '0.58rem', color: '#a8a29e',
            textTransform: 'uppercase', letterSpacing: '0.1em',
            fontWeight: '700', marginBottom: '10px',
          }}>
            Horario
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {HORARIOS.map(h => {
              const sel = horarioId === h.id;
              return (
                <button
                  key={h.id}
                  onClick={() => setHorarioId(h.id)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '9px 12px', borderRadius: '12px', cursor: 'pointer',
                    border: sel ? '1.5px solid #f97316' : '1.5px solid rgba(255,255,255,0.08)',
                    background: sel ? 'rgba(249,115,22,0.12)' : 'rgba(255,255,255,0.04)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span style={{ fontWeight: '700', fontSize: '0.82rem', color: sel ? '#fdba74' : '#d6d3d1' }}>
                    {h.label}
                  </span>
                  <span style={{ fontSize: '0.68rem', color: sel ? '#fb923c' : '#78716c', fontWeight: '600' }}>
                    {h.hora}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '0 18px' }} />

        {/* Feedback */}
        {(reservaErr || reservaOk) && (
          <div style={{ padding: '10px 18px 0' }}>
            {reservaErr && (
              <div style={{
                fontSize: '0.7rem', color: '#fca5a5',
                background: 'rgba(239,68,68,0.1)', borderRadius: '8px',
                padding: '7px 10px',
              }}>
                {reservaErr}
              </div>
            )}
            {reservaOk && (
              <div style={{
                fontSize: '0.75rem', color: '#86efac',
                background: 'rgba(34,197,94,0.1)', borderRadius: '8px',
                padding: '7px 10px', fontWeight: '700',
                display: 'flex', alignItems: 'center', gap: '5px',
              }}>
                ✓ ¡Reservado con éxito!
              </div>
            )}
          </div>
        )}

        {/* ── BOTONES ── */}
        <div style={{ padding: '14px 18px', display: 'flex', gap: '8px' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '10px 0', borderRadius: '14px',
              background: '#292524', border: 'none',
              color: '#a8a29e', fontWeight: '700', fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            Cancelar
          </button>

          <button
            onClick={() => onConfirm(horarioSel)}
            disabled={reservando || estaOcupado || reservaOk}
            style={{
              flex: 1, padding: '10px 0', borderRadius: '14px',
              background: estaOcupado ? '#57534e' : reservaOk ? '#22c55e' : '#f97316',
              border: 'none',
              color: estaOcupado ? '#a8a29e' : '#fff',
              fontWeight: '800', fontSize: '0.82rem',
              cursor: (reservando || estaOcupado || reservaOk) ? 'not-allowed' : 'pointer',
              opacity: reservando ? 0.7 : 1,
              boxShadow: (!estaOcupado && !reservaOk) ? '0 0 18px rgba(249,115,22,0.35)' : 'none',
              transition: 'opacity 0.2s, background 0.3s',
            }}
          >
            {estaOcupado ? 'No disponible' : reservando ? 'Reservando…' : reservaOk ? '¡Listo!' : 'Reservar'}
          </button>
        </div>

      </div>
    </div>
  );
};

// Componente principal
export default function Reservas() {
  const location = useLocation();
  const navigate = useNavigate();
  const usuario  = location.state?.datosEmpleado || null;

  // Estados
  const [fechaSeleccionada, setFechaSeleccionada] = useState(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return hoy;
  });
  const [hoverId,    setHoverId]    = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [reservas,   setReservas]   = useState([]);
  const [loadingR,   setLoadingR]   = useState(false);
  const [reservando, setReservando] = useState(false);
  const [reservaOk, setReservaOk] = useState(false);
  const [reservaErr, setReservaErr] = useState(null);

  // Calcular fechas permitidas (hoy y mañana)
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const manana = new Date(hoy);
  manana.setDate(manana.getDate() + 1);
  
  // Formato ISO de la fecha seleccionada
  const fechaISO = fechaSeleccionada.toISOString().split('T')[0];

  const cargarReservas = async () => {
    setLoadingR(true);
    try {
      console.log('📅 Cargando reservas para fecha:', fechaISO);
      
      // Cargar reservas del JSON
      const reservasJSON = reservasIniciales || [];
      
      // Cargar reservas del localStorage
      const reservasLocalStorage = JSON.parse(localStorage.getItem('reservas') || '[]');
      
      // Combinar ambas fuentes
      const todasReservas = [...reservasJSON, ...reservasLocalStorage];
      
      // Filtrar por fecha
      const reservasFecha = todasReservas.filter(r => r.fecha === fechaISO && r.estado !== 'Cancelada');
      
      console.log('✅ Reservas cargadas:', reservasFecha.length, 'para', fechaISO);
      console.log('📋 Reservas:', reservasFecha);
      
      setReservas(reservasFecha);
    } catch (err) {
      console.error('❌ Error cargando reservas:', err);
      setReservas([]);
    } finally {
      setLoadingR(false);
    }
  };

  useEffect(() => {
    cargarReservas();
    // Limpiar selección cuando cambie el día
    setSelectedId(null);
    setReservaErr(null);
  }, [fechaSeleccionada]);

  // Funciones de navegación de fecha
  const irDiaAnterior = () => {
    const fechaHoy = new Date();
    fechaHoy.setHours(0, 0, 0, 0);
    
    if (fechaSeleccionada > fechaHoy) {
      setFechaSeleccionada(fechaHoy);
    }
  };

  const irDiaSiguiente = () => {
    const fechaHoy = new Date();
    fechaHoy.setHours(0, 0, 0, 0);
    const fechaManana = new Date(fechaHoy);
    fechaManana.setDate(fechaManana.getDate() + 1);
    
    if (fechaSeleccionada.getTime() === fechaHoy.getTime()) {
      setFechaSeleccionada(fechaManana);
    }
  };

  // Verificar si podemos navegar
  const puedeIrAnterior = fechaSeleccionada > hoy;
  const puedeIrSiguiente = fechaSeleccionada.getTime() === hoy.getTime();

  // Formatear fecha para mostrar
  const formatearFecha = (fecha) => {
    const opciones = { weekday: 'long', day: 'numeric', month: 'long' };
    const fechaStr = fecha.toLocaleDateString('es-ES', opciones);
    const esHoy = fecha.getTime() === hoy.getTime();
    const esManana = fecha.getTime() === manana.getTime();
    
    if (esHoy) return `Hoy, ${fechaStr}`;
    if (esManana) return `Mañana, ${fechaStr}`;
    return fechaStr;
  };

  const handleReservar = async (horario) => {
    if (!usuario || !selectedId) return;
    setReservando(true);
    setReservaErr(null);
    
    try {
      // Obtener reservas actuales del localStorage
      const reservasLS = JSON.parse(localStorage.getItem('reservas') || '[]');
      
      // Verificar si ya existe una reserva para este usuario en esta fecha (cualquier escritorio)
      const yaReservadoHoy = reservasLS.some(r => 
        r.cedula === usuario.document_number && 
        r.fecha === fechaISO &&
        r.estado !== 'Cancelada'
      );
      
      if (yaReservadoHoy) {
        console.error('❌ Ya tienes una reserva para este día');
        setReservaErr('Solo puedes hacer una reserva por día.');
        setReservando(false);
        return;
      }
      
      // Crear nueva reserva
      const nuevaReserva = {
        id: Date.now(),
        key: Date.now(),
        cedula: usuario.document_number,
        nombre: usuario.nombre,
        fecha: fechaISO,
        escritorioId: selectedId,
        escritorio: `Escritorio ${selectedId}`,
        userId: usuario.document_number,
        horario: horario?.id,
        horaInicio: horario?.hora.split('–')[0].trim(),
        horaFin: horario?.hora.split('–')[1].trim(),
        estado: 'Confirmada',
        createdAt: new Date().toISOString(),
        usuario: usuario.nombre,
        correo: usuario.correo || '',
        cargo: usuario.cargo || '',
        area: usuario.area_nombre || '',
        foto: usuario.foto || null
      };
      
      // Guardar en localStorage
      reservasLS.push(nuevaReserva);
      syncService.saveReservas(reservasLS); // Usa servicio de sincronización
      
      console.log('✅ Reserva guardada exitosamente:', nuevaReserva);
      setReservaOk(true);
      cargarReservas();
      
      // Redirigir al panel después de mostrar el mensaje de éxito
      setTimeout(() => { 
        setSelectedId(null);
        setReservaOk(false);
        navigate('/panel', { state: { datosEmpleado: usuario } });
      }, 2500);
      
    } catch (err) {
      console.error('❌ Error al reservar:', err);
      setReservaErr('Error al guardar la reserva. Intenta de nuevo.');
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
              <button 
                onClick={irDiaAnterior}
                disabled={!puedeIrAnterior}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  cursor: puedeIrAnterior ? 'pointer' : 'not-allowed', 
                  padding: '5px 9px', 
                  borderRadius: '999px', 
                  color: puedeIrAnterior ? '#78716c' : '#d6d3d1', 
                  display: 'flex', 
                  alignItems: 'center',
                  opacity: puedeIrAnterior ? 1 : 0.4
                }}>
                <IconChevronLeft />
              </button>
              <div style={{ 
                padding: '0 12px', 
                fontWeight: '600', 
                color: '#44403c', 
                fontSize: '0.82rem', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '5px',
                minWidth: '200px',
                justifyContent: 'center'
              }}>
                <IconCalendar />
                {formatearFecha(fechaSeleccionada)}
              </div>
              <button 
                onClick={irDiaSiguiente}
                disabled={!puedeIrSiguiente}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  cursor: puedeIrSiguiente ? 'pointer' : 'not-allowed', 
                  padding: '5px 9px', 
                  borderRadius: '999px', 
                  color: puedeIrSiguiente ? '#78716c' : '#d6d3d1', 
                  display: 'flex', 
                  alignItems: 'center',
                  opacity: puedeIrSiguiente ? 1 : 0.4
                }}>
                <IconChevronRight />
              </button>
            </div>
            <button 
              onClick={() => navigate('/panel', { state: { datosEmpleado: usuario } })} 
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '8px 18px', borderRadius: '999px',
                background: '#f97316', border: 'none',
                color: '#fff', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(249, 115, 22, 0.3)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => e.target.style.transform = 'translateY(-1px)'}
              onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
            >
              <IconUser /> Mi Panel
            </button>
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

      {/* ── BOOKING CARD vertical ── */}
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