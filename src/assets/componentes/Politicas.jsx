import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const Politicas = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const datosEmpleado = location.state?.datosEmpleado || {};
  const [aceptado, setAceptado] = useState(false);

  const handleAceptar = () => {
    if (aceptado) navigate("/salas", { state: { datosEmpleado } });
  };

  const politicas = [
    {
      titulo: "Límite de reservas",
      descripcion: "Solo puedes tener 1 reserva activa por día (pendiente o confirmada)"
    },
    {
      titulo: "Disponibilidad y fechas",
      descripcion: "Las reservas se habilitan en días hábiles y para las fechas permitidas por el sistema. Entre 12:00 a.m. y 5:00 a.m. no se permite reservar para pasado mañana o fechas posteriores",
    },
    {
      titulo: "Confirmación por ubicación",
      descripcion: "Debes confirmar el mismo día y dentro de los primeros 25 minutos de tu turno, estando dentro del perímetro permitido (1000 m). Si no confirmas en ese tiempo, la reserva se cancela automáticamente",
    },
    {
      titulo: "Soporte en recepción",
      descripcion: "Si tu dispositivo no permite activar la ubicación o no autorizas su uso, debes acercarte a recepción para que confirmen tu reserva",
    }
  ];

  return (
    <div className="page-wrapper">
      <div className="bienvenida-card bienvenida-card--politicas">

        {/* Encabezado */}
        <h1 className="bienvenida-saludo">
          Políticas de <span className="text-accent">reserva</span>
        </h1>
        <p className="text-muted bienvenida-sub">Lee las condiciones antes de continuar</p>

        {/* Lista de políticas */}
        <div className="bienvenida-info" style={{ gap: "0" }}>
          {politicas.map((p, i) => (
            <div key={i}>
              {i > 0 && <div className="bienvenida-divider" />}
              <div style={{ padding: "8px 0" }}>
                <div className="text-label" style={{ marginBottom: "6px" }}>
                  {p.titulo}
                </div>
                <p className="text-body" style={{ margin: 0, lineHeight: "1.55" }}>
                  {p.descripcion}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Aceptar */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px" }}>
          <input
            type="checkbox"
            id="aceptar"
            checked={aceptado}
            onChange={(e) => setAceptado(e.target.checked)}
          />
          <label htmlFor="aceptar" className="checkbox-texto text-body" style={{ cursor: "pointer" }}>
            He leído y acepto las políticas
          </label>
        </div>

        <button
          className={`btn-continuar${!aceptado ? " btn-continuar--disabled" : ""}`}
          onClick={handleAceptar}
          disabled={!aceptado}
          style={{ width: "100%", marginTop: "12px" }}
        >
          Continuar
        </button>

      </div>
    </div>
  );
};

export default Politicas;