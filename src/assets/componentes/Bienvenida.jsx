import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

// ── Iconos inline ──────────────────────────────────────────────
const IconUser = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#92614F" strokeWidth="2" strokeLinecap="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const IconCalendar = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#CC8A22" strokeWidth="2" strokeLinecap="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const IconClock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#CC8A22" strokeWidth="2" strokeLinecap="round">
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
      setFechaFormateada(fecha.toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" }));
      setHoraIngreso(fecha.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }));
    } else {
      setFechaFormateada("No disponible");
      setHoraIngreso("No disponible");
    }

    const timer = setTimeout(() => {
      navigate("/politicas", { state: { datosEmpleado } });
    }, 3500);

    return () => clearTimeout(timer);
  }, [navigate, datosEmpleado, fechaHoraIngreso]);

  return (
    <div className="page-wrapper">
      <div className="bienvenida-card">

        {/* Avatar */}
        <div className="bienvenida-avatar">
          {datosEmpleado.foto && datosEmpleado.foto !== "null" ? (
            <img src={datosEmpleado.foto} alt="Foto" className="bienvenida-foto" />
          ) : (
            <div className="bienvenida-foto-placeholder">
              <IconUser />
            </div>
          )}
        </div>

        {/* Saludo */}
        <h1 className="bienvenida-saludo">
          ¡Hola, <span className="text-accent">{datosEmpleado.nombre?.split(" ")[0]}</span>!
        </h1>
        <p className="text-muted bienvenida-sub">Bienvenido a tu espacio de trabajo</p>

        {/* Info */}
        <div className="bienvenida-info">
          <div>
            <div className="text-label">Cargo y Área</div>
            <div className="bienvenida-cargo">{datosEmpleado.cargo}</div>
            <div className="text-muted">{datosEmpleado.area_nombre}</div>
          </div>

          <div className="bienvenida-divider" />

          <div className="bienvenida-fecha-row">
            <span className="bienvenida-fecha-item">
              <IconCalendar />
              <span className="text-body">{fechaFormateada}</span>
            </span>
            <span className="bienvenida-fecha-item">
              <IconClock />
              <span className="text-body">{horaIngreso}</span>
            </span>
          </div>
        </div>

        <style>{`
          @keyframes loading { from { width: 0%; } to { width: 100%; } }
        `}</style>
      </div>
    </div>
  );
};

export default Bienvenida;
