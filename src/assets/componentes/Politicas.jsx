import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const Politicas = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const datosEmpleado = location.state?.datosEmpleado || {};
  const [aceptado, setAceptado] = useState(false);

  const handleAceptar = () => {
    if (aceptado) navigate("/reservas", { state: { datosEmpleado } });
  };

  const politicas = [
    {
      titulo: "Límite de reservas",
      descripcion: (
        <>Puedes reservar <strong>máximo 2 espacios</strong> por día en horarios diferentes</>
      ),
    },
    {
      titulo: "Espacio compartido",
      descripcion: "Mantén conversaciones en voz baja y usa audífonos. Para reuniones, reserva una sala privada desde tu Outlook",
    },
    {
      titulo: "Confirmación",
      descripcion: "Si en los primeros 15 minutos no se confirma la reserva, esta será cancelada automáticamente",
    },
  ];

  return (
    <div className="page-wrapper">
      <div className="bienvenida-card">

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