import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import { getReservas } from "../../utils/reservasService";
import VerificacionAsistencia from "./VerificacionAsistencia";
import useAutoCancelarReservas from "../../hooks/useAutoCancelarReservas";
import useRealtimeSync from "../../hooks/useRealtimeSync";

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

const ESTADO_STYLES = {
  Pendiente: { background: "#FFF3CD", color: "#856404" },
  Confirmada: { background: "#D4EDDA", color: "#155724" },
  Cancelada: { background: "#F8D7DA", color: "#721C24" },
};

const Panel = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const datosEmpleado = location.state?.datosEmpleado || null;

  const [profileData, setProfileData] = useState(datosEmpleado);
  const [loading, setLoading] = useState(!datosEmpleado);
  const [error, setError] = useState("");
  const [reservations, setReservations] = useState([]);
  const [filtroEstado, setFiltroEstado] = useState("Todos");

  useAutoCancelarReservas(true);

  const reloadReservations = useCallback(() => {
    try {
      const storedCedula = localStorage.getItem("cedula");
      const storedEmpleado = localStorage.getItem("empleadoData");
      const empleadoData = storedEmpleado ? JSON.parse(storedEmpleado) : profileData;
      const cedulaUsuario =
        storedCedula ||
        empleadoData?.documento ||
        empleadoData?.document_number ||
        profileData?.documento ||
        profileData?.document_number;

      const todasReservas = getReservas();
      const reservasUsuario = cedulaUsuario
        ? todasReservas.filter((reserva) => String(reserva.cedula) === String(cedulaUsuario))
        : [];

      setReservations(reservasUsuario);
    } catch (err) {
      console.error("Error al recargar reservas:", err);
      setReservations([]);
    }
  }, [profileData]);

  useRealtimeSync(() => {
    reloadReservations();
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);

        let empleadoData = profileData;
        const storedEmpleado = localStorage.getItem("empleadoData");
        const storedCedula = localStorage.getItem("cedula");

        if (!empleadoData && storedEmpleado) {
          empleadoData = JSON.parse(storedEmpleado);
          setProfileData(empleadoData);
        } else if (!empleadoData && storedCedula) {
          const response = await axios.get(
            `https://apialohav2.crepesywaffles.com/buk/empleados3?documento=${storedCedula}`
          );
          empleadoData = response.data.data[0];
          setProfileData(empleadoData);
          localStorage.setItem("empleadoData", JSON.stringify(empleadoData));
        }

        reloadReservations();
      } catch (err) {
        console.error(err);
        setError("Error al cargar los datos del perfil");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [profileData, reloadReservations]);

  const filtros = ["Todos", "Pendiente", "Confirmada", "Cancelada"];
  const reservasFiltradas =
    filtroEstado === "Todos"
      ? reservations
      : reservations.filter((r) => r.estado === filtroEstado);

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="bienvenida-card">
          <p className="text-muted">Cargando informacion...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-wrapper">
        <div className="bienvenida-card">
          <p className="text-muted" style={{ color: "#c0392b" }}>
            {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper" style={{ alignItems: "flex-start", padding: "24px" }}>
      <div
        style={{
          width: "100%",
          maxWidth: "960px",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h1 className="bienvenida-saludo" style={{ margin: 0, fontSize: "1.4rem" }}>
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

        <div style={{ display: "flex", gap: "20px", alignItems: "flex-start", flexWrap: "wrap" }}>
          <div className="bienvenida-card" style={{ width: "280px", flexShrink: 0 }}>
            <div className="bienvenida-avatar">
              {profileData?.foto && profileData.foto !== "null" ? (
                <img src={profileData.foto} alt="Foto" className="bienvenida-foto" />
              ) : (
                <div className="bienvenida-foto-placeholder">
                  <IconUser />
                </div>
              )}
            </div>

            <h1 className="bienvenida-saludo">
              Hola, <span className="text-accent">{profileData?.nombre?.split(" ")[0]}</span>
            </h1>
            <p className="text-muted bienvenida-sub">Bienvenido a tu espacio de trabajo</p>

            <div className="bienvenida-info">
              <div>
                <div className="text-label">Cargo y Area</div>
                <div className="bienvenida-cargo">{profileData?.cargo || "N/A"}</div>
                <div className="text-muted">{profileData?.area_nombre || "N/A"}</div>
              </div>
              <div className="bienvenida-divider" />
              <div>
                <div className="text-label">Cedula</div>
                <div className="text-body">
                  {profileData?.documento || profileData?.document_number || "N/A"}
                </div>
              </div>
            </div>

            <button
              className="btn-continuar"
              onClick={() => navigate("/reservas", { state: { datosEmpleado: profileData } })}
              style={{ width: "100%", marginTop: "12px" }}
            >
              Nueva Reserva
            </button>
          </div>

          <div className="bienvenida-card" style={{ flex: 1, minWidth: "320px", padding: "20px 24px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "16px",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              <h2 className="bienvenida-saludo" style={{ margin: 0, fontSize: "1.1rem" }}>
                Reservas <span className="text-accent">activas</span>
              </h2>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {filtros.map((f) => (
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

            {reservasFiltradas.length === 0 ? (
              <p className="text-muted" style={{ textAlign: "center", padding: "20px 0" }}>
                No hay reservas para este filtro.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {reservasFiltradas.map((r) => (
                  <div
                    key={r.id || r.key}
                    className="bienvenida-info"
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      padding: "12px 16px",
                      gap: "16px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: "140px" }}>
                      <IconCalendar />
                      <span className="text-body">
                        {new Date(r.fecha).toLocaleDateString("es-CO", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: "90px" }}>
                      <IconMonitor />
                      <span className="text-body">{r.escritorio || `Escritorio ${r.escritorioId}`}</span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1 }}>
                      <IconClock />
                      <span className="text-body">{r.turno || r.horario || `${r.horaInicio || ""} ${r.horaFin ? `- ${r.horaFin}` : ""}`.trim()}</span>
                    </div>

                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: "20px",
                        fontSize: "0.78rem",
                        fontWeight: "600",
                        ...(ESTADO_STYLES[r.estado] || { background: "#eee", color: "#555" }),
                      }}
                    >
                      {r.estado}
                    </span>

                    <VerificacionAsistencia reserva={r} onVerified={reloadReservations} />
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
