import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { message } from 'antd';
import {
  checkGeolocationSupport,
  checkLocationPermission,
  evaluateReservationStatus,
  fetchWorkingHorarios,
  fetchWorkingPuestos,
  getDeviceInfo,
  getPermissionInstructions,
  getVerificationTimeInfo,
  getWorkplaceInfo,
  requestLocationPermission,
  verifyAttendance,
} from '../../utils/geolocationService';
import { updateReservaWithVerification } from '../../utils/reservasService';

const buildVerificationPayload = (reserva, result, deviceInfo) => {
  const nextConfirmed = result.confirmed ?? (
    result.newStatus === 'Confirmada'
      ? true
      : result.newStatus === 'Cancelada'
      ? false
      : reserva?.confirmada ?? null
  );

  const payload = {
    estado: result.newStatus,
    confirmada: nextConfirmed,
    verificacionAsistencia: {
      fecha: new Date().toISOString(),
      distancia: result.distance ?? null,
      mensaje: result.message,
      dispositivo: deviceInfo,
      horario: result.timeInfo?.horario
        ? {
            id: result.timeInfo.horario.id,
            nombre: result.timeInfo.horario.nombre,
            inicio: result.timeInfo.shiftStartTime,
            fin: result.timeInfo.shiftEndTime,
          }
        : null,
      ubicacion: result.position
        ? {
            latitude: result.position.latitude,
            longitude: result.position.longitude,
            accuracy: result.position.accuracy,
          }
        : null,
    },
  };

  if (result.newStatus === 'Cancelada') {
    payload.motivoCancelacion = result.message;
  }

  if (result.newStatus === 'Confirmada') {
    payload.motivoCancelacion = null;
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
  const [metadata, setMetadata] = useState({
    puestos: [],
    horarios: [],
    loading: true,
    error: null,
  });
  const [lastResult, setLastResult] = useState(null);

  const workplaceInfo = useMemo(() => getWorkplaceInfo(), []);
  const deviceInfo = useMemo(() => getDeviceInfo(), []);
  const geoSupport = useMemo(() => checkGeolocationSupport(), []);
  const autoSyncRef = useRef(new Set());

  useEffect(() => {
    let cancelled = false;

    const loadMetadata = async () => {
      try {
        const [puestos, horarios] = await Promise.all([
          fetchWorkingPuestos(),
          fetchWorkingHorarios(),
        ]);

        if (cancelled) {
          return;
        }

        setMetadata({ puestos, horarios, loading: false, error: null });
      } catch (error) {
        if (cancelled) {
          return;
        }

        setMetadata((current) => ({
          ...current,
          loading: false,
          error: error.message || 'No se pudieron cargar los puestos y horarios',
        }));
      }
    };

    void loadMetadata();

    return () => {
      cancelled = true;
    };
  }, []);

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

  const applyResult = useCallback(async (result) => {
    if (!reserva || !result?.shouldUpdate) {
      return result;
    }

    const reservaId = reserva.id ?? reserva.key;
    const updated = await updateReservaWithVerification(
      reservaId,
      buildVerificationPayload(reserva, result, deviceInfo),
      reserva
    );

    if (!updated) {
      return {
        ...result,
        success: false,
        shouldUpdate: false,
        alertType: 'error',
        message: 'No se pudo actualizar la reserva localmente.',
      };
    }

    const finalResult = {
      ...result,
      reservaActualizada: updated,
    };

    onStatusChange?.(updated, finalResult);
    onVerified?.(updated);
    return finalResult;
  }, [deviceInfo, onStatusChange, onVerified, reserva]);

  useEffect(() => {
    if (!autoSync || metadata.loading || !reserva || reserva.estado !== 'Pendiente') {
      return;
    }

    const reservationKey = `${reserva.id ?? reserva.key}:${reserva.estado}`;
    if (autoSyncRef.current.has(reservationKey)) {
      return;
    }

    const evaluation = evaluateReservationStatus(reserva, metadata.horarios);
    if (!evaluation.shouldUpdate || evaluation.newStatus !== 'Cancelada') {
      return;
    }

    let active = true;

    const runAutoSync = async () => {
      autoSyncRef.current.add(reservationKey);
      const finalResult = await applyResult(evaluation);

      if (!active) {
        return;
      }

      setLastResult(finalResult);
      emitAlert(finalResult.alertType || 'warning', finalResult.message);
    };

    void runAutoSync();

    return () => {
      active = false;
    };
  }, [applyResult, autoSync, emitAlert, metadata.horarios, metadata.loading, reserva]);

  const timeInfo = useMemo(
    () => getVerificationTimeInfo(reserva, metadata.horarios),
    [metadata.horarios, reserva]
  );

  const verify = useCallback(async () => {
    if (!reserva) {
      return null;
    }

    if (metadata.loading) {
      emitAlert('info', 'Estamos cargando puestos y horarios. Intenta nuevamente en un momento.');
      return null;
    }

    if (metadata.error) {
      emitAlert('warning', metadata.error);
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

      const result = await verifyAttendance(reserva, {
        horarios: metadata.horarios,
        workplaceInfo,
      });

      const finalResult = await applyResult(result);
      setLastResult(finalResult);
      emitAlert(finalResult.alertType || (finalResult.success ? 'success' : 'warning'), finalResult.message);
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
  }, [applyResult, emitAlert, geoSupport, metadata.error, metadata.horarios, metadata.loading, reserva, workplaceInfo]);

  const controller = useMemo(() => ({
    verify,
    loading,
    metadataLoading: metadata.loading,
    metadataError: metadata.error,
    puestos: metadata.puestos,
    horarios: metadata.horarios,
    timeInfo,
    workplaceInfo,
    permissionStatus,
    lastResult,
    geoSupport,
    canVerify: Boolean(
      reserva &&
      reserva.estado === 'Pendiente' &&
      timeInfo.scheduleResolved &&
      timeInfo.isToday &&
      !timeInfo.isPast &&
      !loading &&
      !metadata.loading
    ),
  }), [geoSupport, lastResult, loading, metadata.error, metadata.horarios, metadata.loading, metadata.puestos, permissionStatus, reserva, timeInfo, verify, workplaceInfo]);

  return (
    <>
      {contextHolder}
      {typeof children === 'function' ? children(controller) : null}
    </>
  );
};

export default VerificacionAsistencia;
