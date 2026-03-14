import React, { useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { User, Calendar, Clock } from "lucide-react";

const Bienvenida = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const datosEmpleado = useMemo(() => location.state?.datosEmpleado ?? {}, [location.state?.datosEmpleado]);
  const fechaHoraIngreso = location.state?.fechaHoraIngreso;

  const { horaIngreso, fechaFormateada } = useMemo(() => {
    if (!fechaHoraIngreso) {
      return {
        fechaFormateada: "No disponible",
        horaIngreso: "No disponible",
      };
    }

    const fecha = new Date(fechaHoraIngreso);
    return {
      fechaFormateada: fecha.toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" }),
      horaIngreso: fecha.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }),
    };
  }, [fechaHoraIngreso]);

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/politicas", { state: { datosEmpleado } });
    }, 3500);

    return () => clearTimeout(timer);
  }, [navigate, datosEmpleado]);

  return (
    <div className="page-wrapper">
      <div className="bienvenida-card">

        {/* Foto */}
        <div className="bienvenida-avatar">
          {datosEmpleado.foto && datosEmpleado.foto !== "null" ? (
            <img src={datosEmpleado.foto} alt="Foto" className="bienvenida-foto" />
          ) : (
            <div className="bienvenida-foto-placeholder">
              <User size={32} color="#92614F" strokeWidth={2} />
            </div>
          )}
        </div>

        {/* Saludo */}
        <h1 className="bienvenida-saludo">¡Hola, {datosEmpleado.nombre?.split(" ")[0]}!</h1>
        <p className="text-muted bienvenida-sub">Bienvenido a tu espacio de trabajo</p>

        {/* Información */}
        <div className="bienvenida-info">
          <div>
            <div className="text-label">Cargo y Área</div>
            <div className="bienvenida-cargo">{datosEmpleado.cargo}</div>
            <div className="text-muted">{datosEmpleado.area_nombre}</div>
          </div>

          <div className="bienvenida-divider" />

          <div className="bienvenida-fecha-row">
            <span className="bienvenida-fecha-item">
              <Calendar size={16} color="#CC8A22" strokeWidth={2} />
              <span className="text-body">{fechaFormateada}</span>
            </span>
            <span className="bienvenida-fecha-item">
              <Clock size={16} color="#CC8A22" strokeWidth={2} />
              <span className="text-body">{horaIngreso}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Bienvenida;