import React, { useState, useEffect } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";

// ── Iconos ────────────────────────────────────────────────────
const IconUser = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#92614F" strokeWidth="2" strokeLinecap="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
const IconCalendar = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#CC8A22" strokeWidth="2" strokeLinecap="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const IconMonitor = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#CC8A22" strokeWidth="2" strokeLinecap="round">
    <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
  </svg>
);
const IconClock = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#CC8A22" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const IconArrowLeft = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
  </svg>
);
const IconShield = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#CC8A22" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const IconTrash = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
  </svg>
);

const ESTADO_STYLES = {
  Pendiente:  { background: "#FFF3CD", color: "#856404" },
  Confirmada: { background: "#D4EDDA", color: "#155724" },
  Cancelada:  { background: "#F8D7DA", color: "#721C24" },
};

const ESCRITORIOS = [1, 2, 3, 4, 5, 6].map(n => `Esc. ${n}`);

const Panel = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const datosEmpleado = location.state?.datosEmpleado || null;

  const [profileData,  setProfileData]  = useState(datosEmpleado);
  const [loading,      setLoading]      = useState(!datosEmpleado);
  const [error,        setError]        = useState("");
  const [reservations, setReservations] = useState([]);
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [cancelando,   setCancelando]   = useState(null); // key de la reserva en proceso

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        if (!profileData) {
          setLoading(true);
          const storedEmpleado = localStorage.getItem("empleadoData");
          const storedCedula   = localStorage.getItem("cedula");
          if (storedEmpleado) {
            setProfileData(JSON.parse(storedEmpleado));
          } else if (storedCedula) {
            const response = await axios.get(
              `https://apialohav2.crepesywaffles.com/buk/empleados3?documento=${storedCedula}`
            );
            setProfileData(response.data.data[0]);
            localStorage.setItem("empleadoData", JSON.stringify(response.data.data[0]));
          }
        }

        const stored = localStorage.getItem("reservaciones");
        setReservations(stored ? JSON.parse(stored) : [
          { key: 1, fecha: "2026-03-05", estado: "Pendiente",  escritorio: "Esc. 1", turno: "Mañana (8:00 - 12:00)" },
          { key: 2, fecha: "2026-03-03", estado: "Confirmada", escritorio: "Esc. 3", turno: "Tarde (1:00 - 5:00)"   },
          { key: 3, fecha: "2026-03-01", estado: "Cancelada",  escritorio: "Esc. 5", turno: "Mañana (8:00 - 12:00)" },
        ]);
      } catch (err) {
        console.error(err);
        setError("Error al cargar los datos del perfil");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleCancelar = async (key) => {
    setCancelando(key);
    try {
      // await axiosInstance.delete(`/api/reservas/${key}`);  ← descomentar con endpoint real
      await new Promise(r => setTimeout(r, 700)); // simula latencia
      setReservations(prev =>
        prev.map(r => r.key === key ? { ...r, estado: "Cancelada" } : r)
      );
    } catch (e) {
      console.error(e);
    } finally {
      setCancelando(null);
    }
  };

  const filtros = ["Todos", "Pendiente", "Confirmada", "Cancelada"];
  const reservasFiltradas = filtroEstado === "Todos"
    ? reservations
    : reservations.filter(r => r.estado === filtroEstado);

  if (loading) return (
    <div className="page-wrapper">
      <div className="bienvenida-card">
        <p className="text-muted" style={{ textAlign: "center" }}>Cargando información…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="page-wrapper">
      <div className="bienvenida-card">
        <p className="text-muted" style={{ color: "#c0392b", textAlign: "center" }}>{error}</p>
      </div>
    </div>
  );

  return (
    <div className="page-wrapper" style={{ alignItems: "flex-start", padding: "24px", overflowY: "auto" }}>
      <div style={{ width: "100%", maxWidth: "1020px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "20px" }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          </div>
          <button className="btn-outline reservas-btn-atras" onClick={() => navigate(-1)}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <IconArrowLeft /> Atrás
          </button>
        </div>

        {/* ── Layout ── */}
        <div style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>

          {/* Perfil */}
          <div className="bienvenida-card" style={{ width: "260px", flexShrink: 0 }}>
            <div className="bienvenida-avatar">
              {profileData?.foto && profileData.foto !== "null" ? (
                <img src={profileData.foto} alt="Foto" className="bienvenida-foto" />
              ) : (
                <div className="bienvenida-foto-placeholder"><IconUser /></div>
              )}
            </div>
            <h1 className="bienvenida-saludo">
              ¡Hola, <span className="text-accent">{profileData?.nombre?.split(" ")[0]}</span>!
            </h1>
            <div className="bienvenida-info">
              <div>
                <div className="text-label">Cargo y Área</div>
                <div className="bienvenida-cargo">{profileData?.cargo}</div>
                <div className="text-muted">{profileData?.area_nombre}</div>
              </div>
            </div>
          </div>

          {/* Reservas */}
          <div className="bienvenida-card" style={{ flex: 1, padding: "20px 24px" }}>

            {/* Título + filtros */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
              <h2 className="bienvenida-saludo" style={{ margin: 0, fontSize: "1.1rem" }}>
                Reservas <span className="text-accent">activas</span>
              </h2>
            </div>

            {/* Tabla */}
            {reservasFiltradas.length === 0 ? (
              <p className="text-muted" style={{ textAlign: "center", padding: "24px 0" }}>
                No hay reservas para este filtro.
              </p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid rgba(80,54,41,0.12)" }}>
                    {["Fecha", "Escritorio", "Turno", "Estado", ""].map(h => (
                      <th key={h} style={{
                        padding: "8px 12px", textAlign: "left",
                        fontSize: "0.7rem", fontWeight: 700,
                        color: "#92614F", textTransform: "uppercase",
                        letterSpacing: "0.06em", whiteSpace: "nowrap",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reservasFiltradas.map((r, i) => (
                    <tr key={r.key} style={{
                      borderBottom: i < reservasFiltradas.length - 1 ? "1px solid rgba(80,54,41,0.08)" : "none",
                      transition: "background 0.15s",
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(146,97,79,0.04)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      {/* Fecha */}
                      <td style={{ padding: "12px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <IconCalendar />
                          <span className="text-body" style={{ whiteSpace: "nowrap" }}>
                            {new Date(r.fecha).toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" })}
                          </span>
                        </div>
                      </td>

                      {/* Escritorio */}
                      <td style={{ padding: "12px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <IconMonitor />
                          <span className="text-body">{r.escritorio}</span>
                        </div>
                      </td>

                      {/* Turno */}
                      <td style={{ padding: "12px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <IconClock />
                          <span className="text-body" style={{ whiteSpace: "nowrap" }}>{r.turno}</span>
                        </div>
                      </td>

                      {/* Estado */}
                      <td style={{ padding: "12px 12px" }}>
                        <span style={{
                          padding: "3px 10px", borderRadius: "20px",
                          fontSize: "0.75rem", fontWeight: 600,
                          whiteSpace: "nowrap",
                          ...ESTADO_STYLES[r.estado],
                        }}>
                          {r.estado}
                        </span>
                      </td>

                      {/* Acción cancelar — solo si Pendiente */}
                      <td style={{ padding: "12px 12px", textAlign: "right" }}>
                        {r.estado === "Pendiente" && (
                          <button
                            onClick={() => handleCancelar(r.key)}
                            disabled={cancelando === r.key}
                            style={{
                              display: "inline-flex", alignItems: "center", gap: "5px",
                              padding: "4px 10px", borderRadius: "8px",
                              border: "1px solid rgba(220,53,69,0.35)",
                              background: "rgba(220,53,69,0.06)",
                              color: "#c0392b", fontSize: "0.75rem", fontWeight: 600,
                              cursor: cancelando === r.key ? "not-allowed" : "pointer",
                              opacity: cancelando === r.key ? 0.6 : 1,
                              transition: "all 0.15s",
                              fontFamily: "inherit",
                            }}
                            onMouseEnter={e => { if (cancelando !== r.key) e.currentTarget.style.background = "rgba(220,53,69,0.12)"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "rgba(220,53,69,0.06)"; }}
                          >
                            <IconTrash />
                            {cancelando === r.key ? "Cancelando…" : "Cancelar"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default Panel;