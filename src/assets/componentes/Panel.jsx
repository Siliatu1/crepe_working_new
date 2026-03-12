import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { cancelReserva, updateReservaWithVerification } from "../../utils/reservasService";
import useRealtimeSync from "../../hooks/useRealtimeSync";
import {
  calculateDistance,
  checkGeolocationSupport,
  getCurrentPosition,
  getVerificationTimeInfo,
  getWorkplaceInfo,
  verifyAttendance,
} from "../../utils/geolocationService";

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
const IconLogout = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
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

// ── Helpers ───────────────────────────────────────────────────
const extractId = (rel) => {
  if (rel == null) return null;
  if (typeof rel === 'number') return rel;
  if (typeof rel === 'object' && rel.id != null) return rel.id;

  if (typeof rel === 'object' && rel.data != null) {
    const d = rel.data;
    if (typeof d === 'number') return d;
    if (Array.isArray(d) && d.length > 0) return d[0]?.id ?? null;
    if (typeof d === 'object' && d.id != null) return d.id;
  }

  return null;
};

const getPuestoId = (r) => {
  return (
    extractId(r.attributes?.working_puestos) ??
    extractId(r.working_puestos) ??
    r.attributes?.escritorioId ??
    r.escritorioId ??
    null
  );
};

const getHorarioId = (r) => {
  return (
    extractId(r.attributes?.working_horarios) ??
    extractId(r.working_horarios) ??
    r.attributes?.horarioId ??
    r.horarioId ??
    null
  );
};

const getHorarioLabel = (r, horarioId) => {
  const fromRelation =
    r.attributes?.working_horarios?.data?.attributes?.nombre ??
    r.attributes?.working_horarios?.attributes?.nombre ??
    r.working_horarios?.data?.attributes?.nombre ??
    r.working_horarios?.attributes?.nombre;

  if (fromRelation) return fromRelation;
  if (r.attributes?.turno) return r.attributes.turno;
  if (r.attributes?.horario) return r.attributes.horario;

  const meta = HORARIO_META[horarioId];
  return meta?.label ?? null;
};

const getEstadoReserva = (attrs = {}) => {
  const estadoRaw = attrs?.estado;
  const motivo = String(attrs?.motivoCancelacion ?? '').trim();
  const tipoVerificacion = String(attrs?.verificacionAsistencia?.tipo ?? '').toLowerCase();
  const fueCanceladaManualmente = motivo.length > 0 || tipoVerificacion.includes('cancelacion');

  if (fueCanceladaManualmente) return 'Cancelada';

  if (estadoRaw === true) return 'Confirmada';
  if (estadoRaw === false) return 'Cancelada';
  if (estadoRaw == null) return 'Pendiente';

  const estadoTexto = String(estadoRaw)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (estadoTexto === 'confirmada' || estadoTexto === 'confirmado' || estadoTexto === 'completada' || estadoTexto === 'completado') {
    return 'Confirmada';
  }

  if (estadoTexto === 'cancelada' || estadoTexto === 'cancelado') {
    return 'Cancelada';
  }

  if (estadoTexto === 'pendiente') return 'Pendiente';
  return 'Pendiente';
};

