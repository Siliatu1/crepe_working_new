import React, { useState, useEffect } from 'react';
import { Button, Modal, Alert, Progress, Tag, Spin, Steps } from 'antd';
import { 
  EnvironmentOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined,
  ClockCircleOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  MobileOutlined,
  LockOutlined
} from '@ant-design/icons';
import { 
  verifyAttendance, 
  getVerificationTimeInfo,
  getWorkplaceInfo,
  isReservationForToday,
  getCurrentPosition,
  calculateDistance,
  checkLocationPermission,
  requestLocationPermission,
  getDeviceInfo,
  getPermissionInstructions,
  checkGeolocationSupport
} from '../../utils/geolocationService';
import { 
  updateReservaWithVerification,
  cancelarReservasVencidas 
} from '../../utils/reservasService';

const VerificacionAsistencia = ({ reserva, onVerified }) => {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [timeInfo, setTimeInfo] = useState(getVerificationTimeInfo());
  const [workplaceInfo] = useState(getWorkplaceInfo());
  const [permissionStatus, setPermissionStatus] = useState(null);
  const [deviceInfo] = useState(getDeviceInfo());
  const [showPermissionHelp, setShowPermissionHelp] = useState(false);
  const [geoSupport] = useState(checkGeolocationSupport());

  // Actualizar información de tiempo cada minuto
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeInfo(getVerificationTimeInfo());
      
      // Cancelar reservas vencidas automáticamente
      if (timeInfo.isPast) {
        cancelarReservasVencidas();
      }
    }, 60000); // Cada 1 minuto

    return () => clearInterval(interval);
  }, [timeInfo.isPast]);

  // Verificar permisos al abrir el modal
  useEffect(() => {
    if (showModal) {
      checkPermissions();
    }
  }, [showModal]);

  const checkPermissions = async () => {
    const status = await checkLocationPermission();
    setPermissionStatus(status);
    console.log('📋 Estado de permisos:', status);
  };

  const handleVerifyLocation = async () => {
    setLoading(true);
    setVerificationResult(null);
    
    try {
      console.log('🔍 Iniciando verificación de ubicación...');
      
      // Verificar soporte de geolocalización
      if (!geoSupport.supported) {
        Modal.error({
          title: 'Geolocalización no soportada',
          content: 'Tu navegador no soporta geolocalización. Por favor usa un navegador moderno como Chrome, Firefox, Safari o Edge.',
        });
        setLoading(false);
        return;
      }

      // Verificar permisos primero
      const hasPermission = await requestLocationPermission();
      
      if (!hasPermission) {
        setShowPermissionHelp(true);
        setLoading(false);
        return;
      }
      
      // Verificar asistencia
      const result = await verifyAttendance(reserva);
      
      console.log('📋 Resultado verificación:', result);
      
      if (result.success && result.newStatus !== reserva.estado) {
        // Actualizar estado de la reserva
        const updateData = {
          estado: result.newStatus,
          verificacionAsistencia: {
            fecha: new Date().toISOString(),
            distancia: result.distance,
            mensaje: result.message,
            dispositivo: deviceInfo
          }
        };

        if (result.newStatus === 'Cancelada') {
          updateData.motivoCancelacion = result.message;
        }

        const updated = updateReservaWithVerification(reserva.id, updateData);
        
        if (updated) {
          setVerificationResult({
            ...result,
            reservaActualizada: updated
          });
          
          // Notificar al componente padre
          if (onVerified) {
            onVerified(updated);
          }
        }
      } else {
        setVerificationResult(result);
      }
      
      setShowModal(true);
    } catch (error) {
      console.error('Error al verificar ubicación:', error);
      
      // Si es error de permisos, mostrar ayuda
      if (error.message && error.message.includes('denegado')) {
        setShowPermissionHelp(true);
      }
      
      setVerificationResult({
        success: false,
        message: error.message || 'Error al verificar ubicación',
        details: error.details
      });
      setShowModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckCurrentLocation = async () => {
    setLoading(true);
    try {
      const position = await getCurrentPosition();
      const distance = calculateDistance(
        position.latitude,
        position.longitude,
        workplaceInfo.latitude,
        workplaceInfo.longitude
      );
      
      setCurrentLocation({
        ...position,
        distance: distance
      });
      
      setShowModal(true);
    } catch (error) {
      Modal.error({
        title: 'Error de ubicación',
        content: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  // No mostrar botón si la reserva no es para hoy
  if (!isReservationForToday(reserva.fecha)) {
    return null;
  }

  // No mostrar si ya está confirmada o cancelada
  if (reserva.estado !== 'Pendiente') {
    return (
      <Tag 
        color={reserva.estado === 'Confirmada' ? 'green' : 'red'}
        icon={reserva.estado === 'Confirmada' ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
      >
        {reserva.estado}
      </Tag>
    );
  }

  const buttonStyle = {
    background: timeInfo.isActive 
      ? 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)'
      : '#ccc',
    border: 'none',
    color: '#fff',
    fontWeight: '600',
    boxShadow: timeInfo.isActive ? '0 4px 12px rgba(76, 175, 80, 0.3)' : 'none',
  };

  return (
    <>
      <Button
        type="primary"
        icon={<EnvironmentOutlined />}
        onClick={handleVerifyLocation}
        loading={loading}
        disabled={!timeInfo.isActive || timeInfo.isPast}
        style={buttonStyle}
        size="small"
      >
        Confirmar Asistencia
      </Button>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <EnvironmentOutlined style={{ color: '#1890ff' }} />
            <span>Verificación de Asistencia</span>
          </div>
        }
        open={showModal}
        onCancel={() => {
          setShowModal(false);
          setVerificationResult(null);
          setCurrentLocation(null);
        }}
        footer={[
          <Button 
            key="close" 
            onClick={() => {
              setShowModal(false);
              setVerificationResult(null);
              setCurrentLocation(null);
            }}
          >
            Cerrar
          </Button>,
          !verificationResult && timeInfo.isActive && (
            <Button
              key="verify"
              type="primary"
              icon={<EnvironmentOutlined />}
              onClick={handleVerifyLocation}
              loading={loading}
            >
              Verificar Ubicación
            </Button>
          )
        ]}
        width={600}
      >
        <div style={{ padding: '16px 0' }}>
          {/* Horario de verificación */}
          <Alert
            message={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ClockCircleOutlined />
                <span>Horario de verificación: {timeInfo.startTime} - {timeInfo.endTime}</span>
              </div>
            }
            description={timeInfo.message}
            type={timeInfo.isActive ? 'success' : timeInfo.isPast ? 'error' : 'info'}
            showIcon
            style={{ marginBottom: '16px' }}
          />

          {/* Información del lugar */}
          <div style={{ 
            background: '#f5f5f5', 
            padding: '16px', 
            borderRadius: '8px',
            marginBottom: '16px'
          }}>
            <p style={{ margin: '4px 0', fontWeight: '600' }}>
              📍 Ubicación: {workplaceInfo.name}
            </p>
            <p style={{ margin: '4px 0', fontSize: '13px', color: '#666' }}>
              Coordenadas: {workplaceInfo.latitude}°N, {Math.abs(workplaceInfo.longitude)}°O
            </p>
            <p style={{ margin: '4px 0', fontSize: '13px', color: '#666' }}>
              Radio permitido: {workplaceInfo.radius} metros
            </p>
          </div>

          {/* Resultado de la verificación */}
          {verificationResult && (
            <Alert
              message={
                verificationResult.newStatus === 'Confirmada' 
                  ? '✅ Asistencia Confirmada' 
                  : verificationResult.newStatus === 'Cancelada'
                  ? '❌ Reserva Cancelada'
                  : '⚠️ No se pudo verificar'
              }
              description={
                <div>
                  <p style={{ margin: '8px 0' }}>{verificationResult.message}</p>
                  {verificationResult.distance && (
                    <Progress
                      percent={Math.min((verificationResult.distance / workplaceInfo.radius) * 100, 100)}
                      status={verificationResult.distance <= workplaceInfo.radius ? 'success' : 'exception'}
                      format={(percent) => `${verificationResult.distance.toFixed(0)}m / ${workplaceInfo.radius}m`}
                    />
                  )}
                </div>
              }
              type={
                verificationResult.newStatus === 'Confirmada' 
                  ? 'success' 
                  : verificationResult.newStatus === 'Cancelada'
                  ? 'error'
                  : 'warning'
              }
              showIcon
              icon={
                verificationResult.newStatus === 'Confirmada' 
                  ? <CheckCircleOutlined />
                  : verificationResult.newStatus === 'Cancelada'
                  ? <CloseCircleOutlined />
                  : <InfoCircleOutlined />
              }
            />
          )}

          {/* Ubicación actual (preview) */}
          {currentLocation && !verificationResult && (
            <div style={{ marginTop: '16px' }}>
              <p style={{ fontWeight: '600', marginBottom: '8px' }}>
                📍 Tu ubicación actual:
              </p>
              <p style={{ fontSize: '13px', margin: '4px 0' }}>
                Latitud: {currentLocation.latitude.toFixed(6)}°
              </p>
              <p style={{ fontSize: '13px', margin: '4px 0' }}>
                Longitud: {currentLocation.longitude.toFixed(6)}°
              </p>
              <p style={{ fontSize: '13px', margin: '4px 0' }}>
                Precisión: ±{currentLocation.accuracy.toFixed(0)} metros
              </p>
              <p style={{ fontSize: '13px', margin: '4px 0', fontWeight: '600' }}>
                Distancia al lugar: {currentLocation.distance.toFixed(0)} metros
              </p>
              
              <Progress
                percent={Math.min((currentLocation.distance / workplaceInfo.radius) * 100, 100)}
                status={currentLocation.distance <= workplaceInfo.radius ? 'success' : 'exception'}
                strokeColor={currentLocation.distance <= workplaceInfo.radius ? '#52c41a' : '#ff4d4f'}
              />
            </div>
          )}

          {/* Ayuda de permisos */}
          {showPermissionHelp && !verificationResult && (
            <Alert
              message={
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <LockOutlined />
                  <span>Permisos de ubicación requeridos</span>
                </div>
              }
              description={
                <div>
                  <p style={{ marginBottom: '12px' }}>
                    {deviceInfo.isMobile ? (
                      <>
                        <MobileOutlined style={{ marginRight: '8px' }} />
                        Detectamos que estás en un dispositivo {deviceInfo.isIOS ? 'iOS' : 'Android'}
                      </>
                    ) : (
                      'Para verificar tu asistencia necesitamos acceso a tu ubicación.'
                    )}
                  </p>
                  
                  <Steps
                    direction="vertical"
                    size="small"
                    current={-1}
                    items={getPermissionInstructions().steps.map((step, index) => ({
                      title: `Paso ${index + 1}`,
                      description: step
                    }))}
                  />
                  
                  {!geoSupport.isSecureContext && (
                    <Alert
                      message="⚠️ Conexión no segura"
                      description="La geolocalización requiere una conexión HTTPS. Contacta al administrador."
                      type="warning"
                      style={{ marginTop: '12px' }}
                      showIcon
                    />
                  )}
                  
                  <Button
                    type="primary"
                    icon={<EnvironmentOutlined />}
                    onClick={() => {
                      setShowPermissionHelp(false);
                      handleVerifyLocation();
                    }}
                    style={{ marginTop: '16px', width: '100%' }}
                  >
                    He habilitado los permisos, intentar de nuevo
                  </Button>
                </div>
              }
              type="warning"
              showIcon
              icon={<WarningOutlined />}
              style={{ marginTop: '16px' }}
            />
          )}

          {/* Estado de permisos */}
          {permissionStatus && !showPermissionHelp && !verificationResult && (
            <div style={{ marginTop: '16px', marginBottom: '16px' }}>
              <Tag 
                color={
                  permissionStatus === 'granted' ? 'success' : 
                  permissionStatus === 'denied' ? 'error' : 
                  'warning'
                }
                icon={permissionStatus === 'granted' ? <CheckCircleOutlined /> : <InfoCircleOutlined />}
              >
                Permisos de ubicación: {
                  permissionStatus === 'granted' ? 'Otorgados ✓' :
                  permissionStatus === 'denied' ? 'Denegados' :
                  permissionStatus === 'prompt' ? 'Pendiente' :
                  'No disponible'
                }
              </Tag>
              {deviceInfo.isMobile && (
                <Tag color="blue" icon={<MobileOutlined />} style={{ marginLeft: '8px' }}>
                  {deviceInfo.isIOS ? 'iOS' : 'Android'} - {deviceInfo.browser.name}
                </Tag>
              )}
            </div>
          )}

          {/* Instrucciones */}
          {!verificationResult && !currentLocation && (
            <Alert
              message="¿Cómo funciona?"
              description={
                <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                  <li>Debes estar dentro del horario de verificación (8:00 AM - 8:25 AM)</li>
                  <li>Debes estar dentro de {workplaceInfo.radius} metros del lugar de trabajo</li>
                  <li>Si confirmas a tiempo y dentro del área, tu reserva será confirmada</li>
                  <li>Si no confirmas antes de las 8:25 AM, tu reserva será cancelada automáticamente</li>
                  <li>Si estás fuera del área, tu reserva será cancelada y el escritorio quedará disponible</li>
                </ul>
              }
              type="info"
              showIcon
              icon={<InfoCircleOutlined />}
            />
          )}
        </div>
      </Modal>
    </>
  );
};

export default VerificacionAsistencia;
