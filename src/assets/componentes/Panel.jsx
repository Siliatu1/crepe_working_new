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
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
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
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#CC8A22" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

const ESTADO_STYLES = {
  Pendiente:  { background: "#FFF3CD", color: "#856404" },
  Confirmada: { background: "#D4EDDA", color: "#155724" },
  Cancelada:  { background: "#F8D7DA", color: "#721C24" },
};

const Panel = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const datosEmpleado = location.state?.datosEmpleado || null;

  const [profileData,   setProfileData]   = useState(datosEmpleado);
  const [loading,       setLoading]       = useState(!datosEmpleado);
  const [error,         setError]         = useState("");
  const [reservations,  setReservations]  = useState([]);
  const [filtroEstado,  setFiltroEstado]  = useState("Todos");

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
            const empleado = response.data.data[0];
            setProfileData(empleado);
            localStorage.setItem("empleadoData", JSON.stringify(empleado));
          }
        }

        const storedReservations = localStorage.getItem("reservaciones");
        if (storedReservations) {
          setReservations(JSON.parse(storedReservations));
        } else {
          setReservations([
            { key: 1, fecha: "2026-03-05", estado: "Pendiente",  escritorio: "A-101", turno: "Mañana (8:00 - 14:00)" },
            { key: 2, fecha: "2026-03-03", estado: "Confirmada", escritorio: "B-205", turno: "Tarde (14:00 - 20:00)" },
            { key: 3, fecha: "2026-03-01", estado: "Cancelada",  escritorio: "C-310", turno: "Mañana (8:00 - 14:00)" },
          ]);
        }
      } catch (err) {
        console.error(err);
        setError("Error al cargar los datos del perfil");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const filtros = ["Todos", "Pendiente", "Confirmada", "Cancelada"];
  const reservasFiltradas = filtroEstado === "Todos"
    ? reservations
    : reservations.filter(r => r.estado === filtroEstado);

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="bienvenida-card">
          <p className="text-muted">Cargando información…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-wrapper">
        <div className="bienvenida-card">
          <p className="text-muted" style={{ color: "#c0392b" }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper" style={{ alignItems: "flex-start", padding: "24px" }}>
        <div style={{ width: "100%", maxWidth: "960px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "20px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <IconShield />
            <h1 className="bienvenida-saludo" style={{ margin: 0, fontSize: "1.4rem" }}>
              Panel <span className="text-accent">Admin</span>
            </h1>
          </div>
          <button
            className="btn-outline reservas-btn-atras"
            onClick={() => navigate(-1)}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <IconArrowLeft /> Atrás
          </button>
        </div>

        {/* Layout: perfil izq + reservas der */}
        <div style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>

          {/* Perfil — igual que Bienvenida */}
          <div className="bienvenida-card" style={{ width: "280px", flexShrink: 0 }}>

            {/* Badge admin */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "12px" }}>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: "5px",
                background: "rgba(127,58,20,0.1)", color: "#7F3A14",
                border: "1px solid rgba(127,58,20,0.25)",
                borderRadius: "20px", padding: "3px 12px",
                fontSize: "0.72rem", fontWeight: "700", letterSpacing: "0.05em", textTransform: "uppercase"
              }}>
                <IconShield /> Administrador
              </span>
            </div>

            {/* Avatar */}
            <div className="bienvenida-avatar">
              {profileData?.foto && profileData.foto !== "null" ? (
                <img src={profileData.foto} alt="Foto" className="bienvenida-foto" />
              ) : (
                <div className="bienvenida-foto-placeholder"><IconUser /></div>
              )}
            </div>

            {/* Nombre */}
            <h1 className="bienvenida-saludo">
              <span className="text-accent">{profileData?.nombre?.split(" ")[0]}</span>
            </h1>
            <p className="text-muted bienvenida-sub">{profileData?.nombre}</p>

            {/* Info */}
            <div className="bienvenida-info">
              <div>
                <div className="text-label">Cargo y Área</div>
                <div className="bienvenida-cargo">{profileData?.cargo}</div>
                <div className="text-muted">{profileData?.area_nombre}</div>
              </div>
              <div className="bienvenida-divider" />
              <div>
                <div className="text-label">Cédula</div>
                <div className="text-body">{profileData?.documento || profileData?.document_number || "N/A"}</div>
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
              <div style={{ display: "flex", gap: "6px" }}>
                {filtros.map(f => (
                  <button
                    key={f}
                    onClick={() => setFiltroEstado(f)}
                    className={filtroEstado === f ? "btn-continuar" : "btn-outline reservas-btn-atras"}
                    style={{ padding: "4px 12px", fontSize: "0.78rem" }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Filas */}
            {reservasFiltradas.length === 0 ? (
              <p className="text-muted" style={{ textAlign: "center", padding: "20px 0" }}>No hay reservas para este filtro.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {reservasFiltradas.map(r => (
                  <div key={r.key} className="bienvenida-info" style={{ flexDirection: "row", alignItems: "center", padding: "12px 16px", gap: "16px", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: "140px" }}>
                      <IconCalendar />
                      <span className="text-body">
                        {new Date(r.fecha).toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" })}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: "90px" }}>
                      <IconMonitor />
                      <span className="text-body">{r.escritorio}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1 }}>
                      <IconClock />
                      <span className="text-body">{r.turno}</span>
                    </div>
                    <span style={{
                      padding: "3px 10px", borderRadius: "20px",
                      fontSize: "0.78rem", fontWeight: "600",
                      ...ESTADO_STYLES[r.estado],
                    }}>
                      {r.estado}
                    </span>
                  </div>
                ))}
              </div>
            )}

          </div>

        </div>
      </div>
    </div>
  );
};

export default Panel;