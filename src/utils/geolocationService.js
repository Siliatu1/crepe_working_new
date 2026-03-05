// ========================================
// GEOLOCATION SERVICE
// Servicio para verificación de ubicación y gestión de asistencia
// ========================================

// Coordenadas del lugar de trabajo - Crepes & Waffles
const WORKPLACE_COORDS = {
  latitude: 4.74488,
  longitude: -74.04483,
  name: "Crepe-Working 1"
};

// Radio permitido en metros
const ALLOWED_RADIUS_METERS = 500;

// Horario de verificación
const VERIFICATION_START_TIME = { hour: 8, minute: 0 };  // 8:00 AM
const VERIFICATION_END_TIME = { hour: 8, minute: 25 };   // 8:25 AM

/**
 * Calcula la distancia entre dos coordenadas usando la fórmula de Haversine
 * @param {number} lat1 - Latitud del punto 1
 * @param {number} lon1 - Longitud del punto 1
 * @param {number} lat2 - Latitud del punto 2
 * @param {number} lon2 - Longitud del punto 2
 * @returns {number} Distancia en metros
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Radio de la Tierra en metros
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
};

/**
 * Verifica si una coordenada está dentro del radio permitido
 * @param {number} userLat - Latitud del usuario
 * @param {number} userLon - Longitud del usuario
 * @returns {boolean} true si está dentro del radio
 */
export const isWithinRadius = (userLat, userLon) => {
  const distance = calculateDistance(
    userLat,
    userLon,
    WORKPLACE_COORDS.latitude,
    WORKPLACE_COORDS.longitude
  );
  
  console.log(`📍 Distancia al lugar de trabajo: ${distance.toFixed(2)} metros`);
  
  return distance <= ALLOWED_RADIUS_METERS;
};

/**
 * Verifica el estado de los permisos de geolocalización
 * @returns {Promise<string>} Estado del permiso: 'granted', 'denied', 'prompt', 'unsupported'
 */
export const checkLocationPermission = async () => {
  try {
    // Verificar si la API de permisos está disponible
    if (!navigator.permissions) {
      console.warn('API de permisos no disponible, intentando geolocalización directa');
      return 'unsupported';
    }

    const result = await navigator.permissions.query({ name: 'geolocation' });
    console.log('📋 Estado de permiso de ubicación:', result.state);
    return result.state; // 'granted', 'denied', o 'prompt'
  } catch (error) {
    console.warn('Error al verificar permisos:', error);
    // En iOS Safari y algunos navegadores antiguos, la API de permisos no está disponible
    return 'unsupported';
  }
};

/**
 * Solicita permiso de ubicación de manera explícita
 * @returns {Promise<boolean>} true si se otorgó el permiso
 */
export const requestLocationPermission = async () => {
  try {
    const permissionStatus = await checkLocationPermission();
    
    if (permissionStatus === 'granted') {
      console.log('✅ Permiso de ubicación ya otorgado');
      return true;
    }
    
    if (permissionStatus === 'denied') {
      console.log('❌ Permiso de ubicación denegado previamente');
      return false;
    }

    // Intentar obtener ubicación para activar el prompt de permisos
    console.log('📍 Solicitando permiso de ubicación...');
    await getCurrentPosition();
    return true;
  } catch (error) {
    console.error('Error al solicitar permiso:', error);
    return false;
  }
};

/**
 * Obtiene la posición actual del usuario
 * @returns {Promise<{latitude: number, longitude: number, accuracy: number}>}
 */
export const getCurrentPosition = () => {
  return new Promise((resolve, reject) => {
    // Verificar soporte de geolocalización
    if (!navigator.geolocation) {
      reject(new Error('La geolocalización no está soportada en este navegador. Intenta usar Chrome, Firefox, Safari o Edge actualizados.'));
      return;
    }

    // Opciones de geolocalización optimizadas para diferentes dispositivos
    const options = {
      enableHighAccuracy: true,     // Usar GPS si está disponible
      timeout: 15000,                // 15 segundos (aumentado para dispositivos lentos)
      maximumAge: 5000               // Acepta posiciones de hasta 5 segundos
    };

    console.log('📍 Solicitando ubicación GPS...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('✅ Ubicación obtenida:', {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
        
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          altitudeAccuracy: position.coords.altitudeAccuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
          timestamp: position.timestamp
        });
      },
      (error) => {
        let errorMessage = 'Error al obtener la ubicación';
        let errorDetails = '';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Permiso de ubicación denegado';
            errorDetails = 'Debes habilitar los permisos de ubicación en tu navegador. ';
            
            // Instrucciones específicas por navegador/dispositivo
            if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
              errorDetails += 'En iOS: Ajustes > Safari > Ubicación > Permitir.';
            } else if (/Android/.test(navigator.userAgent)) {
              errorDetails += 'En Android: Ajustes > Aplicaciones > Chrome/Navegador > Permisos > Ubicación > Permitir.';
            } else {
              errorDetails += 'Haz clic en el ícono de candado en la barra de direcciones y activa "Ubicación".';
            }
            break;
            
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Ubicación no disponible';
            errorDetails = 'Tu dispositivo no puede determinar tu ubicación. Asegúrate de tener GPS/WiFi activado y estar en un lugar con señal.';
            break;
            
          case error.TIMEOUT:
            errorMessage = 'Tiempo de espera agotado';
            errorDetails = 'No se pudo obtener tu ubicación a tiempo. Verifica tu conexión, activa el GPS e intenta nuevamente.';
            break;
            
          default:
            errorMessage = 'Error desconocido al obtener ubicación';
            errorDetails = 'Por favor verifica que tengas GPS/WiFi activado y permisos de ubicación habilitados.';
        }
        
        console.error('❌ Error de geolocalización:', errorMessage, error);
        
        const fullError = new Error(errorMessage);
        fullError.details = errorDetails;
        fullError.code = error.code;
        
        reject(fullError);
      },
      options
    );
  });
};

