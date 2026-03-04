import React from "react";
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { BsPersonCircle, BsCalendar3, BsClock } from "react-icons/bs";

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
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      }));
    } else {
      setFechaFormateada("No disponible");
      setHoraIngreso("No disponible");
    }

    const timer = setTimeout(() => {
      // ── Pasa datosEmpleado a Politicas ──
      navigate('/politicas', { state: { datosEmpleado } });
    }, 351100);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="bienvenida-card">
      <div className="foto-container">
        {datosEmpleado.foto && datosEmpleado.foto !== "null" ? (
          <img
            src={datosEmpleado.foto}
            alt="Foto"
            className="foto-empleado"
          />
        ) : (
          <div className="foto-placeholder">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="icon-user"
            >
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </div>
        )}
      </div>

      <h1 className="bienvenida-titulo">
        ¡Hola, {datosEmpleado.nombre}!<br />Reserva tu escritorio
      </h1>

      <div className="info-empleado">
        <BsPersonCircle className="info-icon" />
        <span className="info-label">Documento:</span>
        <span className="info-value">{datosEmpleado.document_number}</span>

        <BsPersonCircle className="info-icon" />
        <span className="info-label">Cargo:</span>
        <span className="info-value">{datosEmpleado.cargo}</span>

        <BsPersonCircle className="info-icon" />
        <span className="info-label">Área:</span>
        <span className="info-value">{datosEmpleado.area_nombre}</span>

        <BsCalendar3 className="info-icon" />
        <span className="info-label">Fecha:</span>
        <span className="info-value">{fechaFormateada}</span>

        <BsClock className="info-icon" />
        <span className="info-label">Hora:</span>
        <span className="info-value">{horaIngreso}</span>
      </div>
    </div>
  );
};

export default Bienvenida;