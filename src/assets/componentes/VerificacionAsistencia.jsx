import React, { useCallback, useMemo, useState } from 'react';
import { message } from 'antd';
import {
  checkGeolocationSupport,
  checkLocationPermission,
  getCurrentPosition,
  getPermissionInstructions,
  getWorkplaceInfo,
  requestLocationPermission,
} from '../../utils/geolocationService';

const BASE = 'https://macfer.crepesywaffles.com';
const API_VERIFICAR_ASISTENCIA = `${BASE}/api/working-verificacions`;

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
        confirmed: reserva.confirmada ?? null,
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
          confirmed: reserva.confirmada ?? null,
          alertType: 'warning',
          message: permissionMessage,
        };

        setLastResult(deniedResult);
        emitAlert(deniedResult.alertType, deniedResult.message);
        return deniedResult;
      }

      const position = await getCurrentPosition();
      const reservaId = reserva.id ?? reserva.key;

      const apiResult = await postVerificarAsistencia({
        reservaId,
        lat: position.latitude,
        lng: position.longitude,
      });

      const updatedReserva = apiResult?.data || apiResult?.reserva || {};
      const relatedEstado = updatedReserva?.attributes?.working_reserva?.data?.attributes?.estado;
      const estadoBool = typeof relatedEstado === 'boolean'
        ? relatedEstado
        : updatedReserva?.estado;
      const estadoTexto = estadoBool === true ? 'Confirmada' : 'Pendiente';

      const finalResult = {
        success: estadoBool === true,
        shouldUpdate: true,
        newStatus: estadoTexto,
        confirmed: estadoBool === true,
        distance: apiResult?.distance ?? null,
        message: apiResult?.message || (estadoBool ? 'Reserva confirmada por geolocalizacion.' : 'Reserva sigue pendiente.'),
        alertType: estadoBool ? 'success' : 'warning',
        position,
      };

      const reservaActualizada = {
        ...reserva,
        ...updatedReserva,
        estado: estadoTexto,
        confirmada: estadoBool === true,
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
        message: error.message || 'Error al verificar la asistencia.',
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
