import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { User, Calendar, Monitor, Clock, Armchair, ArrowLeft, Trash2, LogOut, ChevronDown, CheckCircle2, AlertCircle, RotateCcw, X } from 'lucide-react';
import { Table, Select, Input, Button, Segmented, Space, Tag, Dropdown } from 'antd';
import axios from 'axios';
import { cancelReserva, updateReservaWithVerification } from "../../utils/reservasService";
import useMobile from '../../hooks/useMobile';
import useRealtimeSync from '../../hooks/useRealtimeSync';
import { ADMIN_DOCUMENTS, HORARIO_META, getPuestoId, getHorarioId, toEstado } from '../../utils/reservaCommon';
import { clearSession, getSession } from '../../utils/sessionFlow';
import GlobalNavBar from './GlobalNavBar';
import {
  calculateDistance,
  checkGeolocationSupport,
  getCurrentPosition,
  getVerificationTimeInfo,
  getWorkplaceInfo,
  verifyAttendance,
} from "../../utils/geolocationService";

const BASE = 'https://macfer.crepesywaffles.com';
const API_RESERVAS = `${BASE}/api/working-reservas`;

// Chevron con rotación
const IconChevron = ({ open }) => (
  <div style={{ transition: 'transform 0.25s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
    <ChevronDown size={14} strokeWidth={2.5} />
  </div>
);

// ── Helpers ───────────────────────────────────────────────────
const getNombreCompleto = (nombre = '') => String(nombre ?? '').trim();

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
      salaId: salaData.id ?? null,
      salaNombre: salaData.attributes?.nombre ?? `Sala ${salaData.id}`,
    };
  }
  return { salaId: null, salaNombre: null };
};

const getEstadoReserva = (attrs = {}) => {
  const motivo = String(attrs?.motivo_cancelacion ?? attrs?.motivoCancelacion ?? '').trim();
  const tipoVerificacion = String(attrs?.verificacionAsistencia?.tipo ?? '').toLowerCase();

  // Si la última acción fue una reactivación, el estado backend es null (Pendiente)
  // y tiene prioridad sobre cualquier motivo de cancelación anterior.
  if (tipoVerificacion === 'reactivacion-admin') return toEstado(attrs?.estado);

  const fueCanceladaManualmente = motivo.length > 0 || tipoVerificacion.includes('cancelacion');
  if (fueCanceladaManualmente) return 'Cancelada';
  return toEstado(attrs?.estado);
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
  const actionBusy = confirmando === r.id || cancelando === r.id || reactivando === r.id;
  const confirmDisabled =
    actionBusy ||
    !esPendiente ||
    !canConfirm;
  const cancelDisabled = cancelando === r.id || esCancelada || reactivando === r.id;
  const reactivateDisabled = actionBusy;

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
            background: esCancelada ? "#c0392b" : esPendiente ? "#f39c12" : "#27ae60",
            color: "#fff",
            border: "none",
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
              <Calendar size={13} color="#CC8A22" strokeWidth={2} />
              <span className="text-body" style={{ fontSize: "0.82rem" }}>
                {new Date(r.fecha + "T12:00:00").toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" })}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Clock size={13} color="#CC8A22" strokeWidth={2} />
              <span className="text-body" style={{ fontSize: "0.82rem" }}>
                {hMeta?.hora ? (() => {
                  // Convertir de formato 12h a 24h
                  const convertir12a24 = (hora12) => {
                    const partes = hora12.match(/(\d+):(\d+)\s*(am|pm|m)/i);
                    if (!partes) return hora12;
                    let [, horas, minutos, periodo] = partes;
                    horas = parseInt(horas);
                    periodo = (periodo || '').toLowerCase();

                    if (periodo === 'pm' || periodo === 'p') {
                      if (horas !== 12) horas += 12;
                    } else if ((periodo === 'am' || periodo === 'a' || periodo === 'm') && horas === 12) {
                      horas = 0;
                    }

                    return `${String(horas).padStart(2, '0')}:${minutos}`;
                  };

                  // Procesar horario (ej: "8:00 am – 5:00 pm")
                  const partes = hMeta.hora.split(/[–—-]/).map(p => p.trim());
                  const inicio = convertir12a24(partes[0]);
                  const fin = convertir12a24(partes[1]);

                  return `${inicio} - ${fin}`;
                })() : turnoTexto}
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
                : (confirmBlockedMessage || ''))}
            </div>
          )}
          <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'confirmar',
                    label: 'Confirmar',
                    onClick: () => onConfirmar(r.id),
                    disabled: confirmDisabled,
                  },
                  {
                    key: 'cancelar',
                    label: 'Cancelar',
                    onClick: () => onCancelar(r.id),
                    disabled: cancelDisabled,
                  },
                  ...(showOwner && esCancelada ? [{
                    key: 'reactivar',
                    label: 'Reactivar',
                    onClick: () => onReactivar(r.id),
                    disabled: reactivateDisabled,
                  }] : []),
                ]
              }}
              trigger={['click']}
            >
              <Button
                type="default"
                style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem' }}
              >
                Acciones <ChevronDown size={14} />
              </Button>
            </Dropdown>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Panel principal ───────────────────────────────────────────
