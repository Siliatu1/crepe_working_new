import React, { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { cancelReserva, getReservasByUsuario, RESERVAS_UPDATED_EVENT } from "../../utils/reservasService";
import VerificacionAsistencia from "./VerificacionAsistencia";

const BASE         = 'https://macfer.crepesywaffles.com';
const API_RESERVAS = `${BASE}/api/working-reservas`;

// Metadatos de horarios por ID (igual que en Reservas.jsx)
const HORARIO_META = {
  1: { label: 'Mañana',      hora: '8:00 am – 12:00 m' },
  2: { label: 'Tarde',        hora: '1:00 pm – 5:00 pm' },
  3: { label: 'Día completo', hora: '8:00 am – 5:00 pm' },
};

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

const ReservaCard = ({ reserva, cancelando, onCancelar, onVerified }) => {
  const [open, setOpen] = useState(false);
  const reservaKey = reserva.key ?? reserva.id;

const getHorarioId = (r) => {
  const rel = r.attributes?.working_horarios;
  if (!rel) return null;
  if (rel.data) return rel.data.id;
  if (rel.id)   return rel.id;
  return null;
};

// ── Tarjeta mobile colapsable ─────────────────────────────────
const ReservaCard = ({ r, cancelando, onCancelar }) => {
  const [open, setOpen] = useState(false);
  const hMeta = HORARIO_META[r.horarioId];
  return (
    <div style={{
      borderRadius: "12px",
      border: "1px solid rgba(80,54,41,0.1)",
      background: "#FDFAF7",
      overflow: "hidden",
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center",
          justifyContent: "space-between", padding: "12px 14px",
          background: "none", border: "none", cursor: "pointer",
          textAlign: "left", fontFamily: "inherit",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
          <IconMonitor />
          <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#503629", whiteSpace: "nowrap" }}>
            Escritorio {r.puestoId ?? '—'}
          </span>
          <span style={{
            padding: "2px 9px", borderRadius: "20px",
            fontSize: "0.7rem", fontWeight: 600,
            background: "#D4EDDA", color: "#155724",
          }}>
            Activa
          </span>
        </div>
        <IconChevron open={open} />
      </button>

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
                {hMeta ? `${hMeta.label} · ${hMeta.hora}` : '—'}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "0.82rem", color: "#92614F" }}>👤</span>
              <span className="text-body" style={{ fontSize: "0.82rem" }}>{r.nombre}</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap" }}>
            <VerificacionAsistencia reserva={reserva} onVerified={onVerified}>
              {({ verify, loading: verifying, metadataLoading }) => (
                reserva.estado === "Pendiente" ? (
                  <button
                    onClick={() => void verify()}
                    disabled={verifying || metadataLoading}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      padding: "8px 10px",
                      borderRadius: "8px",
                      border: "1px solid rgba(21,87,36,0.24)",
                      background: "rgba(46,125,50,0.08)",
                      color: "#1f6f3a",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      cursor: verifying || metadataLoading ? "not-allowed" : "pointer",
                      opacity: verifying || metadataLoading ? 0.6 : 1,
                      fontFamily: "inherit",
                    }}
                  >
                    {verifying ? "Verificando..." : metadataLoading ? "Cargando..." : "Confirmar asistencia"}
                  </button>
                ) : null
              )}
            </VerificacionAsistencia>
            {reserva.estado === "Pendiente" && (
              <button
                onClick={() => onCancelar(reserva)}
                disabled={cancelando === reservaKey}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "1px solid rgba(220,53,69,0.3)",
                  background: "rgba(220,53,69,0.06)",
                  color: "#c0392b",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: cancelando === reservaKey ? "not-allowed" : "pointer",
                  opacity: cancelando === reservaKey ? 0.6 : 1,
                  fontFamily: "inherit",
                }}
              >
                <IconTrash />
                {cancelando === reservaKey ? "Cancelando..." : "Cancelar"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Panel principal ───────────────────────────────────────────
const Panel = () => {
  const navigate      = useNavigate();
  const location      = useLocation();
  const datosEmpleado = location.state?.datosEmpleado || null;
  const isMobile      = useMobile();

  const [profileData, setProfileData] = useState(datosEmpleado);
  const [loading, setLoading] = useState(Boolean(datosEmpleado));
  const [error, setError] = useState("");
  const [reservations, setReservations] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [cancelando,   setCancelando]   = useState(null);

  const reloadReservations = useCallback(async (empleadoRef = null) => {
    try {
      const empleado = empleadoRef || profileData;
      const cedulaUsuario = empleado?.documento || empleado?.document_number || profileData?.documento || profileData?.document_number;

      const usuario = cedulaUsuario ? await getReservasByUsuario(cedulaUsuario) : [];

      // Normalizar cada reserva a un objeto plano fácil de mostrar
      const normalizadas = data.map(r => ({
        id:       r.id,
        nombre:   r.attributes?.Nombre    ?? r.attributes?.documento ?? '—',
        foto:     r.attributes?.foto      ?? null,
        documento:r.attributes?.documento ?? '—',
        area:     r.attributes?.area      ?? '—',
        fecha:    r.attributes?.fecha_reserva ?? '—',
        estado:   r.attributes?.estado ? 'Cancelada' : 'Activa',
        puestoId: getPuestoId(r),
        horarioId:getHorarioId(r),
      }));

      setReservations(normalizadas);
    } catch (err) {
      console.error(err);
      setError("Error al cargar las reservas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!profileData) {
      return undefined;
    }

    const handleRefresh = () => {
      void reloadReservations(profileData);
    };

    const intervalId = window.setInterval(handleRefresh, 30000);

    window.addEventListener(RESERVAS_UPDATED_EVENT, handleRefresh);
    window.addEventListener("focus", handleRefresh);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener(RESERVAS_UPDATED_EVENT, handleRefresh);
      window.removeEventListener("focus", handleRefresh);
    };
  }, [profileData, reloadReservations]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const empleado = datosEmpleado;

        if (!empleado) {
          setError("No se encontraron datos del empleado. Vuelve a ingresar por la pantalla inicial.");
          return;
        }

        setProfileData(empleado);
        await reloadReservations(empleado);
      } catch (err) {
        console.error(err);
        setError("Error al cargar los datos del perfil");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [datosEmpleado, reloadReservations]);

  const handleCancelar = async (reserva) => {
    const reservaKey = reserva?.key ?? reserva?.id;
    setCancelando(reservaKey);
    try {
      await cancelReserva(reservaKey, reserva);
      await reloadReservations(profileData);
    } catch (err) {
      console.error(err);
      alert('Error al cancelar la reserva. Intenta de nuevo.');
    } finally {
      setCancelando(null);
    }
  };

  // Solo mostrar reservas activas (estado = false en Strapi = "Activa" aquí)
  const activas   = reservations.filter(r => r.estado === 'Activa');
  const canceladas = reservations.filter(r => r.estado === 'Cancelada');

  if (loading) return (
    <div className="page-wrapper">
      <div className="bienvenida-card">
        <p className="text-muted" style={{ textAlign: "center" }}>Cargando reservas…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="page-wrapper">
      <div className="bienvenida-card">
        <p style={{ color: "#c0392b", textAlign: "center" }}>{error}</p>
        <button className="btn-continuar" onClick={cargarReservas} style={{ marginTop: 12 }}>
          Reintentar
        </button>
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
        width: "100%", maxWidth: "1040px",
        margin: "0 auto", display: "flex",
        flexDirection: "column", gap: "16px",
      }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div />
          <button className="btn-outline reservas-btn-atras"
            onClick={() => navigate(-1)}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <IconArrowLeft /> Atrás
          </button>
        </div>

        {/* Layout */}
        <div style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: "16px", alignItems: "flex-start",
        }}>

          {/* Perfil */}
          <div className="bienvenida-card" style={{
            width: isMobile ? "100%" : "240px",
            flexShrink: 0, boxSizing: "border-box",
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
            {/* Resumen rápido */}
            <div style={{
              marginTop: 16, padding: "10px 14px",
              background: "rgba(80,54,41,0.05)", borderRadius: 10,
              display: "flex", flexDirection: "column", gap: 6,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                <span className="text-muted">Activas</span>
                <span style={{ fontWeight: 700, color: "#155724" }}>{activas.length}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                <span className="text-muted">Canceladas</span>
                <span style={{ fontWeight: 700, color: "#721C24" }}>{canceladas.length}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                <span className="text-muted">Total</span>
                <span style={{ fontWeight: 700, color: "#503629" }}>{reservations.length}</span>
              </div>
            </div>
          </div>

          {/* Tabla de reservas */}
          <div className="bienvenida-card" style={{
            flex: 1, padding: isMobile ? "16px" : "20px 24px",
            minWidth: 0, boxSizing: "border-box",
            width: isMobile ? "100%" : "auto",
          }}>
            <div style={{
              display: "flex", alignItems: "center",
              justifyContent: "space-between", marginBottom: "16px",
            }}>
              <h2 className="bienvenida-saludo" style={{ margin: 0, fontSize: "1.05rem" }}>
                Reservas <span className="text-accent">activas</span>
              </h2>
              <span style={{
                padding: "3px 12px", borderRadius: 20,
                background: "#D4EDDA", color: "#155724",
                fontSize: "0.75rem", fontWeight: 700,
              }}>
                {activas.length}
              </span>
            </div>

            {activas.length === 0 && (
              <p className="text-muted" style={{ fontSize: "0.85rem", textAlign: "center", padding: "24px 0" }}>
                No hay reservas activas.
              </p>
            )}

            {/* MOBILE */}
            {isMobile && activas.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {activas.map(r => (
                  <ReservaCard key={r.id} r={r} cancelando={cancelando} onCancelar={handleCancelar} />
                ))}
              </div>
            )}

            {/* DESKTOP */}
            {!isMobile && activas.length > 0 && (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid rgba(80,54,41,0.12)" }}>
                      {["Nombre", "Fecha", "Escritorio", "Turno", ""].map(h => (
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
                    {activas.map((r, i) => {
                      const hMeta = HORARIO_META[r.horarioId];
                      return (
                        <tr key={r.id}
                          style={{ borderBottom: i < activas.length - 1 ? "1px solid rgba(80,54,41,0.08)" : "none", transition: "background 0.15s" }}
                          onMouseEnter={e => e.currentTarget.style.background = "rgba(146,97,79,0.04)"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        >
                          {/* Nombre */}
                          <td style={{ padding: "12px 12px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              {r.foto && r.foto !== 'null' ? (
                                <img src={r.foto} alt={r.nombre}
                                  style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                              ) : (
                                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(80,54,41,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                  <span style={{ fontSize: 12 }}>👤</span>
                                </div>
                              )}
                            </VerificacionAsistencia>
                            {reserva.estado === "Pendiente" && (
                              <button
                                onClick={() => handleCancelar(reserva)}
                                disabled={cancelando === reservaKey}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "5px",
                                  padding: "4px 10px",
                                  borderRadius: "8px",
                                  border: "1px solid rgba(220,53,69,0.35)",
                                  background: "rgba(220,53,69,0.06)",
                                  color: "#c0392b",
                                  fontSize: "0.75rem",
                                  fontWeight: 600,
                                  cursor: cancelando === reservaKey ? "not-allowed" : "pointer",
                                  opacity: cancelando === reservaKey ? 0.6 : 1,
                                  fontFamily: "inherit",
                                }}
                              >
                                <IconTrash />
                                {cancelando === reservaKey ? "Cancelando..." : "Cancelar"}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
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