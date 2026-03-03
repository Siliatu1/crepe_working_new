import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getReservas, addReserva } from '../../utils/reservasService';
import sillaDis from '../../assets/sillaDis.png';
import sillaOcu from '../../assets/sillaOcu.png';
import mesaImg  from '../../assets/mesa.png';

const STATUS = { DISPONIBLE: 'disponible', LIMITADO: 'limitado', OCUPADO: 'ocupado' };
const DIAS   = ['lunes','martes','miércoles','jueves','viernes','sábado','domingo'];

const ESTADO_COLOR = { disponible:'#99c199', limitado:'#e8c94e', ocupado:'#a66a4a' };
const ESTADO_LABEL = { disponible:'DISPONIBLE', limitado:'DISPONIBILIDAD LIMITADA', ocupado:'OCUPADO' };

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
  { id: 1, top: '33%',  left: '-13%',  rotate: '-90deg' },
  { id: 2, top: '-13%', left: '24%',   rotate: '-30deg' },
  { id: 3, top: '-13%', left: '56%',   rotate: '30deg'  },
  { id: 4, top: '72%',  left: '-1%',   rotate: '210deg' },
  { id: 5, top: '85%',  left: '35%',   rotate: '180deg' },
  { id: 6, top: '33%',  right: '-13%', rotate: '90deg'  },
];

