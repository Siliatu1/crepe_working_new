import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getSession, markPoliciesAccepted } from "../../utils/sessionFlow";

const Politicas = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const session = getSession();
  const datosEmpleado = location.state?.datosEmpleado || session?.datosEmpleado || {};
  const [aceptado, setAceptado] = useState(false);

  const handleAceptar = () => {
    if (aceptado) {
      markPoliciesAccepted();
      navigate("/salas", { state: { datosEmpleado }, replace: true });
    }
  };

  const politicas = [
    {
      titulo: "Una reserva por día",
      descripcion: "Solo se permite 1 reserva activa por día (pendiente o confirmada)",
    },
    {
      titulo: "Rotación de puesto",
      descripcion: <mark class="resaltado">No puedes usar el mismo puesto en días consecutivos</mark>,
    },
    {
      titulo: "Horarios de reserva",
      descripcion: "Las reservas están habilitadas en días hábiles",
    },
    {
      titulo: "Confirmación en 15 minutos",
      descripcion: "Debes confirmar el mismo día dentro de los primeros 15 minutos de tu turno, desde una ubicación dentro del perímetro permitido (1000 m)",
    },
    {
      titulo: "Sin GPS disponible",
      descripcion: "Si tu dispositivo no permite activar la ubicación, acude a recepción para confirmar tu reserva",
    }
  ];

  return (
    <div className="page-wrapper">
      <div className="bienvenida-card bienvenida-card--politicas">

        {/* Encabezado */}
        <h1 className="bienvenida-saludo">Políticas de reserva</h1>
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