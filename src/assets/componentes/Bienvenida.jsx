import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

// Iconos integrados para mantener consistencia y evitar dependencias externas pesadas
const IconUser = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#a8a29e" strokeWidth="2" strokeLinecap="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const IconCalendar = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const IconClock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);

const Bienvenida = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const datosEmpleado = location.state?.datosEmpleado || {};
  const fechaHoraIngreso = location.state?.fechaHoraIngreso;

  const [horaIngreso, setHoraIngreso] = useState("");
  const [fechaFormateada, setFechaFormateada] = useState("");

  useEffect(() => {
    if (fechaHoraIngreso) {
      const fecha = new Date(fechaHoraIngreso);
      setFechaFormateada(fecha.toLocaleDateString('es-CO', {
        year: 'numeric', month: 'long', day: 'numeric'
      }));
      setHoraIngreso(fecha.toLocaleTimeString('es-CO', {
        hour: '2-digit', minute: '2-digit'
      }));
    } else {
      setFechaFormateada("No disponible");
      setHoraIngreso("No disponible");
    }

    const timer = setTimeout(() => {
      navigate('/politicas', { state: { datosEmpleado } });
    }, 3500);

    return () => clearTimeout(timer);
  }, [navigate, datosEmpleado, fechaHoraIngreso]);

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#F4F1ED', // Mismo fondo que el componente Reservas
      backgroundImage: 'radial-gradient(#00000010 1.5px, transparent 1.5px)',
      backgroundSize: '28px 28px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      <div style={{
        width: '340px',
        background: '#000000',
        color: '#fff',
        borderRadius: '32px',
        padding: '32px 24px',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
        border: '1px solid rgba(255,255,255,0.08)',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        
        {/* Decoración de fondo */}
        <div style={{
          position: 'absolute', top: '-20px', right: '-20px',
          width: '100px', height: '100px', borderRadius: '50%',
          background: 'rgba(249,115,22,0.1)', filter: 'blur(30px)'
        }} />

        {/* Contenedor de Foto */}
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center' }}>
          {datosEmpleado.foto && datosEmpleado.foto !== "null" ? (
            <img
              src={datosEmpleado.foto}
              alt="Foto"
              style={{
                width: '100px', height: '100px',
                borderRadius: '28px', objectFit: 'cover',
                border: '3px solid rgba(255,255,255,0.1)',
                boxShadow: '0 10px 20px rgba(0,0,0,0.3)'
              }}
            />
          ) : (
            <div style={{
              width: '100px', height: '100px',
              borderRadius: '28px', background: '#292524',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid rgba(255,255,255,0.05)'
            }}>
              <IconUser />
            </div>
          )}
        </div>

        {/* Saludo */}
        <h1 style={{
          fontSize: '1.4rem', fontWeight: '800', marginBottom: '8px',
          letterSpacing: '-0.5px', color: '#fff'
        }}>
          ¡Hola, <span style={{ color: '#f97316' }}>{datosEmpleado.nombre?.split(' ')[0]}</span>!
        </h1>
        <p style={{
          fontSize: '0.85rem', color: '#a8a29e', marginBottom: '24px', fontWeight: '500'
        }}>
          Bienvenido a tu espacio de trabajo
        </p>

        {/* Info Card */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          borderRadius: '20px',
          padding: '16px',
          border: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', flexDirection: 'column', gap: '12px'
        }}>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '0.6rem', color: '#78716c', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Cargo y Área
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#d6d3d1', marginTop: '2px' }}>
              {datosEmpleado.cargo}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#a8a29e' }}>
              {datosEmpleado.area_nombre}
            </div>
          </div>

          <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <IconCalendar />
              <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#e7e5e4' }}>{fechaFormateada}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <IconClock />
              <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#e7e5e4' }}>{horaIngreso}</span>
            </div>
          </div>
        </div>
        
        <style>
          {`
            @keyframes loading {
              from { width: 0%; }
              to { width: 100%; }
            }
          `}
        </style>

      </div>
    </div>
  );
};

export default Bienvenida;