const Panel = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const session = getSession();
  const datosEmpleado = location.state?.datosEmpleado || session?.datosEmpleado || null;
  const isMobile = useMobile();
  const workplaceInfo = getWorkplaceInfo();
  const geoSupport = checkGeolocationSupport();

  const documentoUsuario = String(datosEmpleado?.documento || datosEmpleado?.document_number || '');
  const esAdmin = ADMIN_DOCUMENTS.includes(documentoUsuario);
  const [isNavigating, setIsNavigating] = useState(false);

  const handleLogout = useCallback(() => {
    if (isNavigating) return;
    setIsNavigating(true);
    clearSession();
    navigate('/', { replace: true });
  }, [isNavigating, navigate]);

  const handleGoBack = useCallback(() => {
    if (isNavigating) return;
    setIsNavigating(true);
    navigate('/salas', { replace: true, state: { datosEmpleado } });
  }, [isNavigating, navigate, datosEmpleado]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelando, setCancelando] = useState(null);
  const [confirmando, setConfirmando] = useState(null);
  const [reactivando, setReactivando] = useState(null);
  const [reactivadaExitosa, setReactivadaExitosa] = useState(false);
  const [cancelConfirmId, setCancelConfirmId] = useState(null);
  const [conflictoReactivar, setConflictoReactivar] = useState(null);
  const [confirmadaExitosa, setConfirmadaExitosa] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelReasonError, setCancelReasonError] = useState('');
  const [isNearPoint, setIsNearPoint] = useState(false);
  const [distanceMeters, setDistanceMeters] = useState(null);
  const [locationChecking, setLocationChecking] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [nowMs, setNowMs] = useState(Date.now());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEstado, setFilterEstado] = useState('todos');
  const [adminTab, setAdminTab] = useState(esAdmin ? 'mis' : 'todos');

  // Ref siempre actualizado para evitar closures obsoletos en handlers
  const reservationsRef = useRef(reservations);
  useEffect(() => { reservationsRef.current = reservations; }, [reservations]);

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
        blockedMessage: '',
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

      const url =
        `${API_RESERVAS}` +
        `?sort[0]=fecha_reserva:desc&sort[1]=id:desc` +
        filtroDocumento +
        `&populate[working_puestos][fields][0]=id&populate[working_puestos][fields][1]=nombre` +
        `&populate[working_puestos][populate][working_sala][fields][0]=id` +
        `&populate[working_puestos][populate][working_sala][fields][1]=nombre` +
        `&populate[working_horarios][fields][0]=id&populate[working_horarios][fields][1]=nombre` +
        `&pagination[pageSize]=40000`;

      const { data: json } = await axios.get(url);
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

        const tipoVerifNorm = String(r.attributes?.verificacionAsistencia?.tipo ?? '').toLowerCase();
        const fueReactivada = tipoVerifNorm === 'reactivacion-admin' && r.attributes?.estado === null;

        return {
          id: r.id,
          nombre: getNombreCompleto(r.attributes?.Nombre ?? r.attributes?.documento ?? '—').split(/\s+/).slice(0, 2).join(' '),
          nombreCompleto: getNombreCompleto(r.attributes?.Nombre ?? r.attributes?.documento ?? '—'),
          foto: r.attributes?.foto ?? null,
          documento: r.attributes?.documento ?? '—',
          area: r.attributes?.area ?? '—',
          fecha: r.attributes?.fecha_reserva ?? '—',
          estado: getEstadoReserva(r.attributes),
          confirmada: r.attributes?.estado === true,
          pendiente: r.attributes?.estado === null,
          cancelada: r.attributes?.estado === false,
          reactivadaPorAdmin: fueReactivada,
          motivoCancelacion: fueReactivada ? null : (r.attributes?.motivo_cancelacion ?? r.attributes?.motivoCancelacion ?? null),
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
  }, [documentoUsuario, esAdmin]);

  useEffect(() => {
    if (datosEmpleado?.documento || datosEmpleado?.document_number) {
      cargarReservas();
    }
  }, [datosEmpleado?.documento, datosEmpleado?.document_number, cargarReservas]);

  // ── Sincronización en tiempo real con eventos de socket  ──────────────────────
  const { notifyChange } = useRealtimeSync(cargarReservas);

  useEffect(() => {
    void refreshLocationStatus(true);
  }, [refreshLocationStatus]);

  const handleConfirmar = async (id) => {
    const reservaAux = reservationsRef.current.find(r => r.id === id);
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

        setConfirmadaExitosa({
          mensaje: 'Reserva confirmada por administrador.',
          puestoId: reservaAux.puestoId,
          fecha: reservaAux.fecha,
          turnoLabel: reservaAux.turnoLabel,
        });

        // 🔌 Emitir evento del socket para notificar cambios
        if (notifyChange) {
          notifyChange();
        }
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

      if (estadoNuevo === 'Confirmada') {
        setConfirmadaExitosa({
          mensaje: evaluation.message || 'Reserva confirmada.',
          puestoId: reservaAux.puestoId,
          fecha: reservaAux.fecha,
          turnoLabel: reservaAux.turnoLabel,
        });
      } else {
        alert(evaluation.message || 'Reserva actualizada.');
      }

      // 🔌 Emitir evento del socket para notificar cambios
      if (notifyChange) {
        notifyChange();
      }
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

    const reservaAux = reservationsRef.current.find(r => r.id === id);
    if (!reservaAux || reservaAux.estado !== 'Cancelada') {
      return;
    }

    setReactivando(id);
    try {
      // ── Verificar que el puesto esté libre antes de reactivar ──────────────
      const { puestoId, fecha, horarioId } = reservaAux;
      if (puestoId && fecha) {
        // Traer TODAS las reservas del día y filtrar client-side por puesto.
        // Evitamos el filtro de relación de Strapi que puede no funcionar bien.
        const checkUrl =
          `${API_RESERVAS}?filters[fecha_reserva][$eq]=${fecha}` +
          `&populate[working_puestos][fields][0]=id` +
          `&populate[working_horarios][fields][0]=id` +
          `&pagination[pageSize]=500`;
        const { data: checkJson } = await axios.get(checkUrl);
        const existentes = Array.isArray(checkJson.data) ? checkJson.data : [];

        const conflicto = existentes.find((rc) => {
          if (rc.id === id) return false; // ignorar la propia reserva cancelada

          // Solo considerar reservas del mismo puesto
          const puestoRc = getPuestoId(rc);
          if (puestoRc !== puestoId) return false;

          // Ignorar reservas canceladas
          const estadoRc = getEstadoReserva(rc.attributes);
          if (estadoRc === 'Cancelada') return false;

          // Si no podemos determinar los horarios, bloqueamos por seguridad
          const hId = getHorarioId(rc);
          if (horarioId == null || hId == null) return true;

          // Completo (3) choca con AM, PM y Completo.
          // AM (1) y PM (2) solo chocan si son iguales entre sí o contra Completo.
          const horariosConflictivos = horarioId === 3 ? [1, 2, 3] : [horarioId, 3];
          return horariosConflictivos.includes(hId);
        });

        if (conflicto) {
          setConflictoReactivar(
            `El puesto ${puestoId} ya tiene una reserva activa para esa fecha y turno. Solo puedes reactivarla cuando el puesto esté libre.`
          );
          return;
        }
      }
      // ─────────────────────────────────────────────────────────────────────

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
              reactivadaPorAdmin: true,
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

      setReactivadaExitosa(true);

      // 🔌 Emitir evento del socket para notificar cambios
      if (notifyChange) {
        notifyChange();
      }
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
      const reservaAux = reservationsRef.current.find(r => r.id === id);
      await cancelReserva(id, reservaAux, motivoCancelacion);
      // Actualización local inmediata (sin recargar página)
      setReservations(prev =>
        prev.map(r => r.id === id ? {
          ...r,
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

      // 🔌 Emitir evento del socket para notificar cambios
      if (notifyChange) {
        notifyChange();
      }
    } catch (err) {
      console.error(err);
      alert('Error al cancelar la reserva. Intenta de nuevo.');
    } finally {
      setCancelando(null);
    }
  };

  const solicitarCancelacion = useCallback((id) => {
    setCancelConfirmId(id);
    setCancelReason('');
    setCancelReasonError('');
  }, []);

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

  const reservaEnConfirmacion = reservations.find(r => r.id === cancelConfirmId) || null;

  // Reservas filtradas para el panel
  const filteredReservations = useMemo(() => {
    let result = reservations;

    if (!esAdmin) {
      return result;
    }

    // Admin tabs: mis / otros / todos
    if (adminTab === 'mis') result = result.filter(r => r.documento === documentoUsuario);
    else if (adminTab === 'otros') result = result.filter(r => r.documento !== documentoUsuario);
    // Filtro por estado
    if (filterEstado !== 'todos') result = result.filter(r => r.estado === filterEstado);
    // Búsqueda global
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(r =>
        String(r.id).includes(q) ||
        (r.nombreCompleto ?? '').toLowerCase().includes(q) ||
        (r.nombre ?? '').toLowerCase().includes(q) ||
        (r.documento ?? '').toLowerCase().includes(q) ||
        String(r.puestoId ?? '').includes(q) ||
        (r.salaNombre ?? '').toLowerCase().includes(q) ||
        (r.turnoLabel ?? '').toLowerCase().includes(q) ||
        (r.estado ?? '').toLowerCase().includes(q) ||
        (r.fecha ?? '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [reservations, esAdmin, adminTab, filterEstado, searchQuery, documentoUsuario]);

  const desktopColumns = useMemo(() => {
    const columns = [
      {
        title: 'ID',
        key: 'id',
        width: 70,
        align: 'center',
        render: (_, r) => (
          <span style={{ fontSize: "0.82rem" }}>
            {r.id}
          </span>
        ),
      },
      ...(esAdmin ? [{
        title: 'Datos del usuario',
        align: 'center',
        children: [
          {
            title: 'Nombre',
            key: 'nombre',
            align: 'center',
            render: (_, r) => (
              <span className="text-body" style={{ fontSize: "0.82rem" }}>
                {r.nombreCompleto || r.nombre}
              </span>
            ),
          },
          {
            title: 'Identificación',
            key: 'documento',
            align: 'center',
            render: (_, r) => (
              <span style={{ fontSize: "0.82rem" }}>
                {r.documento || '—'}
              </span>
            ),
          },
        ],
      }] : []),
      {
        title: 'Detalles de reserva',
        align: 'center',
        children: [
          {
            title: 'Fecha',
            key: 'fecha',
            align: 'center',
            render: (_, r) => (
              <span className="text-body" style={{ whiteSpace: "nowrap", fontSize: "0.82rem" }}>
                {r.fecha !== '—'
                  ? new Date(r.fecha + "T12:00:00").toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" })
                  : '—'}
              </span>
            ),
          },
          {
            title: 'Escritorio',
            key: 'salaEscritorio',
            align: 'center',
            render: (_, r) => (
              <span className="text-body" style={{ fontSize: "0.82rem" }}>
                {r.puestoId ?? '—'}
              </span>
            ),
          },
          {
            title: 'Horario',
            key: 'turno',
            align: 'center',
            render: (_, r) => {
              const hMeta = HORARIO_META[r.horarioId];
              if (!hMeta?.hora) return <span className="text-body" style={{ whiteSpace: "nowrap", fontSize: "0.82rem" }}>—</span>;

              // Convertir de formato 12h a 24h
              const convertir12a24 = (hora12) => {
                const partes = hora12.match(/(\d+):(\d+)\s*(am|pm|m)/i);
                if (!partes) return hora12;
                let [, horas, minutos, periodo] = partes;
                horas = parseInt(horas);
                periodo = (periodo || '').toLowerCase();

                if (periodo === 'pm' || periodo === 'p') {
                  if (horas !== 12) horas += 12;
                } else if ((periodo === 'am' || periodo === 'a' || periodo === 'm') && horas === 12) {
                  horas = 0;
                }

                return `${String(horas).padStart(2, '0')}:${minutos}`;
              };

              // Procesar horario (ej: "8:00 am – 5:00 pm")
              const partes = hMeta.hora.split(/[–—-]/).map(p => p.trim());
              const inicio = convertir12a24(partes[0]);
              const fin = convertir12a24(partes[1]);

              return (
                <span className="text-body" style={{ whiteSpace: "nowrap", fontSize: "0.82rem" }}>
                  {inicio} - {fin}
                </span>
              );
            },
          },
        ],
      },
      {
        title: 'Estado',
        key: 'estado',
        align: 'center',
        render: (_, r) => {
          const esCancelada = r.estado === 'Cancelada';
          const esPendiente = r.estado === 'Pendiente';
          const colorMap = {
            'Cancelada': '#c03a2bd0',
            'Pendiente': '#f39d12d0',
            'Confirmada': '#27ae5fd0'
          };
          return (
            <Tag
              style={{
                marginInlineEnd: 0,
                borderRadius: '999px',
                fontSize: '0.72rem',
                fontWeight: 700,
                paddingInline: 10,
                backgroundColor: colorMap[r.estado] || '#95a5a6',
                color: '#fff',
                border: 'none'
              }}
            >
              {r.estado}
            </Tag>
          );
        },
      },
      {
        title: 'Motivo',
        key: 'motivo',
        align: 'center',
        ellipsis: true,
        render: (_, r) => {
          const valor = r.estado === 'Cancelada'
            ? (r.motivoCancelacion || r.motivoGestion || 'Ninguno')
            : r.estado === 'Confirmada'
              ? (r.motivoGestion || 'Ninguno')
              : 'Ninguno';
          return (
            <span className="text-body" style={{ fontSize: "0.82rem" }} title={valor}>
              {valor}
            </span>
          );
        },
      },
      {
        title: 'Acciones',
        key: 'accion',
        align: 'center',
        render: (_, r) => {
          const esCancelada = r.estado === 'Cancelada';
          const esPendiente = r.estado === 'Pendiente';
          const confirmMeta = getConfirmMeta(r);
          const actionBusy = confirmando === r.id || cancelando === r.id || reactivando === r.id;
          const confirmDisabled = actionBusy || !esPendiente || (r.reactivadaPorAdmin && !esAdmin) || (!esAdmin && (!isNearPoint || !confirmMeta.canByTime));
          const cancelDisabled = cancelando === r.id || esCancelada || cancelConfirmId === r.id || reactivando === r.id;
          const reactivateDisabled = actionBusy;

          const actionItems = [
            {
              key: 'confirmar',
              label: 'Confirmar',
              onClick: () => handleConfirmar(r.id),
              disabled: confirmDisabled,
            },
            {
              key: 'cancelar',
              label: 'Cancelar',
              onClick: () => solicitarCancelacion(r.id),
              disabled: cancelDisabled,
            },
            ...(esAdmin && esCancelada ? [{
              key: 'reactivar',
              label: 'Reactivar',
              onClick: () => handleReactivar(r.id),
              disabled: reactivateDisabled,
            }] : []),
          ];

          return (
            <Dropdown
              menu={{ items: actionItems }}
              trigger={['click']}
            >
              <Button
                type="default"
                size="small"
                style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem' }}
              >
                Acciones <ChevronDown size={14} />
              </Button>
            </Dropdown>
          );
        },
      },
    ];

    return columns;
  }, [
    esAdmin,
    getConfirmMeta,
    confirmando,
    cancelando,
    reactivando,
    isNearPoint,
    cancelConfirmId,
  ]);

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
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
      justifyContent: "flex-start",
      overflow: "hidden",
      padding: isMobile ? "64px 16px 16px" : "76px 24px 28px",
      height: "100vh",
    }}>
      <GlobalNavBar
        onLogout={handleLogout}
        onGoBack={handleGoBack}
        onGoToPanel={() => navigate('/panel', { state: { datosEmpleado }, replace: true })}
        isNavigating={isNavigating}
        datosEmpleado={esAdmin ? datosEmpleado : null}
        showMisReservas={false}
      />

      <div style={{
        width: "100%",
        flex: 1,
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        alignItems: isMobile ? "stretch" : "flex-start",
        gap: "16px",
        marginBottom: isMobile ? "12px" : "0",
        minWidth: 0,
        minHeight: 0,
        overflow: "auto",
      }}>
        {/* Tarjeta de Usuario - Solo para usuarios normales */}
        {isMobile && !esAdmin && (
          <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
            {(() => {
              const nombre = String(datosEmpleado?.nombre || '').trim();
              const primerNombre = nombre ? nombre.split(/\s+/)[0] : 'Usuario';
              const cargo = String(datosEmpleado?.cargo || 'Sin cargo').trim();
              const area = String(datosEmpleado?.area_nombre || datosEmpleado?.area || 'Sin área').trim();

              return (
                <div className="bienvenida-card" style={{ width: "100%", margin: 0 }}>
                  <div className="bienvenida-avatar" style={{ marginBottom: "12px" }}>
                    {datosEmpleado?.foto && datosEmpleado.foto !== "null" ? (
                      <img src={datosEmpleado?.foto} alt="Foto" className="bienvenida-foto" />
                    ) : (
                      <div className="bienvenida-foto-placeholder">
                        <User size={32} color="#92614F" strokeWidth={2} />
                      </div>
                    )}
                  </div>

                  <h1 className="bienvenida-saludo" style={{ marginBottom: "10px" }}>
                    ¡Hola, {primerNombre}!
                  </h1>

                  {!esAdmin && (
                    <div style={{
                      marginTop: "14px",
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: "1px dashed rgba(80,54,41,0.15)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      width: "100%",
                      boxSizing: "border-box",
                    }}>
                      <div style={{ fontSize: "0.75rem", color: "#503629", fontWeight: 700 }}>
                        Confirmación por ubicación
                      </div>
                      <div style={{ fontSize: "0.74rem", color: isNearPoint ? "#155724" : "#8A6D3B" }}>
                        {isNearPoint
                          ? `Estás dentro del perímetro (${Math.round(distanceMeters || 0)} m).`
                          : `Para confirmar, debes estar dentro del perímetro de ${workplaceInfo.radius} m.`}
                      </div>
                      {!!locationError && (
                        <div style={{ fontSize: "0.72rem", color: "#c0392b" }}>{locationError}</div>
                      )}
                      <button
                        onClick={() => void refreshLocationStatus()}
                        disabled={locationChecking}
                        style={{
                          padding: "8px 10px",
                          borderRadius: 8,
                          border: "1px dashed rgba(80,54,41,0.15)",
                          background: "transparent",
                          color: "#503629",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          cursor: locationChecking ? "not-allowed" : "pointer",
                          opacity: locationChecking ? 0.7 : 1,
                        }}
                      >
                        {locationChecking ? "Verificando ubicación…" : "Actualizar ubicación"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* Tarjeta de Usuario (Desktop) - Solo para usuarios normales */}
        {!isMobile && !esAdmin && (
          <div style={{ flex: "0 0 auto", display: "flex", justifyContent: "center" }}>
            {(() => {
              const nombre = String(datosEmpleado?.nombre || '').trim();
              const primerNombre = nombre ? nombre.split(/\s+/)[0] : 'Usuario';
              const cargo = String(datosEmpleado?.cargo || 'Sin cargo').trim();
              const area = String(datosEmpleado?.area_nombre || datosEmpleado?.area || 'Sin área').trim();

              return (
                <div className="bienvenida-card" style={{ width: "280px", margin: 0 }}>
                  <div className="bienvenida-avatar" style={{ marginBottom: "12px" }}>
                    {datosEmpleado?.foto && datosEmpleado.foto !== "null" ? (
                      <img src={datosEmpleado?.foto} alt="Foto" className="bienvenida-foto" style={{ width: "72px", height: "72px" }} />
                    ) : (
                      <div className="bienvenida-foto-placeholder" style={{ width: "72px", height: "72px" }}>
                        <User size={28} color="#92614F" strokeWidth={2} />
                      </div>
                    )}
                  </div>

                  <h1 className="bienvenida-saludo" style={{ marginBottom: "10px" }}>
                    ¡Hola, {primerNombre}!
                  </h1>

                  {!esAdmin && (
                    <div style={{
                      marginTop: "14px",
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: "1px dashed rgba(80,54,41,0.15)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      width: "100%",
                      boxSizing: "border-box",
                    }}>
                      <div style={{ fontSize: "0.75rem", color: "#503629", fontWeight: 700 }}>
                        Confirmación por ubicación
                      </div>
                      <div style={{ fontSize: "0.74rem", color: isNearPoint ? "#155724" : "#8A6D3B" }}>
                        {isNearPoint
                          ? `Estás dentro del perímetro (${Math.round(distanceMeters || 0)} m).`
                          : `Para confirmar, debes estar dentro del perímetro de ${workplaceInfo.radius} m.`}
                      </div>
                      {!!locationError && (
                        <div style={{ fontSize: "0.72rem", color: "#c0392b" }}>{locationError}</div>
                      )}
                      <button
                        onClick={() => void refreshLocationStatus()}
                        disabled={locationChecking}
                        style={{
                          padding: "8px 10px",
                          borderRadius: 8,
                          border: "1px dashed rgba(80,54,41,0.15)",
                          background: "transparent",
                          color: "#503629",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          cursor: locationChecking ? "not-allowed" : "pointer",
                          opacity: locationChecking ? 0.7 : 1,
                        }}
                      >
                        {locationChecking ? "Verificando ubicación…" : "Actualizar ubicación"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* Tabla de reservas */}
        <div className="bienvenida-card" style={{
          flex: 1,
          padding: isMobile ? "16px" : "20px 24px",
          minWidth: 0,
          minHeight: 0,
          boxSizing: "border-box",
          width: isMobile ? "100%" : "auto",
          overflow: "auto",
        }}>
          {/* ── Cabecera ──────────────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 className="bienvenida-saludo" style={{ margin: 0, fontSize: "1.05rem" }}>Mis reservas</h2>
            </div>

            {/* Fila 2 (admin): tabs Todas / Mis reservas / Otras */}
            {esAdmin && (
              <Segmented
                block={isMobile}
                value={adminTab}
                onChange={(value) => setAdminTab(String(value))}
                options={[
                  { value: 'todos', label: 'Todas' },
                  { value: 'mis', label: 'Mis reservas' },
                  { value: 'otros', label: 'Otras' },
                ]}
              />
            )}

            {/* Fila 3: filtros + buscador */}
            {esAdmin && (
              isMobile ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
                  <div style={{ display: 'flex', gap: 6, width: '100%' }}>
                    <Select
                      value={filterEstado}
                      onChange={setFilterEstado}
                      size="small"
                      options={[
                        { value: 'todos', label: 'Estados' },
                        { value: 'Pendiente', label: 'Pendiente' },
                        { value: 'Confirmada', label: 'Confirmada' },
                        { value: 'Cancelada', label: 'Cancelada' },
                      ]}
                      style={{ flex: '0 0 130px' }}
                    />

                    <Input
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      allowClear
                      placeholder="Búsqueda"
                      size="small"
                      style={{ flex: 1 }}
                    />
                  </div>

                  {(searchQuery || filterEstado !== 'todos' || adminTab !== 'todos') && (
                    <Button
                      onClick={() => { setSearchQuery(''); setFilterEstado('todos'); setAdminTab('todos'); }}
                      danger
                      size="small"
                      block
                    >
                      Limpiar
                    </Button>
                  )}
                </div>
              ) : (
                <Space wrap size={6} style={{ width: '100%' }}>
                  <Select
                    value={filterEstado}
                    onChange={setFilterEstado}
                    size="small"
                    options={[
                      { value: 'todos', label: 'Estados' },
                      { value: 'Pendiente', label: 'Pendiente' },
                      { value: 'Confirmada', label: 'Confirmada' },
                      { value: 'Cancelada', label: 'Cancelada' },
                    ]}
                    style={{
                      minWidth: 140,
                    }}
                  />

                  <Input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    allowClear
                    placeholder="Búsqueda"
                    size="small"
                    style={{
                      flex: 1, minWidth: 150,
                    }}
                  />
                  {(searchQuery || filterEstado !== 'todos' || adminTab !== 'todos') && (
                    <Button
                      onClick={() => { setSearchQuery(''); setFilterEstado('todos'); setAdminTab('todos'); }}
                      danger
                      size="small"
                    >
                      Limpiar
                    </Button>
                  )}
                </Space>
              )
            )}
          </div>

          {filteredReservations.length === 0 && (
            <p className="text-muted" style={{ fontSize: "0.85rem", textAlign: "center", padding: "24px 0" }}>
              {reservations.length === 0
                ? 'No hay reservas registradas.'
                : 'No hay reservas que coincidan con los filtros aplicados.'}
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
                    canConfirm={canAdminConfirm || (!r.reactivadaPorAdmin && isNearPoint && confirmMeta.canByTime)}
                    helperMessage={esAdmin && r.estado === 'Pendiente'
                      ? (r.documento === documentoUsuario
                        ? ''
                        : '')
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
            <Table
              size="small"
              columns={desktopColumns}
              dataSource={filteredReservations}
              rowKey="id"
              bordered
              style={{ width: '100%' }}
              scroll={{ x: 'max-content' }}
              pagination={{
                pageSize: 8,
                showSizeChanger: false,
                hideOnSinglePage: true,
              }}
            />
          )}

        </div>
      </div>

      {cancelConfirmId != null && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-content">
              <h3 className="modal-title modal-title--warning">Confirmar cancelación</h3>
              <p className="modal-message">¿Seguro de cancelar su reserva?</p>
              {reservaEnConfirmacion && (
                <p className="modal-detail">
                  Escritorio {reservaEnConfirmacion.puestoId ?? '—'} · {reservaEnConfirmacion.fecha || '—'}
                </p>
              )}
            </div>

            <div className="modal-form-group">
              <label htmlFor="cancel-reason" className="modal-label">
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
                className={`modal-textarea ${cancelReasonError ? 'error' : ''}`}
              />
              {cancelReasonError && (
                <div className="modal-error-message">{cancelReasonError}</div>
              )}
            </div>

            <div className="modal-buttons">
              <button
                onClick={cerrarConfirmacionCancelacion}
                className="modal-button"
                style={{ background: '#f5f5f5', color: '#666' }}
              >
                Cerrar
              </button>
              <button
                onClick={confirmarCancelacion}
                className="modal-button modal-button--error"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmadaExitosa && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-content">
              <h3 className="modal-title modal-title--success">¡Excelente!</h3>
              <p className="modal-message">{confirmadaExitosa.mensaje}</p>
              {(confirmadaExitosa.puestoId || confirmadaExitosa.fecha) && (
                <p className="modal-detail">
                  {confirmadaExitosa.puestoId ? `Escritorio ${confirmadaExitosa.puestoId}` : ''}
                  {confirmadaExitosa.puestoId && confirmadaExitosa.fecha ? ' · ' : ''}
                  {confirmadaExitosa.fecha
                    ? new Date(confirmadaExitosa.fecha + 'T12:00:00').toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })
                    : ''}
                  {confirmadaExitosa.turnoLabel ? ` · ${confirmadaExitosa.turnoLabel}` : ''}
                </p>
              )}
            </div>
            <button
              onClick={() => setConfirmadaExitosa(null)}
              className="modal-button modal-button--success"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {reactivadaExitosa && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-content">
              <h3 className="modal-title modal-title--success">¡Reactivada!</h3>
              <p className="modal-message">La reserva fue reactivada exitosamente como Pendiente.</p>
            </div>
            <button
              onClick={() => setReactivadaExitosa(false)}
              className="modal-button modal-button--success"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {conflictoReactivar && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-content">
              <h3 className="modal-title modal-title--error">No se puede reactivar</h3>
              <p className="modal-message">{conflictoReactivar}</p>
            </div>
            <button
              onClick={() => setConflictoReactivar(null)}
              className="modal-button modal-button--error"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Panel;



