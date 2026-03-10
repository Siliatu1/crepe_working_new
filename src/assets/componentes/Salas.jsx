import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import mesaImg from "../mesa.png";

// ── Iconos ────────────────────────────────────────────────────
const IconMonitor = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <rect x="2" y="3" width="20" height="14" rx="2"/>
    <line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
  </svg>
);
const IconChair = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M6 2v8"/><path d="M18 2v8"/><path d="M4 10h16"/>
    <path d="M6 10v10"/><path d="M18 10v10"/><path d="M9 20h6"/>
  </svg>
);
const IconArrowRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);

// ── Salas disponibles ─────────────────────────────────────────
const SALAS = [
  {
    id: 1,
    nombre: "Crepe-Working 1",
    escritorios: 6,
    monitores: 3,
    ruta: "/reservas",
    disponible: true,
  },
];

const ADMINS = ["1028783377"];

// ── SalaCard ──────────────────────────────────────────────────
const SalaCard = ({ sala, onClick }) => {
  const [hover, setHover] = React.useState(false);

  return (
    <div
      className={`salas-card${hover && sala.disponible ? " salas-card--hover" : ""}${!sala.disponible ? " salas-card--disabled" : ""}`}
      onClick={sala.disponible ? onClick : undefined}
      onMouseEnter={() => sala.disponible && setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Imagen */}
      <div className="salas-card-img-wrapper">
        <img
          src={mesaImg}
          alt={sala.nombre}
          className={`salas-card-img${hover && sala.disponible ? " salas-card-img--hover" : ""}${!sala.disponible ? " salas-card-img--disabled" : ""}`}
        />
        {!sala.disponible && (
          <div className="salas-card-overlay">
            <span className="salas-card-badge-pronto text-label">Próximamente</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="salas-card-body">
        <div className="salas-card-nombre">{sala.nombre}</div>

        <div className="bienvenida-divider" style={{ margin: "10px 0" }} />

        <div className="salas-card-features">
          <div className="salas-card-feature">
            <IconChair />
            <span className="text-muted">{sala.escritorios} escritorios</span>
          </div>
          <div className="salas-card-feature">
            <IconMonitor />
            <span className="text-muted">{sala.monitores} con monitor</span>
          </div>
        </div>

        {sala.disponible && (
          <div className="salas-card-footer">
            <span className="salas-card-disponible">Disponible hoy</span>
            <div className={`salas-card-arrow-btn${hover ? " salas-card-arrow-btn--hover" : ""}`}>
              <IconArrowRight />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Componente principal ──────────────────────────────────────
export default function Salas() {
  const navigate = useNavigate();
  const location = useLocation();
  const usuario = location.state?.datosEmpleado || null;
  const nombre  = usuario?.nombre?.split(" ")[0] ?? "allí";

  return (
    <div className="page-wrapper">
      <div className="bienvenida-card salas-card-container">

        {/* Encabezado — mismo patrón que Bienvenida y Politicas */}
        <h1 className="bienvenida-saludo">
          Hola, <span className="text-accent">{nombre}</span>
        </h1>
        <p className="text-muted bienvenida-sub">
          Elige la sala que deseas reservar
        </p>

        {/* Grid de salas */}
        <div className="salas-grid">
          {SALAS.map((sala) => (
            <SalaCard
              key={sala.id}
              sala={sala}
              onClick={() =>
                navigate(sala.ruta, { state: { datosEmpleado: usuario } })
              }
            />
          ))}
        </div>

      </div>
    </div>
  );
}