/**
 * Verifica si la hora actual está dentro del rango de verificación
 * @returns {boolean} true si está dentro del horario de verificación
 */
export const isWithinVerificationTime = () => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  const startMinutes = VERIFICATION_START_TIME.hour * 60 + VERIFICATION_START_TIME.minute;
  const endMinutes = VERIFICATION_END_TIME.hour * 60 + VERIFICATION_END_TIME.minute;
  const currentMinutes = currentHour * 60 + currentMinute;
  
  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
};

/**
 * Verifica si ya pasó el tiempo límite de verificación
 * @returns {boolean} true si ya pasó el tiempo límite
 */
export const isPastVerificationDeadline = () => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  const deadlineMinutes = VERIFICATION_END_TIME.hour * 60 + VERIFICATION_END_TIME.minute;
  const currentMinutes = currentHour * 60 + currentMinute;
  
  return currentMinutes > deadlineMinutes;
};

/**
 * Verifica si la fecha de una reserva es hoy
 * @param {string} fechaReserva - Fecha en formato ISO (YYYY-MM-DD)
 * @returns {boolean} true si la reserva es para hoy
 */
export const isReservationForToday = (fechaReserva) => {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  return fechaReserva === todayStr;
};

/**
 * Verifica la asistencia del usuario y actualiza el estado de la reserva
 * @param {Object} reserva - Objeto de reserva
 * @returns {Promise<{success: boolean, newStatus: string, message: string, distance?: number}>}
 */
export const verifyAttendance = async (reserva) => {
  try {
    console.log('🔍 Verificando asistencia para reserva:', reserva.id);
    
    // Verificar si la reserva es para hoy
    if (!isReservationForToday(reserva.fecha)) {
      return {
        success: false,
        newStatus: reserva.estado,
        message: 'La reserva no es para hoy'
      };
    }
    
    // Verificar si está fuera del horario y cancelar automáticamente
    if (isPastVerificationDeadline() && reserva.estado === 'Pendiente') {
      return {
        success: true,
        newStatus: 'Cancelada',
        message: 'Reserva cancelada por no confirmar asistencia a tiempo'
      };
    }
    
    // Verificar si está dentro del horario de confirmación
    if (!isWithinVerificationTime()) {
      return {
        success: false,
        newStatus: reserva.estado,
        message: 'Fuera del horario de verificación (8:00 AM - 8:25 AM)'
      };
    }
    
    // Obtener ubicación del usuario
    const position = await getCurrentPosition();
    
    console.log(`📍 Ubicación usuario: ${position.latitude}, ${position.longitude}`);
    console.log(`📍 Precisión: ${position.accuracy} metros`);
    
    // Calcular distancia
    const distance = calculateDistance(
      position.latitude,
      position.longitude,
      WORKPLACE_COORDS.latitude,
      WORKPLACE_COORDS.longitude
    );
    
    // Verificar si está dentro del radio permitido
    if (distance <= ALLOWED_RADIUS_METERS) {
      return {
        success: true,
        newStatus: 'Confirmada',
        message: `Asistencia confirmada. Distancia: ${distance.toFixed(0)} metros`,
        distance: distance
      };
    } else {
      return {
        success: true,
        newStatus: 'Cancelada',
        message: `Fuera del área permitida. Distancia: ${distance.toFixed(0)} metros (máximo ${ALLOWED_RADIUS_METERS}m)`,
        distance: distance
      };
    }
    
  } catch (error) {
    console.error('Error al verificar asistencia:', error);
    return {
      success: false,
      newStatus: reserva.estado,
      message: error.message || 'Error al verificar ubicación'
    };
  }
};

