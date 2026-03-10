import React, { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { cancelReserva, getReservasByUsuario, RESERVAS_UPDATED_EVENT } from "../../utils/reservasService";
import VerificacionAsistencia from "./VerificacionAsistencia";

const ESTADO_STYLES = {
  Pendiente: { background: "#FFF3CD", color: "#856404" },
  Confirmada: { background: "#D4EDDA", color: "#155724" },
  Cancelada: { background: "#F8D7DA", color: "#721C24" },
};

const TURNO_LABELS = {
  manana: "Mañana (8:00 - 12:00)",
  tarde: "Tarde (1:00 - 5:00)",
  completo: "Día completo",
};

const IconUser = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#92614F" strokeWidth="2" strokeLinecap="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const IconCalendar = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#CC8A22" strokeWidth="2" strokeLinecap="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const IconMonitor = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#CC8A22" strokeWidth="2" strokeLinecap="round">
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

const IconClock = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#CC8A22" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const IconArrowLeft = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const IconTrash = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M9 6V4h6v2" />
  </svg>
);

const IconChevron = ({ open }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    style={{ transition: "transform 0.25s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const useMobile = () => {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return mobile;
};

const getDeskLabel = (reserva) => reserva.escritorio || `Escritorio ${reserva.escritorioId || ""}`.trim() || "Sin escritorio";

const getShiftLabel = (reserva) => {
  if (TURNO_LABELS[reserva.turno]) {
    return TURNO_LABELS[reserva.turno];
  }

  if (reserva.horario) {
    return reserva.horario;
  }

  if (reserva.horaInicio && reserva.horaFin) {
    return `${reserva.horaInicio} - ${reserva.horaFin}`;
  }

  return "N/A";
};

const ReservaCard = ({ reserva, cancelando, onCancelar, onVerified }) => {
  const [open, setOpen] = useState(false);
  const reservaKey = reserva.key ?? reserva.id;

  return (
    <div
      style={{
        borderRadius: "12px",
        border: "1px solid rgba(80,54,41,0.1)",
        background: "#FDFAF7",
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => setOpen((value) => !value)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 14px",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          fontFamily: "inherit",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
          <IconMonitor />
          <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#503629", whiteSpace: "nowrap" }}>
            {getDeskLabel(reserva)}
          </span>
          <span
            style={{
              padding: "2px 9px",
              borderRadius: "20px",
              fontSize: "0.7rem",
              fontWeight: 600,
              ...(ESTADO_STYLES[reserva.estado] || { background: "#EEE", color: "#555" }),
            }}
          >
            {reserva.estado}
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
                {reserva.fecha
                  ? new Date(`${reserva.fecha}T12:00:00`).toLocaleDateString("es-CO", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })
                  : "N/A"}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <IconClock />
              <span className="text-body" style={{ fontSize: "0.82rem" }}>
                {getShiftLabel(reserva)}
              </span>
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

const Panel = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const datosEmpleado = location.state?.datosEmpleado || null;
  const isMobile = useMobile();

  const [profileData, setProfileData] = useState(datosEmpleado);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reservations, setReservations] = useState([]);
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [cancelando, setCancelando] = useState(null);

  const reloadReservations = useCallback(async (empleadoRef = null) => {
    try {
      const empleado = empleadoRef || profileData;
      const cedulaUsuario = empleado?.documento || empleado?.document_number || profileData?.documento || profileData?.document_number;

      if (!cedulaUsuario) {
        setReservations([]);
        return;
      }

      const usuario = await getReservasByUsuario(cedulaUsuario);
      setReservations(usuario);
      setError("");
    } catch (err) {
      console.error("Error al recargar reservas:", err);
      setReservations([]);
      setError("Error al cargar las reservas.");
    }
  }, [profileData]);

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

    void fetchProfile();
  }, [datosEmpleado, reloadReservations]);

  const handleCancelar = async (reserva) => {
    const reservaKey = reserva?.key ?? reserva?.id;
    setCancelando(reservaKey);

    try {
      await cancelReserva(reservaKey, reserva);
      await reloadReservations(profileData);
    } catch (err) {
      console.error(err);
      setError("Error al cancelar la reserva.");
    } finally {
      setCancelando(null);
    }
  };

  const filtros = ["Todos", "Pendiente", "Confirmada", "Cancelada"];
  const reservasFiltradas =
    filtroEstado === "Todos" ? reservations : reservations.filter((reserva) => reserva.estado === filtroEstado);

  const totalPendientes = reservations.filter((reserva) => reserva.estado === "Pendiente").length;
  const totalConfirmadas = reservations.filter((reserva) => reserva.estado === "Confirmada").length;
  const totalCanceladas = reservations.filter((reserva) => reserva.estado === "Cancelada").length;

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="bienvenida-card">
          <p className="text-muted" style={{ textAlign: "center" }}>Cargando reservas...</p>
        </div>
      </div>
    );
  }

  if (error && !profileData) {
    return (
      <div className="page-wrapper">
        <div className="bienvenida-card">
          <p className="text-muted" style={{ color: "#c0392b", textAlign: "center" }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper" style={{ alignItems: "flex-start", padding: isMobile ? "16px" : "24px" }}>
      <div style={{ width: "100%", maxWidth: "980px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
          <h1 className="bienvenida-saludo" style={{ margin: 0, fontSize: "1.35rem" }}>
            Mi <span className="text-accent">Panel</span>
          </h1>
          <button
            className="btn-outline reservas-btn-atras"
            onClick={() => navigate(-1)}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <IconArrowLeft /> Atras
          </button>
        </div>

        {error && (
          <div className="bienvenida-card" style={{ padding: "12px 16px", color: "#c0392b" }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: "16px", alignItems: "flex-start" }}>
          <div className="bienvenida-card" style={{ width: isMobile ? "100%" : "280px", flexShrink: 0 }}>
            <div className="bienvenida-avatar">
              {profileData?.foto && profileData.foto !== "null" ? (
                <img src={profileData.foto} alt="Foto" className="bienvenida-foto" />
              ) : (
                <div className="bienvenida-foto-placeholder">
                  <IconUser />
                </div>
              )}
            </div>

            <h2 className="bienvenida-saludo" style={{ marginTop: "10px" }}>
              Hola, <span className="text-accent">{profileData?.nombre?.split(" ")?.[0] || "Empleado"}</span>
            </h2>

            <div className="bienvenida-info">
              <div>
                <div className="text-label">Cargo y Area</div>
                <div className="bienvenida-cargo">{profileData?.cargo || "N/A"}</div>
                <div className="text-muted">{profileData?.area_nombre || "N/A"}</div>
              </div>
              <div className="bienvenida-divider" />
              <div>
                <div className="text-label">Cedula</div>
                <div className="text-body">{profileData?.documento || profileData?.document_number || "N/A"}</div>
              </div>
              <div className="bienvenida-divider" />
              <div>
                <div className="text-label">Resumen</div>
                <div className="text-body">Pendientes: {totalPendientes}</div>
                <div className="text-body">Confirmadas: {totalConfirmadas}</div>
                <div className="text-body">Canceladas: {totalCanceladas}</div>
              </div>
            </div>

            <button
              className="btn-continuar"
              style={{ width: "100%", marginTop: "12px" }}
              onClick={() => navigate("/reservas", { state: { datosEmpleado: profileData } })}
            >
              Nueva Reserva
            </button>
          </div>

          <div className="bienvenida-card" style={{ flex: 1, width: "100%", minWidth: 0, padding: isMobile ? "16px" : "20px 24px" }}>
            <div
              style={{
                display: "flex",
                alignItems: isMobile ? "flex-start" : "center",
                justifyContent: "space-between",
                flexDirection: isMobile ? "column" : "row",
                marginBottom: "16px",
                gap: "10px",
              }}
            >
              <h2 className="bienvenida-saludo" style={{ margin: 0, fontSize: "1.1rem" }}>
                Mis <span className="text-accent">reservas</span>
              </h2>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {filtros.map((filtro) => (
                  <button
                    key={filtro}
                    onClick={() => setFiltroEstado(filtro)}
                    className={filtroEstado === filtro ? "btn-continuar" : "btn-outline reservas-btn-atras"}
                    style={{ padding: "4px 12px", fontSize: "0.78rem" }}
                  >
                    {filtro}
                  </button>
                ))}
              </div>
            </div>

            {reservasFiltradas.length === 0 && (
              <p className="text-muted" style={{ textAlign: "center", padding: "20px 0" }}>
                No hay reservas para este filtro.
              </p>
            )}

            {isMobile && reservasFiltradas.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {reservasFiltradas.map((reserva) => (
                  <ReservaCard
                    key={reserva.key ?? reserva.id}
                    reserva={reserva}
                    cancelando={cancelando}
                    onCancelar={handleCancelar}
                    onVerified={() => reloadReservations(profileData)}
                  />
                ))}
              </div>
            )}

            {!isMobile && reservasFiltradas.length > 0 && (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid rgba(80,54,41,0.12)" }}>
                      {["Fecha", "Escritorio", "Turno", "Estado", "Acciones"].map((col) => (
                        <th
                          key={col}
                          style={{
                            padding: "8px 12px",
                            textAlign: "left",
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            color: "#92614F",
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reservasFiltradas.map((reserva, index) => {
                      const reservaKey = reserva.key ?? reserva.id;

                      return (
                        <tr
                          key={reservaKey}
                          style={{
                            borderBottom: index < reservasFiltradas.length - 1 ? "1px solid rgba(80,54,41,0.08)" : "none",
                          }}
                        >
                          <td style={{ padding: "12px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <IconCalendar />
                              <span className="text-body" style={{ whiteSpace: "nowrap" }}>
                                {reserva.fecha
                                  ? new Date(`${reserva.fecha}T12:00:00`).toLocaleDateString("es-CO", {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                    })
                                  : "N/A"}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: "12px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <IconMonitor />
                              <span className="text-body">{getDeskLabel(reserva)}</span>
                            </div>
                          </td>
                          <td style={{ padding: "12px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <IconClock />
                              <span className="text-body" style={{ whiteSpace: "nowrap" }}>
                                {getShiftLabel(reserva)}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: "12px" }}>
                            <span
                              style={{
                                padding: "3px 10px",
                                borderRadius: "20px",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                whiteSpace: "nowrap",
                                ...(ESTADO_STYLES[reserva.estado] || { background: "#EEE", color: "#555" }),
                              }}
                            >
                              {reserva.estado}
                            </span>
                          </td>
                          <td style={{ padding: "12px", display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                            <VerificacionAsistencia reserva={reserva} onVerified={() => reloadReservations(profileData)}>
                              {({ verify, loading: verifying, metadataLoading }) => (
                                reserva.estado === "Pendiente" ? (
                                  <button
                                    onClick={() => void verify()}
                                    disabled={verifying || metadataLoading}
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "5px",
                                      padding: "4px 10px",
                                      borderRadius: "8px",
                                      border: "1px solid rgba(21,87,36,0.24)",
                                      background: "rgba(46,125,50,0.08)",
                                      color: "#1f6f3a",
                                      fontSize: "0.75rem",
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