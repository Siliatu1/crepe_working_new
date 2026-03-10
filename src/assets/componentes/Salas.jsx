import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import mesaImg from "../mesa.png"; // misma imagen que usa Reservas

// ── Iconos ────────────────────────────────────────────────────
const IconMonitor = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <rect x="2" y="3" width="20" height="14" rx="2"/>
    <line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
  </svg>
);
const IconChair = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M6 2v8"/><path d="M18 2v8"/><path d="M4 10h16"/><path d="M6 10v10"/><path d="M18 10v10"/><path d="M9 20h6"/>
  </svg>
);
const IconArrowRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);
const IconShield = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

// ── Salas disponibles ─────────────────────────────────────────
const SALAS = [
  {
    id: 1,
    nombre: "Crepe-Working 1",
    escritorios: 6,
    monitores: 3, // Esc 1, 3, 6
    ruta: "/reservas",
    disponible: true,
  }
];

const ADMINS = ["1028783377"];

// ── SalaCard ──────────────────────────────────────────────────
const SalaCard = ({ sala, onClick }) => {
  const [hover, setHover] = React.useState(false);

  return (
    <div
      onClick={sala.disponible ? onClick : undefined}
      onMouseEnter={() => sala.disponible && setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: "clamp(200px, 26vw, 280px)",
        borderRadius: "20px",
        overflow: "hidden",
        border: `1.5px solid ${sala.disponible ? "rgba(80,54,41,0.15)" : "rgba(80,54,41,0.08)"}`,
        background: hover ? "#FFF5EE" : "#FDFAF7",
        boxShadow: hover
          ? "0 12px 32px rgba(80,54,41,0.14)"
          : "0 2px 12px rgba(80,54,41,0.07)",
        cursor: sala.disponible ? "pointer" : "default",
        transition: "all 0.25s cubic-bezier(.4,0,.2,1)",
        transform: hover ? "translateY(-4px)" : "none",
        opacity: sala.disponible ? 1 : 0.55,
        flexShrink: 0,
      }}
    >
      {/* Imagen de la sala */}
      <div style={{
        width: "100%", aspectRatio: "4/3",
        background: "rgba(80,54,41,0.05)",
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden", position: "relative",
      }}>
        <img
          src={mesaImg}
          alt={sala.nombre}
          style={{
            width: "90%", height: "90%",
            objectFit: "contain",
            filter: sala.disponible
              ? "drop-shadow(0 4px 12px rgba(80,54,41,0.18))"
              : "grayscale(0.5) opacity(0.6)",
            transition: "transform 0.3s ease",
            transform: hover ? "scale(1.06)" : "scale(1)",
          }}
        />
        {!sala.disponible && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(253,250,247,0.5)",
          }}>
            <span style={{
              background: "rgba(80,54,41,0.08)",
              border: "1px solid rgba(80,54,41,0.15)",
              color: "#92614F", fontSize: "0.72rem", fontWeight: 700,
              padding: "4px 12px", borderRadius: "20px",
              letterSpacing: "0.06em", textTransform: "uppercase",
            }}>
              Próximamente
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: "16px 18px 18px" }}>
        <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "#503629", marginBottom: "10px" }}>
          {sala.nombre}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "7px", color: "#92614F" }}>
            <IconChair />
            <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>
              {sala.escritorios} escritorios
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "7px", color: "#92614F" }}>
            <IconMonitor />
            <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>
              {sala.monitores} con monitor
            </span>
          </div>
        </div>

        {sala.disponible && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            paddingTop: "12px", borderTop: "1px solid rgba(80,54,41,0.1)",
          }}>
            <span style={{
              fontSize: "0.72rem", fontWeight: 700, color: "#7F3A14",
              background: "rgba(127,58,20,0.08)", padding: "3px 10px",
              borderRadius: "20px", letterSpacing: "0.04em",
            }}>
              Disponible hoy
            </span>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: hover ? "#7F3A14" : "rgba(127,58,20,0.1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background 0.2s",
              color: hover ? "#fff" : "#7F3A14",
            }}>
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
  const usuario  = location.state?.datosEmpleado || null;
  const esAdmin  = usuario && ADMINS.includes(String(usuario.document_number));
  const nombre   = usuario?.nombre?.split(" ")[0] ?? "allí";

  return (
    <div className="reservas-wrapper">
      <div className="reservas-inner">

        {/* ── Cuerpo ─────────────────────────────────────────── */}
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "clamp(16px, 4vw, 40px)",
          gap: "clamp(24px, 4vh, 40px)",
          overflowY: "auto",
        }}>

          {/* Título */}
          <div style={{ textAlign: "center" }}>
            <h1 style={{
              fontWeight: 800, fontSize: "clamp(1.2rem, 3vw, 1.75rem)",
              color: "#503629", margin: 0, lineHeight: 1.3,
            }}>
              {nombre},{" "}
              <span style={{ color: "#92614F", fontWeight: 600 }}>elige la sala que deseas reservar</span>
            </h1>

          </div>

          {/* Cards de salas */}
          <div style={{
            display: "flex", flexWrap: "wrap",
            gap: "clamp(14px, 3vw, 24px)",
            justifyContent: "center", alignItems: "flex-start",
          }}>
            {SALAS.map(sala => (
              <SalaCard
                key={sala.id}
                sala={sala}
                onClick={() => navigate(sala.ruta, { state: { datosEmpleado: usuario } })}
              />
            ))}
          </div>

        </div>

      </div>
    </div>
  );
}