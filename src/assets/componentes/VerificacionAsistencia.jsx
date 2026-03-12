import React, { useCallback, useMemo, useState } from 'react';
import { message } from 'antd';
import {
  checkGeolocationSupport,
  checkLocationPermission,
  getPermissionInstructions,
  getWorkplaceInfo,
  requestLocationPermission,
  verifyAttendance,
} from '../../utils/geolocationService';

const BASE = 'https://macfer.crepesywaffles.com';
const API_VERIFICAR_ASISTENCIA = `${BASE}/api/working-verificacions`;

const mapEstadoFromApi = (value) => {
  if (value === true) return 'Confirmada';
  if (value === false) return 'Cancelada';
  if (value == null) return 'Pendiente';

  const normalized = String(value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (normalized === 'confirmada' || normalized === 'confirmado' || normalized === 'completada' || normalized === 'completado') {
    return 'Confirmada';
  }

  if (normalized === 'cancelada' || normalized === 'cancelado') {
    return 'Cancelada';
  }

  if (normalized === 'pendiente') return 'Pendiente';
  return 'Pendiente';
};

const extractEstadoFromPayload = (payload) => {
  const candidates = [
    payload?.data?.attributes?.working_reserva?.data?.estado,
    payload?.data?.attributes?.working_reserva?.data?.attributes?.estado,
    payload?.data?.attributes?.working_reserva?.attributes?.estado,
    payload?.data?.attributes?.working_reserva?.estado,
    payload?.data?.attributes?.working_reserva,
    payload?.data?.attributes?.reserva?.data?.attributes?.estado,
    payload?.data?.attributes?.reserva?.attributes?.estado,
    payload?.data?.attributes?.reserva?.estado,
    payload?.data?.attributes?.estado,
    payload?.data?.estado,
    payload?.data?.reserva?.estado,
    payload?.reserva?.estado,
    payload?.newStatus,
    payload?.attributes?.estado,
    payload?.estado,
  ];

  for (const value of candidates) {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }

  return null;
};

const extractEstadoBoolean = (...values) => {
  for (const value of values) {
    if (typeof value === 'boolean') {
      return value;
    }
  }

  return null;
};

const findVerificacionByReserva = async (reservaId) => {
  const params = new URLSearchParams({
    'filters[working_reserva][id][$eq]': String(reservaId),
    'pagination[pageSize]': '1',
  });

  const response = await fetch(`${API_VERIFICAR_ASISTENCIA}?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error?.message || payload?.message || `Error ${response.status}`);
  }

  const list = Array.isArray(payload?.data) ? payload.data : [];
  return list[0] ?? null;
};

const postVerificarAsistencia = async ({ reservaId, lat, lng }) => {
  const verificacionExistente = await findVerificacionByReserva(reservaId);
  const requestPayload = {
    data: {
      lat,
      lng,
      reservaId,
      working_reserva: reservaId,
    },
  };

  const targetUrl = verificacionExistente
    ? `${API_VERIFICAR_ASISTENCIA}/${verificacionExistente.id}`
    : API_VERIFICAR_ASISTENCIA;

  const response = await fetch(targetUrl, {
    method: verificacionExistente ? 'PUT' : 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestPayload),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('El endpoint de verificacion requiere permisos (403). Revisa Roles > Public en Strapi.');
    }

    throw new Error(payload?.error?.message || payload?.message || `Error ${response.status}`);
  }

  return payload;
};

const VerificacionAsistencia = ({
  reserva,
  onVerified,
  onStatusChange,
  onAlert,
  autoSync = true,
  children,
}) => {
  const [messageApi, contextHolder] = message.useMessage();
  const [loading, setLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState(null);
  const [lastResult, setLastResult] = useState(null);

  const workplaceInfo = useMemo(() => getWorkplaceInfo(), []);
  const geoSupport = useMemo(() => checkGeolocationSupport(), []);

  const emitAlert = useCallback((type, content) => {
    if (!content) {
      return;
    }

    if (onAlert) {
      onAlert({ type, content, reserva });
      return;
    }

    messageApi.open({ type, content });
  }, [messageApi, onAlert, reserva]);

  void autoSync;

  const verify = useCallback(async () => {
    if (!reserva) {
      return null;
    }

    if (!geoSupport.supported) {
      const result = {
        success: false,
        shouldUpdate: false,
        newStatus: reserva.estado || 'Pendiente',
        confirmed: reserva.confirmada ?? true,
        alertType: 'error',
        message: 'Tu navegador no soporta geolocalización.',
      };

      setLastResult(result);
      emitAlert(result.alertType, result.message);
      return result;
    }

    setLoading(true);

    try {
      const currentPermission = await checkLocationPermission();
      setPermissionStatus(currentPermission);

      const hasPermission = await requestLocationPermission();
      setPermissionStatus(hasPermission ? 'granted' : 'denied');

      if (!hasPermission) {
        const instructions = getPermissionInstructions().steps.join(' ');
        const permissionMessage = geoSupport.isSecureContext
          ? `Debes habilitar la ubicación para confirmar la reserva. ${instructions}`
          : 'La geolocalización requiere HTTPS o localhost para funcionar correctamente.';

        const deniedResult = {
          success: false,
          shouldUpdate: false,
          newStatus: reserva.estado || 'Pendiente',
          confirmed: reserva.confirmada ?? true,
          alertType: 'warning',
          message: permissionMessage,
        };

        setLastResult(deniedResult);
        emitAlert(deniedResult.alertType, deniedResult.message);
        return deniedResult;
      }

      const localVerification = await verifyAttendance(reserva, { workplaceInfo });

      if (!localVerification.success) {
        const blockedResult = {
          success: false,
          shouldUpdate: false,
          newStatus: reserva.estado || 'Pendiente',
          confirmed: reserva.confirmada ?? null,
          alertType: localVerification.alertType || 'warning',
          message: localVerification.message || 'No fue posible confirmar la asistencia con geolocalizacion.',
          distance: localVerification.distance ?? null,
          position: localVerification.position ?? null,
          timeInfo: localVerification.timeInfo ?? null,
        };

        setLastResult(blockedResult);
        emitAlert(blockedResult.alertType, blockedResult.message);
        return blockedResult;
      }

      const position = localVerification.position;
      const reservaId = reserva.id ?? reserva.key;

      const apiResult = await postVerificarAsistencia({
        reservaId,
        lat: position.latitude,
        lng: position.longitude,
      });

      const updatedReserva = apiResult?.data || apiResult?.reserva || null;
      const estadoApi = extractEstadoFromPayload(apiResult);
      const estadoBoolean = extractEstadoBoolean(
        estadoApi,
        updatedReserva?.estado,
        updatedReserva?.attributes?.estado,
        updatedReserva?.attributes?.working_reserva?.data?.attributes?.estado,
        updatedReserva?.attributes?.working_reserva?.attributes?.estado,
        updatedReserva?.attributes?.working_reserva?.estado
      );
      const estadoTexto = mapEstadoFromApi(
        estadoBoolean ??
        estadoApi ??
        updatedReserva?.estado ??
        updatedReserva?.attributes?.estado ??
        reserva.estado
      );
      const confirmada = estadoBoolean ?? (estadoTexto === 'Confirmada' ? true : estadoTexto === 'Cancelada' ? false : null);

      const finalResult = {
        success: estadoTexto === 'Confirmada',
        shouldUpdate: true,
        newStatus: estadoTexto,
        confirmed: confirmada,
        distance: apiResult?.distance ?? localVerification.distance ?? null,
        message: apiResult?.message || localVerification.message || (estadoTexto === 'Confirmada' ? 'Reserva confirmada por geolocalizacion.' : 'Reserva sigue pendiente.'),
        alertType: estadoTexto === 'Confirmada' ? 'success' : estadoTexto === 'Cancelada' ? 'error' : 'warning',
        position,
        timeInfo: localVerification.timeInfo ?? null,
      };

      const reservaActualizada = {
        ...reserva,
        ...(updatedReserva ?? {}),
        estado: estadoTexto,
        confirmada,
      };

      onStatusChange?.(reservaActualizada, finalResult);
      onVerified?.(reservaActualizada);
      setLastResult(finalResult);
      emitAlert(finalResult.alertType, finalResult.message);
      return finalResult;
    } catch (error) {
      const failedResult = {
        success: false,
        shouldUpdate: false,
        newStatus: reserva.estado || 'Pendiente',
        confirmed: reserva.confirmada ?? null,
        alertType: 'error',
        message: [error.message, error.details].filter(Boolean).join(' ') || 'Error al verificar la asistencia.',
      };

      setLastResult(failedResult);
      emitAlert(failedResult.alertType, failedResult.message);
      return failedResult;
    } finally {
      setLoading(false);
    }
  }, [emitAlert, geoSupport, onStatusChange, onVerified, reserva]);

  const controller = useMemo(() => ({
    verify,
    loading,
    metadataLoading: false,
    metadataError: null,
    puestos: [],
    horarios: [],
    timeInfo: null,
    workplaceInfo,
    permissionStatus,
    lastResult,
    geoSupport,
    canVerify: Boolean(reserva && reserva.estado === 'Pendiente' && !loading),
  }), [geoSupport, lastResult, loading, permissionStatus, reserva, verify, workplaceInfo]);

  return (
    <>
      {contextHolder}
      {typeof children === 'function' ? children(controller) : null}
    </>
  );
};

export default VerificacionAsistencia;
