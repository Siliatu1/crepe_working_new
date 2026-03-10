import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";

// ── Iconos ────────────────────────────────────────────────────
const IconUser = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#92614F" strokeWidth="2" strokeLinecap="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
const IconCalendar = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#CC8A22" strokeWidth="2" strokeLinecap="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const IconMonitor = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#CC8A22" strokeWidth="2" strokeLinecap="round">
    <rect x="2" y="3" width="20" height="14" rx="2"/>
    <line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
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
const IconTrash = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
  </svg>
);
const IconChevron = ({ open }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
    style={{ transition: 'transform 0.25s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

// ── Estilos badge de estado ───────────────────────────────────
const ESTADO_STYLES = {
  Pendiente:  { background: "#FFF3CD", color: "#856404" },
  Confirmada: { background: "#D4EDDA", color: "#155724" },
  Cancelada:  { background: "#F8D7DA", color: "#721C24" },
};

const TURNO_LABELS = {
  manana:   "Mañana (8:00 – 12:00)",
  tarde:    "Tarde (1:00 – 5:00)",
  completo: "Día completo",
};

// ── Hook breakpoint ───────────────────────────────────────────
const useMobile = () => {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return mobile;
};

// ── Tarjeta de reserva (mobile) ───────────────────────────────
const ReservaCard = ({ r, cancelando, onCancelar }) => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      borderRadius: "12px",
      border: "1px solid rgba(80,54,41,0.1)",
      background: "#FDFAF7",
      overflow: "hidden",
      transition: "box-shadow 0.2s",
    }}>
      {/* Cabecera de la card */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center",
          justifyContent: "space-between", padding: "12px 14px",
          background: "none", border: "none", cursor: "pointer", textAlign: "left",
          fontFamily: "inherit",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
          <IconMonitor />
          <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#503629", whiteSpace: "nowrap" }}>
            {r.escritorio}
          </span>
          <span style={{
            padding: "2px 9px", borderRadius: "20px",
            fontSize: "0.7rem", fontWeight: 600,
            ...ESTADO_STYLES[r.estado],
          }}>
            {r.estado}
          </span>
        </div>
        <IconChevron open={open} />
      </button>

      {/* Detalle colapsable */}
      {open && (
        <div style={{ padding: "0 14px 14px", borderTop: "1px solid rgba(80,54,41,0.08)", paddingTop: "12px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <IconCalendar />
              <span className="text-body" style={{ fontSize: "0.82rem" }}>
                {new Date(r.fecha + "T12:00:00").toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" })}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <IconClock />
              <span className="text-body" style={{ fontSize: "0.82rem" }}>
                {TURNO_LABELS[r.turno] || r.turno}
              </span>
            </div>
          </div>
          {r.estado === "Pendiente" && (
            <button
              onClick={() => onCancelar(r.key)}
              disabled={cancelando === r.key}
              style={{
                marginTop: "12px", width: "100%",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                padding: "8px", borderRadius: "8px",
                border: "1px solid rgba(220,53,69,0.3)",
                background: "rgba(220,53,69,0.06)",
                color: "#c0392b", fontSize: "0.8rem", fontWeight: 600,
                cursor: cancelando === r.key ? "not-allowed" : "pointer",
                opacity: cancelando === r.key ? 0.6 : 1,
                fontFamily: "inherit", transition: "all 0.15s",
              }}
            >
              <IconTrash />
              {cancelando === r.key ? "Cancelando…" : "Cancelar reserva"}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ── Componente principal ──────────────────────────────────────
const Panel = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const datosEmpleado = location.state?.datosEmpleado || null;
  const isMobile = useMobile();

  const [profileData,  setProfileData]  = useState(datosEmpleado);
  const [loading,      setLoading]      = useState(!datosEmpleado);
  const [error,        setError]        = useState("");
  const [reservations, setReservations] = useState([]);
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [cancelando,   setCancelando]   = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        if (!profileData) {
          setLoading(true);
          const storedCedula = sessionStorage.getItem("cw_empleado");
          if (storedCedula) {
            const parsed = JSON.parse(storedCedula);
            setProfileData(parsed);
          }
        }
        // Datos de prueba hasta que exista el endpoint
        setReservations([
          { key: 1, fecha: "2026-03-10", estado: "Pendiente",  escritorio: "Esc. 1", turno: "manana"   },
          { key: 2, fecha: "2026-03-09", estado: "Confirmada", escritorio: "Esc. 3", turno: "tarde"    },
          { key: 3, fecha: "2026-03-08", estado: "Cancelada",  escritorio: "Esc. 5", turno: "completo" },
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
      // await axiosInstance.delete(`/api/reservas/${key}`); // ← descomentar con endpoint real
      await new Promise(r => setTimeout(r, 700));
      setReservations(prev =>
        prev.map(r => r.key === key ? { ...r, estado: "Cancelada" } : r)
      );
    } catch (e) {
      console.error(e);
    } finally {
      setCancelando(null);
    }
  };

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
        <p style={{ color: "#c0392b", textAlign: "center" }}>{error}</p>
      </div>
    </div>
  );

  return (
    <div className="page-wrapper" style={{
      alignItems: "flex-start",
      overflowY: "auto",
      padding: isMobile ? "16px" : "28px 24px",
    }}>
      <div style={{
        width: "100%",
        maxWidth: "1040px",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}>

        {/* ── Header ─────────────────────────────────────────── */}
        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: "space-between", gap: "12px",
        }}>
          <div></div>
          <button
            className="btn-outline reservas-btn-atras"
            onClick={() => navigate(-1)}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <IconArrowLeft /> Atrás
          </button>
        </div>

        {/* ── Layout: columnas en desktop, stack en mobile ──── */}
        <div style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: "16px",
          alignItems: "flex-start",
        }}>

          {/* ── Perfil ─────────────────────────────────────── */}
          <div className="bienvenida-card" style={{
            width: isMobile ? "100%" : "240px",
            flexShrink: 0,
            boxSizing: "border-box",
          }}>
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

          {/* ── Tabla de reservas ──────────────────────────── */}
          <div className="bienvenida-card" style={{
            flex: 1,
            padding: isMobile ? "16px" : "20px 24px",
            minWidth: 0,
            boxSizing: "border-box",
            width: isMobile ? "100%" : "auto",
          }}>

            {/* Título + filtros */}
            <div style={{
              display: "flex",
              alignItems: isMobile ? "flex-start" : "center",
              justifyContent: "space-between",
              flexDirection: isMobile ? "column" : "row",
              marginBottom: "16px",
              gap: "12px",
            }}>
              <h2 className="bienvenida-saludo" style={{ margin: 0, fontSize: "1.05rem" }}>
                Reservas <span className="text-accent">activas</span>
              </h2>
            </div>

            {/* MOBILE: cards colapsables */}
            {isMobile && reservasFiltradas.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {reservasFiltradas.map(r => (
                  <ReservaCard key={r.key} r={r} cancelando={cancelando} onCancelar={handleCancelar} />
                ))}
              </div>
            )}

            {/* DESKTOP: tabla */}
            {!isMobile && reservasFiltradas.length > 0 && (
              <div style={{ overflowX: "auto" }}>
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
                      <tr key={r.key}
                        style={{ borderBottom: i < reservasFiltradas.length - 1 ? "1px solid rgba(80,54,41,0.08)" : "none", transition: "background 0.15s" }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(146,97,79,0.04)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <td style={{ padding: "12px 12px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <IconCalendar />
                            <span className="text-body" style={{ whiteSpace: "nowrap" }}>
                              {new Date(r.fecha + "T12:00:00").toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" })}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: "12px 12px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <IconMonitor />
                            <span className="text-body">{r.escritorio}</span>
                          </div>
                        </td>
                        <td style={{ padding: "12px 12px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <IconClock />
                            <span className="text-body" style={{ whiteSpace: "nowrap" }}>
                              {TURNO_LABELS[r.turno] || r.turno}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: "12px 12px" }}>
                          <span style={{
                            padding: "3px 10px", borderRadius: "20px",
                            fontSize: "0.75rem", fontWeight: 600, whiteSpace: "nowrap",
                            ...ESTADO_STYLES[r.estado],
                          }}>
                            {r.estado}
                          </span>
                        </td>
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
                                transition: "all 0.15s", fontFamily: "inherit",
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
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default Panel;