/**
 * Obtiene información sobre el horario de verificación
 * @returns {Object} Información del horario
 */
export const getVerificationTimeInfo = () => {
  const status = isWithinVerificationTime();
  const isPast = isPastVerificationDeadline();
  
  return {
    startTime: `${VERIFICATION_START_TIME.hour.toString().padStart(2, '0')}:${VERIFICATION_START_TIME.minute.toString().padStart(2, '0')}`,
    endTime: `${VERIFICATION_END_TIME.hour.toString().padStart(2, '0')}:${VERIFICATION_END_TIME.minute.toString().padStart(2, '0')}`,
    isActive: status,
    isPast: isPast,
    message: status ? 'Horario activo' : isPast ? 'Horario vencido' : 'Horario no iniciado'
  };
};

/**
 * Obtiene las coordenadas del lugar de trabajo
 * @returns {Object} Coordenadas y radio
 */
export const getWorkplaceInfo = () => {
  return {
    ...WORKPLACE_COORDS,
    radius: ALLOWED_RADIUS_METERS,
    radiusKm: (ALLOWED_RADIUS_METERS / 1000).toFixed(2)
  };
};

/**
 * Detecta el tipo de dispositivo y navegador del usuario
 * @returns {Object} Información del dispositivo
 */
export const getDeviceInfo = () => {
  const ua = navigator.userAgent;
  
  const isIOS = /iPhone|iPad|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);
  const isMobile = isIOS || isAndroid || /Mobile/.test(ua);
  
  const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
  const isChrome = /Chrome/.test(ua) && !/Edge/.test(ua);
  const isFirefox = /Firefox/.test(ua);
  const isEdge = /Edge|Edg/.test(ua);
  
  return {
    isIOS,
    isAndroid,
    isMobile,
    isDesktop: !isMobile,
    browser: {
      isSafari,
      isChrome,
      isFirefox,
      isEdge,
      name: isChrome ? 'Chrome' : isSafari ? 'Safari' : isFirefox ? 'Firefox' : isEdge ? 'Edge' : 'Desconocido'
    }
  };
};

/**
 * Obtiene instrucciones de permisos específicas para el dispositivo
 * @returns {Object} Instrucciones paso a paso
 */
export const getPermissionInstructions = () => {
  const device = getDeviceInfo();
  
  if (device.isIOS) {
    return {
      title: 'Cómo habilitar ubicación en iOS',
      steps: [
        'Abre Ajustes en tu iPhone/iPad',
        'Busca y toca "Safari" o tu navegador',
        'Toca "Ubicación"',
        'Selecciona "Permitir" o "Permitir al usar la app"',
        'Recarga esta página y vuelve a intentar'
      ]
    };
  }
  
  if (device.isAndroid) {
    return {
      title: 'Cómo habilitar ubicación en Android',
      steps: [
        'Abre Ajustes en tu dispositivo',
        'Ve a "Aplicaciones" o "Apps"',
        `Busca "${device.browser.name}" (tu navegador)`,
        'Toca "Permisos"',
        'Toca "Ubicación" y selecciona "Permitir"',
        'Recarga esta página y vuelve a intentar'
      ]
    };
  }
  
  // Desktop
  return {
    title: 'Cómo habilitar ubicación en navegador',
    steps: [
      'Haz clic en el ícono de candado (🔒) en la barra de direcciones',
      'Busca "Ubicación" en el menú',
      'Selecciona "Permitir" o "Preguntar"',
      'Recarga esta página',
      'Haz clic en "Permitir" cuando el navegador pregunte'
    ]
  };
};

/**
 * Verifica si el dispositivo tiene capacidades de geolocalización
 * @returns {Object} Estado de capacidades
 */
export const checkGeolocationSupport = () => {
  const hasGeolocation = 'geolocation' in navigator;
  const hasPermissionsAPI = 'permissions' in navigator;
  const isSecureContext = window.isSecureContext || window.location.protocol === 'https:';
  
  return {
    supported: hasGeolocation,
    hasPermissionsAPI,
    isSecureContext,
    warnings: [
      ...(!hasGeolocation ? ['Tu navegador no soporta geolocalización'] : []),
      ...(!isSecureContext ? ['La geolocalización requiere HTTPS o localhost'] : []),
      ...(!hasPermissionsAPI ? ['API de permisos no disponible (normal en iOS)'] : [])
    ]
  };
};

// Exportar constantes para usar en otros componentes
export const WORKPLACE_LOCATION = WORKPLACE_COORDS;
export const VERIFICATION_RADIUS = ALLOWED_RADIUS_METERS;
export const VERIFICATION_HOURS = {
  start: VERIFICATION_START_TIME,
  end: VERIFICATION_END_TIME
};
