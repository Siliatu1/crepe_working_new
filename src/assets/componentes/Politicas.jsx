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

  const handleCancelar = () => navigate("/");

  return (
    <div className="page-wrapper">
      <div className="politicas-card">

        <div className="politicas-header">
          <h1 className="politicas-titulo">Políticas de reserva</h1>
          <p className="politicas-subtitulo">Lee las condiciones antes de continuar</p>
        </div>

        <div className="politicas-content">

          {/* Disponibilidad */}
          <div className="seccion">
            <div className="seccion-header">
              <span className="icono">🟢</span>
              <h2>Disponibilidad de salas</h2>
            </div>
            <div className="seccion-contenido">
              <div className="item-disponibilidad">
                <span className="indicador verde">●</span>
                <span className="texto-disponibilidad"><strong>Verde</strong> — Disponibilidad completa (medio turno o turno completo).</span>
              </div>
              <div className="item-disponibilidad">
                <span className="indicador amarillo">●</span>
                <span className="texto-disponibilidad"><strong>Amarillo</strong> — Disponibilidad limitada (un turno).</span>
              </div>
              <div className="item-disponibilidad">
                <span className="indicador rojo">●</span>
                <span className="texto-disponibilidad"><strong>Rojo</strong> — Sin disponibilidad. Busca otro espacio.</span>
              </div>
            </div>
          </div>

          {/* Turnos */}
          <div className="seccion">
            <div className="seccion-header">
              <span className="icono">🕐</span>
              <h2>Turnos disponibles</h2>
            </div>
            <div className="seccion-contenido">
              <div className="item-turno">
                <span className="punto">●</span>
                <span className="texto-turno"><strong>Turno completo</strong> — Todo el día.</span>
              </div>
              <div className="item-turno">
                <span className="punto">●</span>
                <span className="texto-turno"><strong>Medio turno AM</strong> — 8:00 a.m. a 1:00 p.m.</span>
              </div>
              <div className="item-turno">
                <span className="punto">●</span>
                <span className="texto-turno"><strong>Medio turno PM</strong> — 1:00 p.m. a 5:00 p.m.</span>
              </div>
            </div>
          </div>

          {/* Límite */}
          <div className="seccion">
            <div className="seccion-header">
              <span className="icono">📋</span>
              <h2>Límite de reservas</h2>
            </div>
            <div className="seccion-contenido">
              <div className="item-limite">
                <span className="punto">●</span>
                <span className="texto-limite"><strong>Máximo 2 espacios</strong> por usuario en horarios diferentes.</span>
              </div>
            </div>
          </div>

          {/* Espacio compartido */}
          <div className="seccion">
            <div className="seccion-header">
              <span className="icono">🤝</span>
              <h2>Espacio compartido</h2>
            </div>
            <div className="seccion-contenido">
              <div className="item-compartido">
                <span className="punto">●</span>
                <span className="texto-compartido"><strong>Volumen bajo</strong> — Mantén conversaciones en voz baja y usa audífonos.</span>
              </div>
              <div className="item-compartido">
                <span className="punto">●</span>
                <span className="texto-compartido"><strong>Reuniones</strong> — Reserva una sala privada desde tu Outlook.</span>
              </div>
              <div className="item-compartido">
                <span className="punto">●</span>
                <span className="texto-compartido"><strong>Nota:</strong> Si al pasar 15 minutos no se confirma la reserva, esta será cancelada.</span>
              </div>
            </div>
          </div>

        </div>

        <div className="politicas-footer">
          <label className="checkbox-container">
            <input
              type="checkbox"
              checked={aceptado}
              onChange={(e) => setAceptado(e.target.checked)}
            />
            <span className="checkbox-texto">
              He leído y acepto las <span className="enlace-politicas">políticas</span> de uso de los espacios.
            </span>
          </label>

          <div className="botones-container" style={{ marginTop: "16px" }}>
            <button className="btn-cancelar" onClick={handleCancelar}>Cancelar</button>
            <button
              className={`btn-continuar${!aceptado ? " btn-continuar--disabled" : ""}`}
              onClick={handleAceptar}
              disabled={!aceptado}
            >
              Continuar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Politicas;