// ── Tarjeta mobile colapsable ─────────────────────────────────
const ReservaCard = ({
  r,
  cancelando,
  confirmando,
  onCancelar,
  onConfirmar,
  canConfirmByLocation,
  confirmBlockedMessage,
  remainingMinutes,
}) => {
  const [open, setOpen] = useState(false);
  const hMeta = HORARIO_META[r.horarioId];
  const turnoTexto = r.turnoLabel || hMeta?.label || '—';
  const esCancelada = r.estado === 'Cancelada';
  const esPendiente = r.estado === 'Pendiente';
  const confirmDisabled =
    confirmando === r.id ||
    cancelando === r.id ||
    !esPendiente ||
    !canConfirmByLocation ||
    Boolean(confirmBlockedMessage);

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
            background: esCancelada ? "#F8D7DA" : "#D4EDDA",
            color: esCancelada ? "#721C24" : "#155724",
          }}>
            {r.estado}
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
                {hMeta?.hora ? `${turnoTexto} · ${hMeta.hora}` : turnoTexto}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "0.82rem", color: "#92614F" }}>👤</span>
              <span className="text-body" style={{ fontSize: "0.82rem" }}>{r.nombre}</span>
            </div>
          </div>
          {esPendiente && (
            <div style={{ marginTop: "8px", fontSize: "0.72rem", color: "#8A6D3B" }}>
              {remainingMinutes != null && remainingMinutes > 0
                ? `Ventana activa: quedan ${remainingMinutes} min`
                : (confirmBlockedMessage || 'Pendiente de confirmación')}
            </div>
          )}
          <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
            <button
              onClick={() => onConfirmar(r.id)}
              disabled={confirmDisabled}
              style={{
                width: "100%",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                padding: "8px", borderRadius: "8px",
                border: "1px solid rgba(21,87,36,0.3)",
                background: "rgba(21,87,36,0.08)",
                color: "#155724", fontSize: "0.8rem", fontWeight: 600,
                cursor: confirmDisabled ? "not-allowed" : "pointer",
                opacity: confirmDisabled ? 0.6 : 1,
                fontFamily: "inherit",
              }}
            >
              {confirmando === r.id ? "Confirmando…" : "Confirmar"}
            </button>
            <button
              onClick={() => onCancelar(r.id)}
              disabled={cancelando === r.id || esCancelada}
              style={{
                width: "100%",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                padding: "8px", borderRadius: "8px",
                border: "1px solid rgba(220,53,69,0.3)",
                background: "rgba(220,53,69,0.06)",
                color: "#c0392b", fontSize: "0.8rem", fontWeight: 600,
                cursor: cancelando === r.id || esCancelada ? "not-allowed" : "pointer",
                opacity: cancelando === r.id || esCancelada ? 0.6 : 1,
                fontFamily: "inherit",
              }}
            >
              <IconTrash />
              {esCancelada ? "Ya cancelada" : cancelando === r.id ? "Cancelando…" : "Cancelar"}
            </button>
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
  const workplaceInfo = getWorkplaceInfo();
  const geoSupport = checkGeolocationSupport();

  const profileData = datosEmpleado;
  const [reservations, setReservations] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [cancelando,   setCancelando]   = useState(null);
  const [confirmando,  setConfirmando]  = useState(null);
  const [cancelConfirmId, setCancelConfirmId] = useState(null);
  const [isNearPoint,  setIsNearPoint]  = useState(false);
  const [distanceMeters, setDistanceMeters] = useState(null);
  const [locationChecking, setLocationChecking] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const getConfirmMeta = useCallback((reserva) => {
    const timeInfo = getVerificationTimeInfo(reserva, [], new Date(nowMs));

    if (!timeInfo.scheduleResolved) {
      return {
        canByTime: false,
        blockedMessage: timeInfo.message || 'No se pudo validar el horario',
        remainingMinutes: null,
      };
    }

    if (!timeInfo.isToday) {
      return {
        canByTime: false,
        blockedMessage: 'Solo puedes confirmar reservas del día de hoy.',
        remainingMinutes: null,
      };
    }

    if (!timeInfo.isActive) {
      return {
        canByTime: false,
        blockedMessage: timeInfo.message || 'La ventana de confirmación no está activa.',
        remainingMinutes: 0,
      };
    }

    const remainingMinutes = timeInfo.verificationEnd
      ? Math.max(0, Math.ceil((timeInfo.verificationEnd.getTime() - nowMs) / 60000))
      : null;

    return {
      canByTime: true,
      blockedMessage: '',
      remainingMinutes,
    };
  }, [nowMs]);

  const refreshLocationStatus = useCallback(async (silent = false) => {
    if (!geoSupport.supported) {
      setLocationError('Tu navegador no soporta geolocalización.');
      setIsNearPoint(false);
      return;
    }

    if (!silent) {
      setLocationChecking(true);
    }

    try {
      const position = await getCurrentPosition();
      const distance = calculateDistance(
        position.latitude,
        position.longitude,
        workplaceInfo.latitude,
        workplaceInfo.longitude
      );

      setDistanceMeters(distance);
      setIsNearPoint(distance <= workplaceInfo.radius);
      setLocationError('');
    } catch (err) {
      setLocationError(err?.message || 'No fue posible obtener tu ubicación.');
      setIsNearPoint(false);
    } finally {
      if (!silent) {
        setLocationChecking(false);
      }
    }
  }, [geoSupport.supported, workplaceInfo.latitude, workplaceInfo.longitude, workplaceInfo.radius]);

  // Carga las reservas del usuario actual y las normaliza en un formato simple
  const cargarReservas = async () => {
    setLoading(true);
    setError("");
    try {
      // Obtener documento del usuario actual
      const documentoUsuario = datosEmpleado?.documento || datosEmpleado?.document_number || null;

      if (!documentoUsuario) {
        setError("No se pudo identificar al usuario.");
        return;
      }

      // Traemos solo las reservas del usuario actual filtrando por documento
      const url =
        `${API_RESERVAS}` +
        `?filters[documento][$eq]=${encodeURIComponent(documentoUsuario)}` +
        `&populate[working_puestos][fields][0]=id&populate[working_puestos][fields][1]=nombre` +
        `&populate[working_horarios][fields][0]=id&populate[working_horarios][fields][1]=nombre` +
        `&sort=fecha_reserva:desc` +
        `&pagination[pageSize]=200`;

      const res  = await fetch(url);
      const json = await res.json();
      const data = Array.isArray(json.data) ? json.data : [];

      // Normalizar cada reserva a un objeto plano fácil de mostrar
      const normalizadas = data.map(r => {
        const puestoId = getPuestoId(r);
        const horarioId = getHorarioId(r);
        const escritorioFallback = r.attributes?.escritorio;
        const escritorioMatch = typeof escritorioFallback === 'string'
          ? escritorioFallback.match(/\d+/)?.[0]
          : null;

        return {
          id:       r.id,
          nombre:   r.attributes?.Nombre    ?? r.attributes?.documento ?? '—',
          foto:     r.attributes?.foto      ?? null,
          documento:r.attributes?.documento ?? '—',
          area:     r.attributes?.area      ?? '—',
          fecha:    r.attributes?.fecha_reserva ?? '—',
          estado:   getEstadoReserva(r.attributes),
          confirmada: r.attributes?.estado === true,
          pendiente: r.attributes?.estado === null,
          cancelada: r.attributes?.estado === false,
          motivoCancelacion: r.attributes?.motivoCancelacion ?? null,
          verificacionAsistencia: r.attributes?.verificacionAsistencia ?? null,
          puestoId: puestoId ?? (escritorioMatch ? Number(escritorioMatch) : null),
          horarioId,
          horario: r.attributes?.horario ?? null,
          turno: r.attributes?.turno ?? null,
          horaInicio: r.attributes?.horaInicio ?? null,
          horaFin: r.attributes?.horaFin ?? null,
          turnoLabel: getHorarioLabel(r, horarioId),
        };
      });

      setReservations(normalizadas);
    } catch (err) {
      console.error(err);
      setError("Error al cargar las reservas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    if (datosEmpleado?.documento || datosEmpleado?.document_number) {
      cargarReservas();
    }
  }, [datosEmpleado?.documento, datosEmpleado?.document_number]);

  useRealtimeSync(() => {
    if (datosEmpleado?.documento || datosEmpleado?.document_number) {
      cargarReservas();
    }
  });

  useEffect(() => {
    void refreshLocationStatus(true);
  }, [refreshLocationStatus]);

  const handleConfirmar = async (id) => {
    const reservaAux = reservations.find(r => r.id === id);
    if (!reservaAux || reservaAux.estado !== 'Pendiente') {
      return;
    }

    const confirmMeta = getConfirmMeta(reservaAux);
    if (!confirmMeta.canByTime) {
      alert(confirmMeta.blockedMessage || 'La reserva no está en ventana de confirmación.');
      return;
    }

    if (!isNearPoint) {
      alert(`Debes estar dentro de ${workplaceInfo.radius} metros para confirmar la reserva.`);
      return;
    }

    setConfirmando(id);
    try {
      const evaluation = await verifyAttendance(reservaAux, {
        workplaceInfo,
        referenceDate: new Date(nowMs),
      });

      if (!evaluation.shouldUpdate) {
        alert(evaluation.message || 'La reserva no se puede confirmar en este momento.');
        return;
      }

      const estadoNuevo = evaluation.newStatus;
      const confirmadaNueva = estadoNuevo === 'Confirmada' ? true : estadoNuevo === 'Cancelada' ? false : null;

      await updateReservaWithVerification(id, {
        estado: estadoNuevo,
        confirmada: confirmadaNueva,
        verificacionAsistencia: {
          fecha: new Date().toISOString(),
          mensaje: evaluation.message,
          distancia: evaluation.distance ?? null,
          tipo: estadoNuevo === 'Confirmada' ? 'confirmacion-manual-geolocalizada' : 'auto-cancelacion',
        },
      }, reservaAux);

      setReservations((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                estado: estadoNuevo,
                confirmada: confirmadaNueva,
                verificacionAsistencia: {
                  ...(r.verificacionAsistencia || {}),
                  fecha: new Date().toISOString(),
                  mensaje: evaluation.message,
                  distancia: evaluation.distance ?? null,
                  tipo: estadoNuevo === 'Confirmada' ? 'confirmacion-manual-geolocalizada' : 'auto-cancelacion',
                },
              }
            : r
        )
      );

      alert(evaluation.message || (estadoNuevo === 'Confirmada' ? 'Reserva confirmada.' : 'Reserva actualizada.'));
    } catch (err) {
      console.error(err);
      alert(err?.message || 'Error al confirmar la reserva.');
    } finally {
      setConfirmando(null);
      void refreshLocationStatus(true);
    }
  };

  // Cancelar = usar la función del servicio que construye correctamente el payload
  const handleCancelar = async (id) => {
    setCancelando(id);
    try {
      const reservaAux = reservations.find(r => r.id === id);
      await cancelReserva(id, reservaAux, 'Cancelada por el usuario');
      // Actualizar localmente sin recargar todo
      setReservations(prev =>
        prev.map(r => r.id === id ? {
          ...r,
          // En API el estado queda false para cancelada.
          estado: 'Cancelada',
          confirmada: false,
          verificacionAsistencia: {
            ...(r.verificacionAsistencia || {}),
            fecha: new Date().toISOString(),
            mensaje: 'Cancelada por el usuario',
            tipo: 'cancelacion-manual',
          },
        } : r)
      );
    } catch (err) {
      console.error(err);
      alert('Error al cancelar la reserva. Intenta de nuevo.');
    } finally {
      setCancelando(null);
    }
  };

  const solicitarCancelacion = (id) => {
    setCancelConfirmId(id);
  };

  const cerrarConfirmacionCancelacion = () => {
    setCancelConfirmId(null);
  };

  const confirmarCancelacion = async () => {
    if (!cancelConfirmId) return;
    const id = cancelConfirmId;
    setCancelConfirmId(null);
    await handleCancelar(id);
  };

  // Estado mostrado en panel: Pendiente / Confirmada / Cancelada
  const pendientes = reservations.filter(r => r.estado === 'Pendiente');
  const confirmadas = reservations.filter(r => r.estado === 'Confirmada');
  const canceladas = reservations.filter(r => r.estado === 'Cancelada');
  const reservaEnConfirmacion = reservations.find(r => r.id === cancelConfirmId) || null;

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
                <span className="text-muted">Pendientes</span>
                <span style={{ fontWeight: 700, color: "#8A6D3B" }}>{pendientes.length}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                <span className="text-muted">Confirmadas</span>
                <span style={{ fontWeight: 700, color: "#155724" }}>{confirmadas.length}</span>
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

            <div style={{
              marginTop: 12, padding: "10px 12px",
              background: "rgba(80,54,41,0.05)", borderRadius: 10,
              display: "flex", flexDirection: "column", gap: 8,
            }}>
              <div style={{ fontSize: "0.75rem", color: "#503629", fontWeight: 700 }}>
                Confirmación por ubicación
              </div>
              <div style={{ fontSize: "0.74rem", color: isNearPoint ? "#155724" : "#8A6D3B" }}>
                {isNearPoint
                  ? `Estás dentro del perímetro (${Math.round(distanceMeters || 0)} m).`
                  : `Para confirmar, debes estar dentro del perímetro de  ${workplaceInfo.radius} m.`}
              </div>
              {!!locationError && (
                <div style={{ fontSize: "0.72rem", color: "#c0392b" }}>{locationError}</div>
              )}
              <button
                onClick={() => void refreshLocationStatus()}
                disabled={locationChecking}
                style={{
                  padding: "8px 10px", borderRadius: 8,
                  border: "1px solid rgba(80,54,41,0.25)",
                  background: "rgba(80,54,41,0.08)",
                  color: "#503629", fontSize: "0.75rem", fontWeight: 600,
                  cursor: locationChecking ? "not-allowed" : "pointer",
                  opacity: locationChecking ? 0.7 : 1,
                }}
              >
                {locationChecking ? "Verificando ubicación…" : "Actualizar ubicación"}
              </button>
            </div>

            {/* Botón cerrar sesión */}
            <button
              onClick={() => navigate('/')}
              style={{
                marginTop: 16, width: "100%",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                padding: "10px 14px", borderRadius: "8px",
                border: "1px solid rgba(192,57,43,0.3)",
                background: "rgba(192,57,43,0.08)",
                color: "#c0392b", fontSize: "0.8rem", fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(192,57,43,0.15)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(192,57,43,0.08)"; }}
            >
              <IconLogout />
              Cerrar sesión
            </button>
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
                Mis <span className="text-accent">reservas</span>
              </h2>
              <span style={{
                padding: "3px 12px", borderRadius: 20,
                background: "rgba(80,54,41,0.08)", color: "#503629",
                fontSize: "0.75rem", fontWeight: 700,
              }}>
                {reservations.length}
              </span>
            </div>

            {reservations.length === 0 && (
              <p className="text-muted" style={{ fontSize: "0.85rem", textAlign: "center", padding: "24px 0" }}>
                No hay reservas registradas.
              </p>
            )}

            {/* MOBILE */}
            {isMobile && reservations.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {reservations.map(r => {
                  const confirmMeta = getConfirmMeta(r);
                  return (
                    <ReservaCard
                      key={r.id}
                      r={r}
                      cancelando={cancelando}
                      confirmando={confirmando}
                      onCancelar={solicitarCancelacion}
                      onConfirmar={handleConfirmar}
                      canConfirmByLocation={isNearPoint}
                      confirmBlockedMessage={confirmMeta.blockedMessage}
                      remainingMinutes={confirmMeta.remainingMinutes}
                    />
                  );
                })}
              </div>
            )}

            {/* DESKTOP */}
            {!isMobile && reservations.length > 0 && (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid rgba(80,54,41,0.12)" }}>
                      {["Nombre", "Fecha", "Escritorio", "Turno", "Estado", "Acción"].map(h => (
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
                    {reservations.map((r, i) => {
                      const hMeta = HORARIO_META[r.horarioId];
                      const turnoTexto = r.turnoLabel || hMeta?.label || '—';
                      const esCancelada = r.estado === 'Cancelada';
                      const esPendiente = r.estado === 'Pendiente';
                      const confirmMeta = getConfirmMeta(r);
                      return (
                        <tr key={r.id}
                          style={{ borderBottom: i < reservations.length - 1 ? "1px solid rgba(80,54,41,0.08)" : "none", transition: "background 0.15s" }}
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
                              <div>
                                <div style={{ fontWeight: 600, fontSize: "0.83rem", color: "#503629" }}>{r.nombre}</div>
                                <div style={{ fontSize: "0.72rem", color: "#92614F", opacity: 0.8 }}>{r.area}</div>
                              </div>
                            </div>
                          </td>
                          {/* Fecha */}
                          <td style={{ padding: "12px 12px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <IconCalendar />
                              <span className="text-body" style={{ whiteSpace: "nowrap", fontSize: "0.82rem" }}>
                                {r.fecha !== '—'
                                  ? new Date(r.fecha + "T12:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "short" })
                                  : '—'}
                              </span>
                            </div>
                          </td>
                          {/* Escritorio */}
                          <td style={{ padding: "12px 12px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <IconMonitor />
                              <span className="text-body" style={{ fontSize: "0.82rem" }}>
                                {r.puestoId ? `Escritorio ${r.puestoId}` : '—'}
                              </span>
                            </div>
                          </td>
                          {/* Turno */}
                          <td style={{ padding: "12px 12px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <IconClock />
                              <span className="text-body" style={{ whiteSpace: "nowrap", fontSize: "0.82rem" }}>
                                {turnoTexto}
                              </span>
                            </div>
                          </td>
                          {/* Estado */}
                          <td style={{ padding: "12px 12px" }}>
                            <span style={{
                              display: "inline-flex", alignItems: "center",
                              padding: "3px 10px", borderRadius: "999px",
                              fontSize: "0.72rem", fontWeight: 700,
                              background: esCancelada ? "#F8D7DA" : esPendiente ? "#FFF3CD" : "#D4EDDA",
                              color: esCancelada ? "#721C24" : esPendiente ? "#8A6D3B" : "#155724",
                            }}>
                              {r.estado}
                            </span>
                          </td>
                          {/* Cancelar */}
                          <td style={{ padding: "12px 12px", textAlign: "right" }}>
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                              <button
                                onClick={() => handleConfirmar(r.id)}
                                disabled={confirmando === r.id || cancelando === r.id || !esPendiente || !isNearPoint || !confirmMeta.canByTime}
                                style={{
                                  display: "inline-flex", alignItems: "center", gap: 5,
                                  padding: "4px 10px", borderRadius: 8,
                                  border: "1px solid rgba(21,87,36,0.35)",
                                  background: "rgba(21,87,36,0.08)",
                                  color: "#155724", fontSize: "0.75rem", fontWeight: 600,
                                  cursor: confirmando === r.id || cancelando === r.id || !esPendiente || !isNearPoint || !confirmMeta.canByTime ? "not-allowed" : "pointer",
                                  opacity: confirmando === r.id || cancelando === r.id || !esPendiente || !isNearPoint || !confirmMeta.canByTime ? 0.6 : 1,
                                  transition: "all 0.15s", fontFamily: "inherit",
                                }}
                              >
                                {confirmando === r.id ? "Confirmando…" : "Confirmar"}
                              </button>
                              <button
                                onClick={() => solicitarCancelacion(r.id)}
                                disabled={cancelando === r.id || esCancelada || cancelConfirmId === r.id}
                                style={{
                                  display: "inline-flex", alignItems: "center", gap: 5,
                                  padding: "4px 10px", borderRadius: 8,
                                  border: "1px solid rgba(220,53,69,0.35)",
                                  background: "rgba(220,53,69,0.06)",
                                  color: "#c0392b", fontSize: "0.75rem", fontWeight: 600,
                                  cursor: cancelando === r.id || esCancelada || cancelConfirmId === r.id ? "not-allowed" : "pointer",
                                  opacity: cancelando === r.id || esCancelada || cancelConfirmId === r.id ? 0.6 : 1,
                                  transition: "all 0.15s", fontFamily: "inherit",
                                }}
                                onMouseEnter={e => { if (cancelando !== r.id && !esCancelada && cancelConfirmId !== r.id) e.currentTarget.style.background = "rgba(220,53,69,0.12)"; }}
                                onMouseLeave={e => { e.currentTarget.style.background = "rgba(220,53,69,0.06)"; }}
                              >
                                <IconTrash />
                                {esCancelada ? "Cancelada" : cancelando === r.id ? "Cancelando…" : "Cancelar"}
                              </button>
                            </div>
                            {esPendiente && (
                              <div style={{ marginTop: 6, fontSize: "0.7rem", color: "#8A6D3B", textAlign: "right" }}>
                                {confirmMeta.remainingMinutes != null && confirmMeta.remainingMinutes > 0
                                  ? `Quedan ${confirmMeta.remainingMinutes} min para confirmar`
                                  : (confirmMeta.blockedMessage || 'Pendiente de confirmación')}
                              </div>
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

      {cancelConfirmId != null && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "16px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "420px",
              background: "#fff",
              borderRadius: "12px",
              border: "1px solid rgba(80,54,41,0.15)",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
              padding: "18px",
            }}
          >
            <h3 style={{ margin: 0, color: "#503629", fontSize: "1rem", fontWeight: 700 }}>
              Confirmar cancelación
            </h3>
            <p style={{ margin: "10px 0 0", color: "#6B4A3A", fontSize: "0.88rem" }}>
              ¿Seguro de cancelar su reserva?
            </p>
            {reservaEnConfirmacion && (
              <p style={{ margin: "8px 0 0", color: "#92614F", fontSize: "0.8rem" }}>
                Escritorio {reservaEnConfirmacion.puestoId ?? '—'} · {reservaEnConfirmacion.fecha || '—'}
              </p>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "16px" }}>
              <button
                onClick={cerrarConfirmacionCancelacion}
                style={{
                  padding: "7px 12px",
                  borderRadius: "8px",
                  border: "1px solid rgba(80,54,41,0.25)",
                  background: "#fff",
                  color: "#503629",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Cerrar
              </button>
              <button
                onClick={confirmarCancelacion}
                style={{
                  padding: "7px 12px",
                  borderRadius: "8px",
                  border: "1px solid rgba(220,53,69,0.35)",
                  background: "rgba(220,53,69,0.1)",
                  color: "#c0392b",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Panel;