export default function CrepeWorking() {
  const today    = new Date();
  const fechaISO = today.toISOString().split('T')[0];

  // ── Usuario viene desde Bienvenida via navigate state ──
  const location = useLocation();
  const navigate = useNavigate();
  const usuario  = location.state?.datosEmpleado || null;
  const errorU   = !usuario ? 'No se recibieron datos del usuario' : null;

  const [diaIndex,   setDiaIndex]   = useState(today.getDay() === 0 ? 6 : today.getDay() - 1);
  const [hoverId,    setHoverId]    = useState(null);
  const [modalId,    setModalId]    = useState(null);
  const [reservas,   setReservas]   = useState([]);
  const [loadingR,   setLoadingR]   = useState(false);
  const [reservando, setReservando] = useState(false);
  const [reservaOk,  setReservaOk]  = useState(false);
  const [reservaErr, setReservaErr] = useState(null);

  const cargarReservas = () => {
    setLoadingR(true);
    try {
      // Obtener reservas desde el servicio local
      const todasReservas = getReservas();
      // Filtrar por la fecha actual
      const reservasFecha = todasReservas.filter(r => r.fecha === fechaISO);
      setReservas(reservasFecha);
    } catch (error) {
      console.error('Error cargando reservas:', error);
      setReservas([]);
    } finally {
      setLoadingR(false);
    }
  };

  useEffect(() => { cargarReservas(); }, [diaIndex, fechaISO]);

  const handleReservar = async () => {
    if (!usuario || !modalId) return;
    setReservando(true);
    setReservaErr(null);
    try {
      // Crear la nueva reserva usando el servicio local
      const nuevaReserva = {
        cedula: usuario.document_number,
        nombre: usuario.nombre,
        fecha: fechaISO,
        turno: 'Día completo (7:00 AM - 6:00 PM)',
        escritorio: `Escritorio ${modalId}`,
        escritorioId: modalId, // Para compatibilidad
      };
      
      const resultado = addReserva(nuevaReserva);
      
      if (resultado) {
        setReservaOk(true);
        // Redirigir al panel después de 2 segundos
        setTimeout(() => {
          navigate('/panel');
        }, 2000);
        cargarReservas();
      } else {
        setReservaErr('Error al guardar la reserva. Intenta de nuevo.');
      }
    } catch (err) {
      console.error('Error al reservar:', err);
      setReservaErr('Error al reservar. Intenta de nuevo.');
    } finally {
      setReservando(false);
    }
  };

  const reservasModal = reservas.filter(r => {
    const escritorioNum = typeof r.escritorio === 'string' 
      ? r.escritorio.match(/\d+/)?.[0] 
      : r.escritorioId;
    return Number(escritorioNum) === Number(modalId);
  });
  const estadoModal   = modalId ? calcEstado(reservas, modalId) : STATUS.DISPONIBLE;
  const fechaStr      = today.toLocaleDateString('es-CO', { day:'numeric', month:'long', year:'numeric' });

  return (
    <>
      <div style={{
        minHeight:'100vh', width:'100%',
        background:'#f3e0cc',
        display:'flex', flexDirection:'column',
        boxSizing:'border-box',
      }}>

        {/* HEADER */}
        <div style={{
          display:'flex', alignItems:'center',
          justifyContent:'space-between',
          padding:'16px 20px', gap:'12px', flexShrink:0,
        }}>
          <h1 style={{
            fontSize:'clamp(1rem,2.5vw,1.6rem)',
            fontWeight:'bold', fontStyle:'italic',
            color:'#c47a3a', margin:0, whiteSpace:'nowrap',
          }}>Crepe-Working 1</h1>

          <div style={{
            display:'flex', alignItems:'center', gap:'12px',
            background:'white', borderRadius:'999px',
            padding:'10px 20px', boxShadow:'0 1px 6px rgba(0,0,0,0.1)',
            flex:'0 1 260px', justifyContent:'space-between',
          }}>
            <button onClick={() => setDiaIndex(d => (d-1+DIAS.length)%DIAS.length)}
              style={{ background:'none', border:'none', fontSize:'1rem', cursor:'pointer', color:'#555' }}>◀</button>
            <span style={{ fontWeight:'600', color:'#444', fontSize:'0.9rem', whiteSpace:'nowrap' }}>
              {DIAS[diaIndex]}-{String(today.getDate()).padStart(2,'0')}
            </span>
            <button onClick={() => setDiaIndex(d => (d+1)%DIAS.length)}
              style={{ background:'none', border:'none', fontSize:'1rem', cursor:'pointer', color:'#555' }}>▶</button>
          </div>

          <button style={{
            background:'#b86e2e', color:'white',
            padding:'10px 24px', borderRadius:'12px',
            fontSize:'0.9rem', fontWeight:'600',
            border:'none', cursor:'pointer',
            boxShadow:'0 2px 8px rgba(0,0,0,0.15)', whiteSpace:'nowrap',
          }}>Atrás</button>
        </div>

        {/* MAPA */}
        <div style={{
          flex:1, margin:'0 16px',
          background:'#d4956a', borderRadius:'24px',
          display:'flex', alignItems:'center', justifyContent:'center',
          padding:'10%', minHeight:0,
        }}>
          {loadingR ? (
            <p style={{ color:'white', fontWeight:'600' }}>Cargando escritorios…</p>
          ) : (
            <div style={{ position:'relative', width:'100%', maxWidth:'520px' }}>
              <img src={mesaImg} alt="Mesa" style={{ width:'100%', height:'auto', display:'block' }} />
              {SILLAS.map(s => (
                <img
                  key={s.id}
                  src={calcEstado(reservas, s.id) === STATUS.OCUPADO ? sillaOcu : sillaDis}
                  alt={`Silla ${s.id}`}
                  onClick={() => { setModalId(s.id); setReservaOk(false); setReservaErr(null); }}
                  onMouseEnter={() => setHoverId(s.id)}
                  onMouseLeave={() => setHoverId(null)}
                  style={{
                    position:'absolute',
                    width: hoverId === s.id ? '22%' : '18%',
                    top:s.top, left:s.left, right:s.right, bottom:s.bottom,
                    transform:`rotate(${s.rotate})`,
                    cursor:'pointer',
                    transition:'width 0.2s ease, filter 0.2s ease',
                    filter: hoverId === s.id
                      ? 'brightness(1.15) drop-shadow(0 4px 8px rgba(0,0,0,0.3))'
                      : 'none',
                    zIndex: hoverId === s.id ? 10 : 1,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* LEYENDA */}
        <div style={{
          display:'flex', flexWrap:'wrap',
          justifyContent:'center', gap:'12px 28px',
          padding:'16px 20px', flexShrink:0,
        }}>
          {[
            { color:'#99c199', label:'Libre' },
            { color:'#e8c94e', label:'Disponibilidad limitada' },
            { color:'#a66a4a', label:'Ocupado' },
          ].map(({ color, label }) => (
            <div key={label} style={{ display:'flex', alignItems:'center', gap:'8px', fontWeight:'600', color:'#5d3a24', fontSize:'0.875rem' }}>
              <div style={{ width:16, height:16, background:color, borderRadius:'50%', flexShrink:0 }} />
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* MODAL */}
      {modalId && (
        <div onClick={() => setModalId(null)} style={{
          position:'fixed', inset:0,
          background:'rgba(0,0,0,0.45)',
          display:'flex', alignItems:'center', justifyContent:'center',
          zIndex:100, padding:'16px',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background:'#c97d45', borderRadius:'28px',
            padding:'28px 24px 24px', width:'100%', maxWidth:'400px',
            position:'relative', boxShadow:'0 8px 32px rgba(0,0,0,0.3)',
            maxHeight:'90vh', overflowY:'auto',
          }}>
            <button onClick={() => setModalId(null)} style={{
              position:'absolute', top:'16px', right:'16px',
              background:'#a0622e', color:'white', border:'none',
              borderRadius:'50%', width:'36px', height:'36px',
              fontSize:'1rem', fontWeight:'bold', cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>✕</button>

            <h2 style={{ color:'white', textAlign:'center', fontSize:'1.5rem', fontWeight:'bold', margin:'0 0 4px' }}>
              Escritorio {modalId}
            </h2>
            <p style={{
              textAlign:'center', fontStyle:'italic', fontWeight:'bold',
              fontSize:'1.2rem', margin:'0 0 16px',
              color: ESTADO_COLOR[estadoModal],
            }}>{ESTADO_LABEL[estadoModal]}</p>

            <div style={{ background:'#e8c9a8', borderRadius:'20px', padding:'16px', marginBottom:'16px' }}>

              {/* Fecha */}
              <div style={{
                background:'white', borderRadius:'999px', textAlign:'center',
                padding:'8px 16px', fontWeight:'600', color:'#5d3a24',
                fontSize:'0.9rem', marginBottom:'12px',
              }}>{fechaStr}</div>

              {/* Datos del usuario */}
              {errorU ? (
                <div style={{ textAlign:'center', color:'#c0392b', padding:'8px', fontSize:'0.85rem' }}>{errorU}</div>
              ) : (
                <div style={{
                  background:'white', borderRadius:'16px',
                  padding:'12px 16px', marginBottom:'12px',
                  display:'flex', alignItems:'center', gap:'12px',
                }}>
                  {usuario.foto && usuario.foto !== 'null' ? (
                    <img
                      src={usuario.foto}
                      alt={usuario.nombre}
                      style={{
                        width:'56px', height:'56px', borderRadius:'50%',
                        objectFit:'cover', flexShrink:0,
                        border:'2px solid #c97d45',
                      }}
                    />
                  ) : (
                    <div style={{
                      width:'56px', height:'56px', borderRadius:'50%',
                      background:'#d4956a', flexShrink:0,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:'1.5rem',
                    }}>👤</div>
                  )}
                  <div style={{ fontSize:'0.82rem', color:'#5d3a24', lineHeight:'1.6' }}>
                    <div style={{ fontWeight:'700', fontSize:'0.9rem' }}>{usuario.nombre}</div>
                    <div>📄 Doc: {usuario.document_number}</div>
                    <div>💼 {usuario.cargo}</div>
                    <div>📍 {usuario.area_nombre}</div>
                  </div>
                </div>
              )}

              {/* Reservas del escritorio */}
              {reservasModal.length > 0 ? (
                <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                  {reservasModal.map((r, i) => (
                    <div key={i} style={{
                      background:'white', borderRadius:'12px',
                      padding:'10px 14px', display:'flex', alignItems:'center', gap:'12px',
                    }}>
                      <div style={{
                        background:'#b86e2e', borderRadius:'10px',
                        width:'40px', height:'40px', flexShrink:0,
                        display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1rem',
                      }}>🖱️</div>
                      <div>
                        <div style={{ fontWeight:'700', fontSize:'0.85rem', color:'#5d3a24' }}>
                          {r.usuario ?? r.nombre ?? r.correo}
                        </div>
                        <div style={{ fontSize:'0.8rem', color:'#7a4f2e' }}>
                          {r.horario ?? (r.horaInicio && r.horaFin ? `${r.horaInicio} a ${r.horaFin}` : '')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ textAlign:'center', color:'#7a4f2e', fontSize:'0.85rem', margin:'4px 0 0' }}>
                  Sin reservas para este día
                </p>
              )}
            </div>

            {reservaOk && (
              <div style={{
                background:'#d4edda', color:'#276b3b', borderRadius:'12px',
                padding:'10px 16px', marginBottom:'12px',
                textAlign:'center', fontWeight:'600', fontSize:'0.9rem',
              }}>✅ ¡Reserva creada con éxito!</div>
            )}
            {reservaErr && (
              <div style={{
                background:'#fde8e8', color:'#c0392b', borderRadius:'12px',
                padding:'10px 16px', marginBottom:'12px',
                textAlign:'center', fontWeight:'600', fontSize:'0.9rem',
              }}>⚠️ {reservaErr}</div>
            )}

            <button
              onClick={handleReservar}
              disabled={reservando || reservaOk || estadoModal === STATUS.OCUPADO}
              style={{
                width:'100%', padding:'14px',
                background: reservaOk ? '#99c199' : 'white',
                color: reservaOk ? 'white' : '#b86e2e',
                borderRadius:'999px', border:'none',
                fontWeight:'700', fontSize:'1rem',
                cursor: reservando || reservaOk || estadoModal === STATUS.OCUPADO ? 'not-allowed' : 'pointer',
                opacity: estadoModal === STATUS.OCUPADO ? 0.5 : 1,
                boxShadow:'0 2px 8px rgba(0,0,0,0.15)',
                transition:'background 0.2s',
              }}
            >
              {reservando ? 'Reservando…'
                : reservaOk ? '¡Reservado!'
                : estadoModal === STATUS.OCUPADO ? 'No disponible'
                : 'Reservar'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}