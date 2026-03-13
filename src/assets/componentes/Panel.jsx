import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { User, Calendar, Monitor, Clock, Armchair, Ticket, ArrowLeft, Trash2, LogOut, ChevronDown } from 'lucide-react';
import { cancelReserva, updateReservaWithVerification } from "../../utils/reservasService";
import useRealtimeSync from '../../hooks/useRealtimeSync';
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
const ADMINS = ['1028783377', '1019096266'];

// Metadatos de horarios por ID (igual que en Reservas.jsx)
const HORARIO_META = {
  1: { label: 'Mañana',      hora: '8:00 am – 12:00 m' },
  2: { label: 'Tarde',        hora: '1:00 pm – 5:00 pm' },
  3: { label: 'Día completo', hora: '8:00 am – 5:00 pm' },
};

// Chevron con rotación
const IconChevron = ({ open }) => (
  <div style={{ transition: 'transform 0.25s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
    <ChevronDown size={14} strokeWidth={2.5} />
  </div>
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
/** Primer nombre + primer apellido (dos primeras palabras) */
const getNombreCorto = (nombre = '') => {
  const partes = nombre.trim().split(/\s+/);
  return partes.length >= 2 ? `${partes[0]} ${partes[1]}` : partes[0] ?? '';
};

const getNombreCompleto = (nombre = '') => String(nombre ?? '').trim();

const getLocalDateString = (referenceDate = new Date()) => {
  const year = referenceDate.getFullYear();
  const month = String(referenceDate.getMonth() + 1).padStart(2, '0');
  const day = String(referenceDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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

const getSalaInfo = (r) => {
  const puestosData = r.attributes?.working_puestos?.data;
  const pAttr = Array.isArray(puestosData)
    ? puestosData[0]?.attributes
    : puestosData?.attributes ?? null;
  const salaData = pAttr?.working_sala?.data;
  if (salaData) {
    return {
      salaId:    salaData.id ?? null,
      salaNombre: salaData.attributes?.nombre ?? `Sala ${salaData.id}`,
    };
  }
  return { salaId: null, salaNombre: null };
};

const getEstadoReserva = (attrs = {}) => {
  const estadoRaw = attrs?.estado;

  // Regla canónica de backend: null => Pendiente, true => Confirmada, false => Cancelada
  if (estadoRaw === true) return 'Confirmada';
  if (estadoRaw === false) return 'Cancelada';
  if (estadoRaw === null) return 'Pendiente';

  const motivo = String(attrs?.motivo_cancelacion ?? attrs?.motivoCancelacion ?? '').trim();
  const tipoVerificacion = String(attrs?.verificacionAsistencia?.tipo ?? '').toLowerCase();
  const fueCanceladaManualmente = motivo.length > 0 || tipoVerificacion.includes('cancelacion');

  if (fueCanceladaManualmente) return 'Cancelada';

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
  reactivando,
  onCancelar,
  onConfirmar,
  onReactivar,
  canConfirm,
  confirmLabel,
  helperMessage,
  showOwner,
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
    reactivando === r.id ||
    !esPendiente ||
    !canConfirm;

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
          <Monitor size={13} color="#CC8A22" strokeWidth={2} />
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
          <span style={{
            padding: "2px 7px", borderRadius: "20px",
            fontSize: "0.68rem", fontWeight: 700,
            background: "rgba(80,54,41,0.08)", color: "#92614F",
            fontFamily: "monospace",
          }}>
            #{r.id}
          </span>
        </div>
        <IconChevron open={open} />
      </button>

      {open && (
        <div style={{ padding: "0 14px 14px", borderTop: "1px solid rgba(80,54,41,0.08)", paddingTop: "12px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {showOwner && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                {r.foto && r.foto !== "null" ? (
                  <img src={r.foto} alt="Foto" style={{
                    width: "24px", height: "24px", borderRadius: "50%", objectFit: "cover", flexShrink: 0
                  }} />
                ) : (
                  <div style={{
                    width: "24px", height: "24px", borderRadius: "50%",
                    background: "rgba(204,138,34,0.1)", display: "flex",
                    alignItems: "center", justifyContent: "center", flexShrink: 0
                  }}>
                    <User size={12} color="#92614F" strokeWidth={2} />
                  </div>
                )}
                <span className="text-body" style={{ fontSize: "0.82rem" }}>
                  {r.nombreCompleto || r.nombre}
                </span>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Ticket size={13} color="#92614F" strokeWidth={2} />
              <span style={{ fontSize: "0.75rem", color: "#92614F", fontFamily: "monospace", fontWeight: 700 }}>
                Reserva #{r.id}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Calendar size={13} color="#CC8A22" strokeWidth={2} />
              <span className="text-body" style={{ fontSize: "0.82rem" }}>
                {new Date(r.fecha + "T12:00:00").toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" })}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Clock size={13} color="#CC8A22" strokeWidth={2} />
              <span className="text-body" style={{ fontSize: "0.82rem" }}>
                {hMeta?.hora ? `${turnoTexto} · ${hMeta.hora}` : turnoTexto}
              </span>
            </div>

          </div>
            {(esCancelada || r.estado === 'Confirmada') && (r.motivoCancelacion || r.motivoGestion) && (
              <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "0.74rem", color: "#92614F", fontWeight: 700 }}>
                  Motivo
                </span>
                <span className="text-body" style={{ fontSize: "0.78rem", color: "#6B4A3A" }}>
                  {r.motivoCancelacion || r.motivoGestion}
                </span>
              </div>
            )}
            {esPendiente && (
            <div style={{ marginTop: "8px", fontSize: "0.72rem", color: "#8A6D3B" }}>
              {helperMessage || (remainingMinutes != null && remainingMinutes > 0
                ? `Ventana activa: quedan ${remainingMinutes} min`
                : (confirmBlockedMessage || 'Pendiente de confirmación'))}
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
              {confirmando === r.id ? "Confirmando…" : confirmLabel}
            </button>
            <button
              onClick={() => onCancelar(r.id)}
              disabled={cancelando === r.id || esCancelada || reactivando === r.id}
              style={{
                width: "100%",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                padding: "8px", borderRadius: "8px",
                border: "1px solid rgba(220,53,69,0.3)",
                background: "rgba(220,53,69,0.06)",
                color: "#c0392b", fontSize: "0.8rem", fontWeight: 600,
                cursor: cancelando === r.id || esCancelada || reactivando === r.id ? "not-allowed" : "pointer",
                opacity: cancelando === r.id || esCancelada || reactivando === r.id ? 0.6 : 1,
                fontFamily: "inherit",
              }}
            >
              <Trash2 size={13} strokeWidth={2} />
              {esCancelada ? "Ya cancelada" : cancelando === r.id ? "Cancelando…" : "Cancelar"}
            </button>
            {showOwner && esCancelada && (
              <button
                onClick={() => onReactivar(r.id)}
                disabled={reactivando === r.id || cancelando === r.id || confirmando === r.id}
                style={{
                  width: "100%",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                  padding: "8px", borderRadius: "8px",
                  border: "1px solid rgba(204,138,34,0.35)",
                  background: "rgba(204,138,34,0.1)",
                  color: "#8A6D3B", fontSize: "0.8rem", fontWeight: 700,
                  cursor: reactivando === r.id || cancelando === r.id || confirmando === r.id ? "not-allowed" : "pointer",
                  opacity: reactivando === r.id || cancelando === r.id || confirmando === r.id ? 0.6 : 1,
                  fontFamily: "inherit",
                }}
              >
                {reactivando === r.id ? "Reactivando…" : "Reactivar"}
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
  const workplaceInfo = getWorkplaceInfo();
  const geoSupport = checkGeolocationSupport();

  const profileData = datosEmpleado;
  const documentoUsuario = String(datosEmpleado?.documento || datosEmpleado?.document_number || '');
  const esAdmin = ADMINS.includes(documentoUsuario);
  const [reservations, setReservations] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [cancelando,   setCancelando]   = useState(null);
  const [confirmando,  setConfirmando]  = useState(null);
  const [reactivando,  setReactivando]  = useState(null);
  const [cancelConfirmId, setCancelConfirmId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelReasonError, setCancelReasonError] = useState('');
  const [isNearPoint,  setIsNearPoint]  = useState(false);
  const [distanceMeters, setDistanceMeters] = useState(null);
  const [locationChecking, setLocationChecking] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [nowMs, setNowMs] = useState(Date.now());
  const [showAllReservations, setShowAllReservations] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEstado, setFilterEstado] = useState('todos');
  const [filterSala, setFilterSala] = useState('todas');
  const [adminTab, setAdminTab] = useState('todos');

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
  const cargarReservas = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (!documentoUsuario) {
        setError("No se pudo identificar al usuario.");
        return;
      }

      const filtroDocumento = esAdmin
        ? ''
        : `&filters[documento][$eq]=${encodeURIComponent(documentoUsuario)}`;
      const filtroFecha = showAllReservations
        ? ''
        : `&filters[fecha_reserva][$eq]=${getLocalDateString()}`;

      const url =
        `${API_RESERVAS}` +
        `?sort[0]=fecha_reserva:desc&sort[1]=id:desc` +
        filtroDocumento +
        filtroFecha +
        `&populate[working_puestos][fields][0]=id&populate[working_puestos][fields][1]=nombre` +
        `&populate[working_puestos][populate][working_sala][fields][0]=id` +
        `&populate[working_puestos][populate][working_sala][fields][1]=nombre` +
        `&populate[working_horarios][fields][0]=id&populate[working_horarios][fields][1]=nombre` +
        `&pagination[pageSize]=40000`;

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
        const { salaId, salaNombre } = getSalaInfo(r);

        return {
          id:       r.id,
          nombre:   getNombreCorto(r.attributes?.Nombre ?? r.attributes?.documento ?? '—'),
          nombreCompleto: getNombreCompleto(r.attributes?.Nombre ?? r.attributes?.documento ?? '—'),
          foto:     r.attributes?.foto      ?? null,
          documento:r.attributes?.documento ?? '—',
          area:     r.attributes?.area      ?? '—',
          fecha:    r.attributes?.fecha_reserva ?? '—',
          estado:   getEstadoReserva(r.attributes),
          confirmada: r.attributes?.estado === true,
          pendiente: r.attributes?.estado === null,
          cancelada: r.attributes?.estado === false,
          motivoCancelacion: r.attributes?.motivo_cancelacion ?? r.attributes?.motivoCancelacion ?? null,
          motivoGestion: r.attributes?.verificacionAsistencia?.mensaje ?? null,
          verificacionAsistencia: r.attributes?.verificacionAsistencia ?? null,
          puestoId: puestoId ?? (escritorioMatch ? Number(escritorioMatch) : null),
          salaId,
          salaNombre,
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
  }, [documentoUsuario, esAdmin, showAllReservations]);

  useEffect(() => { 
    if (datosEmpleado?.documento || datosEmpleado?.document_number) {
      cargarReservas();
    }
  }, [datosEmpleado?.documento, datosEmpleado?.document_number, cargarReservas]);

  useRealtimeSync(cargarReservas);

  useEffect(() => {
    void refreshLocationStatus(true);
  }, [refreshLocationStatus]);

  const handleConfirmar = async (id) => {
    const reservaAux = reservations.find(r => r.id === id);
    if (!reservaAux || reservaAux.estado !== 'Pendiente') {
      return;
    }

    if (esAdmin) {
      setConfirmando(id);
      try {
        const mensaje = 'Reserva confirmada por administrador.';

        await updateReservaWithVerification(id, {
          estado: 'Confirmada',
          confirmada: true,
          verificacionAsistencia: {
            fecha: new Date().toISOString(),
            mensaje,
            tipo: 'confirmacion-admin-manual',
            autorizadaPor: documentoUsuario,
            nombreAutorizador: datosEmpleado?.nombre ?? 'Administrador',
          },
        }, reservaAux);

        setReservations((prev) =>
          prev.map((r) =>
            r.id === id
              ? {
                  ...r,
                  estado: 'Confirmada',
                  confirmada: true,
                  verificacionAsistencia: {
                    ...(r.verificacionAsistencia || {}),
                    fecha: new Date().toISOString(),
                    mensaje,
                    tipo: 'confirmacion-admin-manual',
                    autorizadaPor: documentoUsuario,
                    nombreAutorizador: datosEmpleado?.nombre ?? 'Administrador',
                  },
                }
              : r
          )
        );

        alert('Reserva confirmada por administrador.');
      } catch (err) {
        console.error(err);
        alert(err?.message || 'Error al confirmar la reserva.');
      } finally {
        setConfirmando(null);
      }
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
      const motivoCancelacion = estadoNuevo === 'Cancelada' ? evaluation.message : null;

      await updateReservaWithVerification(id, {
        estado: estadoNuevo,
        confirmada: confirmadaNueva,
        motivoCancelacion,
        motivo_cancelacion: motivoCancelacion,
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
                motivoCancelacion,
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

  const handleReactivar = async (id) => {
    if (!esAdmin) return;

    const reservaAux = reservations.find(r => r.id === id);
    if (!reservaAux || reservaAux.estado !== 'Cancelada') {
      return;
    }

    setReactivando(id);
    try {
      await updateReservaWithVerification(id, {
        estado: 'Pendiente',
        confirmada: null,
        motivoCancelacion: null,
        motivo_cancelacion: null,
        verificacionAsistencia: {
          fecha: new Date().toISOString(),
          mensaje: 'Reserva reactivada por administrador.',
          tipo: 'reactivacion-admin',
          autorizadaPor: documentoUsuario,
          nombreAutorizador: datosEmpleado?.nombre ?? 'Administrador',
        },
      }, reservaAux);

      setReservations((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                estado: 'Pendiente',
                confirmada: null,
                motivoCancelacion: null,
                verificacionAsistencia: {
                  ...(r.verificacionAsistencia || {}),
                  fecha: new Date().toISOString(),
                  mensaje: 'Reserva reactivada por administrador.',
                  tipo: 'reactivacion-admin',
                  autorizadaPor: documentoUsuario,
                  nombreAutorizador: datosEmpleado?.nombre ?? 'Administrador',
                },
              }
            : r
        )
      );

      alert('Reserva reactivada.');
    } catch (err) {
      console.error(err);
      alert(err?.message || 'Error al reactivar la reserva.');
    } finally {
      setReactivando(null);
    }
  };

  // Cancelar = usar la función del servicio que construye correctamente el payload
  const handleCancelar = async (id, motivoCancelacion) => {
    setCancelando(id);
    try {
      const reservaAux = reservations.find(r => r.id === id);
      await cancelReserva(id, reservaAux, motivoCancelacion);
      // Actualización local inmediata (sin recargar página)
      setReservations(prev =>
        prev.map(r => r.id === id ? {
          ...r,
          // En API el estado queda false para cancelada.
          estado: 'Cancelada',
          confirmada: false,
          motivoCancelacion,
          verificacionAsistencia: {
            ...(r.verificacionAsistencia || {}),
            fecha: new Date().toISOString(),
            mensaje: motivoCancelacion,
            tipo: 'cancelacion-manual',
          },
        } : r)
      );
      // Sincroniza con la API para asegurar consistencia
      await cargarReservas();
    } catch (err) {
      console.error(err);
      alert('Error al cancelar la reserva. Intenta de nuevo.');
    } finally {
      setCancelando(null);
    }
  };

  const solicitarCancelacion = (id) => {
    setCancelConfirmId(id);
    setCancelReason('');
    setCancelReasonError('');
  };

  const cerrarConfirmacionCancelacion = () => {
    setCancelConfirmId(null);
    setCancelReason('');
    setCancelReasonError('');
  };

  const confirmarCancelacion = async () => {
    if (!cancelConfirmId) return;

    const motivo = cancelReason.trim();
    if (!motivo) {
      setCancelReasonError('Debes ingresar el motivo de cancelación.');
      return;
    }

    const id = cancelConfirmId;
    setCancelConfirmId(null);
    setCancelReason('');
    setCancelReasonError('');
    await handleCancelar(id, motivo);
  };

  // Estado mostrado en panel: Pendiente / Confirmada / Cancelada
  const pendientes = reservations.filter(r => r.estado === 'Pendiente');
  const confirmadas = reservations.filter(r => r.estado === 'Confirmada');
  const canceladas = reservations.filter(r => r.estado === 'Cancelada');
  const reservaEnConfirmacion = reservations.find(r => r.id === cancelConfirmId) || null;

  // Salas únicas disponibles en el conjunto actual de reservas
  const availableSalas = useMemo(() => {
    const map = new Map();
    reservations.forEach(r => {
      if (r.salaId) map.set(r.salaId, r.salaNombre ?? `Sala ${r.salaId}`);
    });
    return [...map.entries()].map(([id, nombre]) => ({ id, nombre }));
  }, [reservations]);

  // Reservas filtradas para el panel
  const filteredReservations = useMemo(() => {
    let result = reservations;
    // Admin tabs: mis / otros / todos
    if (esAdmin) {
      if (adminTab === 'mis') result = result.filter(r => r.documento === documentoUsuario);
      else if (adminTab === 'otros') result = result.filter(r => r.documento !== documentoUsuario);
    }
    // Filtro por estado
    if (filterEstado !== 'todos') result = result.filter(r => r.estado === filterEstado);
    // Filtro por sala
    if (filterSala !== 'todas') result = result.filter(r => String(r.salaId) === filterSala);
    // Búsqueda: por ID, nombre, documento, escritorio
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(r =>
        String(r.id).includes(q) ||
        (r.nombreCompleto ?? '').toLowerCase().includes(q) ||
        (r.nombre ?? '').toLowerCase().includes(q) ||
        (r.documento ?? '').toLowerCase().includes(q) ||
        String(r.puestoId ?? '').includes(q)
      );
    }
    return result;
  }, [reservations, esAdmin, adminTab, filterEstado, filterSala, searchQuery, documentoUsuario]);

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
      <div className="top-right-nav-actions">
        <div className="top-nav-btn-group">
        <button
          className="btn-outline top-nav-icon-btn"
          onClick={() => navigate('/panel', { state: { datosEmpleado } })}
          title={esAdmin ? 'Panel Admin' : 'Mis Reservas'}
          aria-label={esAdmin ? 'Panel Admin' : 'Mis Reservas'}
        >
          <Armchair size={14} strokeWidth={2.5} />
        </button>
        <button
          className="btn-outline top-nav-icon-btn"
          onClick={() => navigate('/')}
          title="Cerrar sesión"
          style={{
            borderColor: "rgba(192,57,43,0.35)",
            color: "#c0392b",
          }}
        >
          <LogOut size={14} strokeWidth={2} />
        </button>
        <button
          className="btn-outline reservas-btn-atras top-nav-icon-btn"
          onClick={() => navigate(-1)}
          title="Volver"
        >
          <ArrowLeft size={14} strokeWidth={2.5} />
        </button>
        </div>
      </div>

      <div style={{
        width: "100%", maxWidth: "none",
        margin: 0, display: "flex",
        flexDirection: "column", gap: "16px",
      }}>

        {/* Layout */}
        <div style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: "16px", alignItems: "flex-start",
        }}>

          {/* Perfil */}
          <div className="bienvenida-card" style={{
            width: isMobile ? "100%" : "250px",
            flexShrink: 0, boxSizing: "border-box",
          }}>
            <div className="bienvenida-avatar">
              {profileData?.foto && profileData.foto !== "null" ? (
                <img src={profileData.foto} alt="Foto" className="bienvenida-foto" />
              ) : (
                <div className="bienvenida-foto-placeholder"><User size={32} color="#92614F" strokeWidth={2} /></div>
              )}
            </div>
            <h1 className="bienvenida-saludo">
              ¡Hola, {profileData?.nombre?.split(" ")[0]}!
            </h1>
            <div className="bienvenida-info">
              <div>
                <div className="text-label">Cargo y Área</div>
                <div className="bienvenida-cargo">{profileData?.cargo}</div>
                <div className="text-muted">{profileData?.area_nombre}</div>
              </div>
            </div>
            <div style={{ marginTop: 10, fontSize: "0.78rem", color: esAdmin ? "#CC8A22" : "#92614F", fontWeight: 700 }}>
              {esAdmin ? 'Administrador' : 'Usuario'}
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

            {esAdmin ? (
              <div style={{
                marginTop: 12, padding: "10px 12px",
                background: "rgba(204,138,34,0.08)", borderRadius: 10,
                display: "flex", flexDirection: "column", gap: 8,
              }}>
                <div style={{ fontSize: "0.75rem", color: "#8A6D3B", fontWeight: 700 }}>
                  Permisos de administrador
                </div>
                <div style={{ fontSize: "0.74rem", color: "#8A6D3B" }}>
                  Puedes ver todas las reservas y confirmar manualmente cualquier reserva pendiente, incluso fuera de la ventana de 25 minutos.
                </div>
              </div>
            ) : (
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
            )}


          </div>

          {/* Tabla de reservas */}
          <div className="bienvenida-card" style={{
            flex: 1, padding: isMobile ? "16px" : "20px 24px",
            minWidth: isMobile ? 0 : "500px", boxSizing: "border-box",
            width: isMobile ? "100%" : "auto",
          }}>
            {/* ── Cabecera ──────────────────────────────────── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
              {/* Fila 1: título + toggle hoy/todas */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h2 className="bienvenida-saludo" style={{ margin: 0, fontSize: "1.05rem" }}>
                  {showAllReservations
                    ? (esAdmin ? 'Todas las ' : 'Mis ')
                    : 'Reservas de '}<span className="text-accent">{showAllReservations ? 'reservas' : 'hoy'}</span>
                </h2>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    onClick={() => setShowAllReservations((prev) => !prev)}
                    style={{
                      padding: "6px 10px", borderRadius: 8,
                      border: "1px solid rgba(80,54,41,0.25)",
                      background: "rgba(80,54,41,0.06)",
                      color: "#503629", fontSize: "0.75rem", fontWeight: 700,
                      cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    {showAllReservations ? 'Ver hoy' : (esAdmin ? 'Ver todas' : 'Ver todas mis')}
                  </button>
                </div>
              </div>

              {/* Fila 2 (admin): tabs Todas / Mis reservas / Otras */}
              {esAdmin && (
                <div style={{ display: "flex", gap: 6 }}>
                  {[
                    { key: 'todos',  label: 'Todas' },
                    { key: 'mis',    label: 'Mis reservas' },
                    { key: 'otros',  label: 'Otras' },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setAdminTab(key)}
                      style={{
                        padding: "5px 12px", borderRadius: 20,
                        border: adminTab === key
                          ? "1px solid rgba(204,138,34,0.55)"
                          : "1px solid rgba(80,54,41,0.2)",
                        background: adminTab === key
                          ? "rgba(204,138,34,0.14)"
                          : "rgba(80,54,41,0.04)",
                        color: adminTab === key ? "#8A6D3B" : "#503629",
                        fontSize: "0.73rem", fontWeight: adminTab === key ? 700 : 500,
                        cursor: "pointer", fontFamily: "inherit",
                        transition: "all 0.15s",
                      }}
                    >{label}</button>
                  ))}
                </div>
              )}

              {/* Fila 3: filtros + buscador */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                {/* Filtro estado */}
                <select
                  value={filterEstado}
                  onChange={e => setFilterEstado(e.target.value)}
                  style={{
                    padding: "6px 10px", borderRadius: 8,
                    border: "1px solid rgba(80,54,41,0.22)",
                    background: "#FDFAF7", color: "#503629",
                    fontSize: "0.75rem", fontFamily: "inherit",
                    cursor: "pointer",
                  }}
                >
                  <option value="todos">Todos los estados</option>
                  <option value="Pendiente">Pendiente</option>
                  <option value="Confirmada">Confirmada</option>
                  <option value="Cancelada">Cancelada</option>
                </select>

                {/* Filtro sala */}
                {availableSalas.length > 0 && (
                  <select
                    value={filterSala}
                    onChange={e => setFilterSala(e.target.value)}
                    style={{
                      padding: "6px 10px", borderRadius: 8,
                      border: "1px solid rgba(80,54,41,0.22)",
                      background: "#FDFAF7", color: "#503629",
                      fontSize: "0.75rem", fontFamily: "inherit",
                      cursor: "pointer",
                    }}
                  >
                    <option value="todas">Todas las salas</option>
                    {availableSalas.map(s => (
                      <option key={s.id} value={String(s.id)}>{s.nombre}</option>
                    ))}
                  </select>
                )}

                {/* Buscador */}
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={esAdmin ? "Buscar por ID, nombre, cédula…" : "Buscar por ID de reserva…"}
                  style={{
                    flex: 1, minWidth: 160,
                    padding: "6px 10px", borderRadius: 8,
                    border: "1px solid rgba(80,54,41,0.22)",
                    background: "#FDFAF7", color: "#503629",
                    fontSize: "0.75rem", fontFamily: "inherit",
                    outline: "none",
                  }}
                />
                {(searchQuery || filterEstado !== 'todos' || filterSala !== 'todas' || (esAdmin && adminTab !== 'todos')) && (
                  <button
                    onClick={() => { setSearchQuery(''); setFilterEstado('todos'); setFilterSala('todas'); setAdminTab('todos'); }}
                    style={{
                      padding: "6px 10px", borderRadius: 8,
                      border: "1px solid rgba(192,57,43,0.28)",
                      background: "rgba(192,57,43,0.06)",
                      color: "#c0392b", fontSize: "0.73rem", fontWeight: 600,
                      cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            </div>

            {filteredReservations.length === 0 && (
              <p className="text-muted" style={{ fontSize: "0.85rem", textAlign: "center", padding: "24px 0" }}>
                {reservations.length === 0
                  ? (showAllReservations ? 'No hay reservas registradas.' : 'No hay reservas para hoy.')
                  : 'No hay reservas que coincidan con los filtros.'}
              </p>
            )}

            {/* MOBILE */}
            {isMobile && filteredReservations.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {filteredReservations.map(r => {
                  const confirmMeta = getConfirmMeta(r);
                  const canAdminConfirm = esAdmin && r.estado === 'Pendiente';
                  return (
                    <ReservaCard
                      key={r.id}
                      r={r}
                      cancelando={cancelando}
                      confirmando={confirmando}
                      reactivando={reactivando}
                      onCancelar={solicitarCancelacion}
                      onConfirmar={handleConfirmar}
                      onReactivar={handleReactivar}
                      canConfirm={canAdminConfirm || (isNearPoint && confirmMeta.canByTime)}
                      confirmLabel={esAdmin ? 'Confirmar' : 'Confirmar'}
                      helperMessage={esAdmin && r.estado === 'Pendiente'
                        ? (r.documento === documentoUsuario
                            ? 'Puedes confirmar esta reserva como administrador.'
                            : 'Puedes confirmar manualmente esta reserva como administrador.')
                        : ''}
                      showOwner={esAdmin}
                      confirmBlockedMessage={confirmMeta.blockedMessage}
                      remainingMinutes={confirmMeta.remainingMinutes}
                    />
                  );
                })}
              </div>
            )}

            {/* DESKTOP */}
            {!isMobile && filteredReservations.length > 0 && (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid rgba(80,54,41,0.12)" }}>
                      {[
                        'ID',
                        ...(esAdmin ? ['Usuario'] : []),
                        'Fecha',
                        'Sala / Escritorio',
                        'Turno',
                        'Estado',
                        'Motivo',
                        'Acción',
                      ].map(h => (
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
                    {filteredReservations.map((r, i) => {
                      const hMeta = HORARIO_META[r.horarioId];
                      const turnoTexto = r.turnoLabel || hMeta?.label || '—';
                      const esCancelada = r.estado === 'Cancelada';
                      const esPendiente = r.estado === 'Pendiente';
                      const confirmMeta = getConfirmMeta(r);
                      return (
                        <tr key={r.id}
                          style={{ borderBottom: i < filteredReservations.length - 1 ? "1px solid rgba(80,54,41,0.08)" : "none", transition: "background 0.15s" }}
                          onMouseEnter={e => e.currentTarget.style.background = "rgba(146,97,79,0.04)"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        >
                          {/* ID de reserva */}
                          <td style={{ padding: "12px 12px" }}>
                            <span style={{
                              display: "inline-block",
                              padding: "2px 8px", borderRadius: 20,
                              background: "rgba(80,54,41,0.08)",
                              color: "#92614F", fontSize: "0.72rem", fontWeight: 700,
                              fontFamily: "monospace", letterSpacing: "0.02em",
                            }}>
                              #{r.id}
                            </span>
                          </td>
                          {esAdmin && (
                            <td style={{ padding: "12px 12px" }}>
                              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                <span className="text-body" style={{ fontSize: "0.82rem", fontWeight: 700 }}>
                                  {r.nombreCompleto || r.nombre}
                                </span>
                                <span style={{ fontSize: "0.72rem", color: "#92614F" }}>
                                  {r.documento || 'Sin documento'}
                                </span>
                              </div>
                            </td>
                          )}
                          {/* Fecha */}
                          <td style={{ padding: "12px 12px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <Calendar size={13} color="#CC8A22" strokeWidth={2} />
                              <span className="text-body" style={{ whiteSpace: "nowrap", fontSize: "0.82rem" }}>
                                {r.fecha !== '—'
                                  ? new Date(r.fecha + "T12:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "short" })
                                  : '—'}
                              </span>
                            </div>
                          </td>
                          {/* Sala / Escritorio */}
                          <td style={{ padding: "12px 12px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <Monitor size={13} color="#CC8A22" strokeWidth={2} />
                              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                                {r.salaNombre && (
                                  <span style={{ fontSize: "0.72rem", color: "#CC8A22", fontWeight: 600 }}>
                                    {r.salaNombre}
                                  </span>
                                )}
                                <span className="text-body" style={{ fontSize: "0.82rem" }}>
                                  {r.puestoId ? `Escritorio ${r.puestoId}` : '—'}
                                </span>
                              </div>
                            </div>
                          </td>
                          {/* Turno */}
                          <td style={{ padding: "12px 12px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <Clock size={13} color="#CC8A22" strokeWidth={2} />
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
                          {/* Motivo */}
                          <td style={{ padding: "12px 12px", maxWidth: "260px" }}>
                            <span
                              className="text-body"
                              style={{
                                fontSize: "0.78rem",
                                color: "#6B4A3A",
                                display: "inline-block",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                verticalAlign: "middle",
                                maxWidth: "240px",
                              }}
                              title={r.motivoCancelacion || r.motivoGestion || ''}
                            >
                              {r.estado === 'Cancelada'
                                ? (r.motivoCancelacion || r.motivoGestion || '—')
                                : r.estado === 'Confirmada'
                                  ? (r.motivoGestion || '—')
                                  : '—'}
                            </span>
                          </td>
                          {/* Acciones */}
                          <td style={{ padding: "12px 12px", textAlign: "right" }}>
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                              <button
                                onClick={() => handleConfirmar(r.id)}
                                disabled={confirmando === r.id || cancelando === r.id || reactivando === r.id || !esPendiente || (!esAdmin && (!isNearPoint || !confirmMeta.canByTime))}
                                style={{
                                  display: "inline-flex", alignItems: "center", gap: 5,
                                  padding: "4px 10px", borderRadius: 8,
                                  border: "1px solid rgba(21,87,36,0.35)",
                                  background: "rgba(21,87,36,0.08)",
                                  color: "#155724", fontSize: "0.75rem", fontWeight: 600,
                                  cursor: confirmando === r.id || cancelando === r.id || reactivando === r.id || !esPendiente || (!esAdmin && (!isNearPoint || !confirmMeta.canByTime)) ? "not-allowed" : "pointer",
                                  opacity: confirmando === r.id || cancelando === r.id || reactivando === r.id || !esPendiente || (!esAdmin && (!isNearPoint || !confirmMeta.canByTime)) ? 0.6 : 1,
                                  transition: "all 0.15s", fontFamily: "inherit",
                                }}
                              >
                                {confirmando === r.id ? "Confirmando…" : "Confirmar"}
                              </button>
                              <button
                                onClick={() => solicitarCancelacion(r.id)}
                                disabled={cancelando === r.id || esCancelada || cancelConfirmId === r.id || reactivando === r.id}
                                style={{
                                  display: "inline-flex", alignItems: "center", gap: 5,
                                  padding: "4px 10px", borderRadius: 8,
                                  border: "1px solid rgba(220,53,69,0.35)",
                                  background: "rgba(220,53,69,0.06)",
                                  color: "#c0392b", fontSize: "0.75rem", fontWeight: 600,
                                  cursor: cancelando === r.id || esCancelada || cancelConfirmId === r.id || reactivando === r.id ? "not-allowed" : "pointer",
                                  opacity: cancelando === r.id || esCancelada || cancelConfirmId === r.id || reactivando === r.id ? 0.6 : 1,
                                  transition: "all 0.15s", fontFamily: "inherit",
                                }}
                                onMouseEnter={e => { if (cancelando !== r.id && !esCancelada && cancelConfirmId !== r.id && reactivando !== r.id) e.currentTarget.style.background = "rgba(220,53,69,0.12)"; }}
                                onMouseLeave={e => { e.currentTarget.style.background = "rgba(220,53,69,0.06)"; }}
                              >
                                <Trash2 size={13} strokeWidth={2} />
                                {esCancelada ? "Cancelada" : cancelando === r.id ? "Cancelando…" : "Cancelar"}
                              </button>
                              {esAdmin && esCancelada && (
                                <button
                                  onClick={() => handleReactivar(r.id)}
                                  disabled={reactivando === r.id || cancelando === r.id || confirmando === r.id}
                                  style={{
                                    display: "inline-flex", alignItems: "center", gap: 5,
                                    padding: "4px 10px", borderRadius: 8,
                                    border: "1px solid rgba(204,138,34,0.35)",
                                    background: "rgba(204,138,34,0.1)",
                                    color: "#8A6D3B", fontSize: "0.75rem", fontWeight: 700,
                                    cursor: reactivando === r.id || cancelando === r.id || confirmando === r.id ? "not-allowed" : "pointer",
                                    opacity: reactivando === r.id || cancelando === r.id || confirmando === r.id ? 0.6 : 1,
                                    transition: "all 0.15s", fontFamily: "inherit",
                                  }}
                                >
                                  {reactivando === r.id ? "Reactivando…" : "Reactivar"}
                                </button>
                              )}
                            </div>
                            {esPendiente && (
                              <div style={{ marginTop: 6, fontSize: "0.7rem", color: "#8A6D3B", textAlign: "right" }}>
                                {esAdmin
                                  ? 'Confirmación manual disponible para administrador.'
                                  : (confirmMeta.remainingMinutes != null && confirmMeta.remainingMinutes > 0
                                      ? `Quedan ${confirmMeta.remainingMinutes} min para confirmar`
                                      : (confirmMeta.blockedMessage || 'Pendiente de confirmación'))}
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

            <div style={{ marginTop: "12px" }}>
              <label
                htmlFor="cancel-reason"
                style={{ display: "block", marginBottom: "6px", color: "#503629", fontSize: "0.78rem", fontWeight: 600 }}
              >
                Motivo de cancelación
              </label>
              <textarea
                id="cancel-reason"
                value={cancelReason}
                onChange={(e) => {
                  setCancelReason(e.target.value);
                  if (cancelReasonError) setCancelReasonError('');
                }}
                placeholder="Escribe el motivo"
                rows={3}
                style={{
                  width: "100%",
                  resize: "vertical",
                  borderRadius: "8px",
                  border: `1px solid ${cancelReasonError ? 'rgba(192,57,43,0.6)' : 'rgba(80,54,41,0.25)'}`,
                  padding: "8px 10px",
                  fontSize: "0.82rem",
                  fontFamily: "inherit",
                  color: "#503629",
                  boxSizing: "border-box",
                }}
              />
              {cancelReasonError && (
                <div style={{ marginTop: "6px", fontSize: "0.74rem", color: "#c0392b" }}>
                  {cancelReasonError}
                </div>
              )}
            </div>

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



