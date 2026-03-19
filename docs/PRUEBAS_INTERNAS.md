# 🔍 Sistema de Pruebas Internas - Crepe Working

## Descripción General

Sistema completo de diagnóstico y pruebas internas para validar la conectividad, funcionalidad y rendimiento de la aplicación Crepe Working.

## 📋 Características

El sistema de pruebas valida:

### ✅ Conectividad
- ✓ Conexión con la API de Strapi
- ✓ Endpoint de Reservas
- ✓ Endpoint de Horarios  
- ✓ Endpoint de Puestos

### ⚙️ Funcionalidad
- ✓ Obtención de reservas
- ✓ Filtrado de reservas pendientes
- ✓ Normalización de datos
- ✓ Integridad de campos requeridos

### 🔌 Tiempo Real (Socket.IO)
- ✓ Conexión al servidor WebSocket
- ✓ Recepción de eventos en tiempo real
- ✓ Manejo de fallback cuando Socket.IO no está disponible

### ⏰ Auto-Cancelación
- ✓ Cancelación de reservas vencidas
- ✓ Validación de horarios
- ✓ Reglas de ventana de 25 minutos

### ⚡ Rendimiento
- ✓ Tiempos de respuesta de endpoints
- ✓ Detección de latencia
- ✓ Métricas de rendimiento

## 🚀 Formas de Uso

### 1. Panel Visual de Diagnóstico (Recomendado)

Accede al panel de diagnóstico completo con interfaz visual:

```
http://localhost:5173/diagnostico
```

**Características del Panel:**
- 📊 Resumen visual de resultados
- 🔄 Actualización automática (cada 30s)
- 📝 Detalles expandibles por prueba
- 🎨 Indicadores visuales de estado
- ⏱️ Métricas de tiempo real

### 2. Consola del Navegador

Abre la consola del navegador (F12) y ejecuta:

```javascript
// Importar el módulo de pruebas
import internalTests from './src/utils/internalTests.js';

// Ejecutar todas las pruebas
const results = await internalTests.runAllTests();
console.log(results);

// O ejecutar pruebas individuales
await internalTests.testApiConnection();
await internalTests.testReservasEndpoint();
await internalTests.testSocketConnection();
```

### 3. Línea de Comandos (Desarrollo)

Ejecuta las pruebas desde la terminal:

```bash
# Modo básico
node scripts/runTests.js

# Con npm script (si se configura)
npm run test:internal
```

## 📊 Interpretación de Resultados

### Estados de Pruebas

- ✅ **Pasada (Passed)**: La prueba se completó exitosamente
- ❌ **Fallida (Failed)**: La prueba encontró un error crítico
- ⚠️ **Advertencia (Warning)**: Problema no crítico detectado

### Categorías de Pruebas

| Categoría | Descripción |
|-----------|-------------|
| **Conectividad** | Validación de conexión con servicios externos |
| **API** | Pruebas de endpoints REST |
| **Funcionalidad** | Operaciones de negocio (CRUD) |
| **Integridad** | Validación de estructura de datos |
| **Tiempo Real** | Socket.IO y sincronización |
| **Auto-Cancelación** | Sistema de cancelación automática |
| **Rendimiento** | Métricas de velocidad y latencia |

### Umbrales de Rendimiento

- 🟢 **Excelente**: < 1000ms promedio
- 🟡 **Bueno**: 1000-3000ms promedio
- 🔴 **Lento**: > 3000ms promedio

## 🔧 Configuración

### Variables de Entorno

El sistema de pruebas usa las siguientes variables (`.env.local`):

```env
# Socket.IO
VITE_ENABLE_SOCKET=true
VITE_RESERVAS_WS_URL=https://macfer.crepesywaffles.com
```

### Endpoints Configurados

```javascript
const BASE_URL = 'https://macfer.crepesywaffles.com';
const API_ENDPOINTS = {
  reservas: `${BASE_URL}/api/working-reservas`,
  horarios: `${BASE_URL}/api/working-horarios`,
  puestos: `${BASE_URL}/api/working-puestos`,
};
```

## 📝 Detalles de Pruebas

### testApiConnection()
Verifica la conectividad básica con el servidor Strapi.
- **Timeout**: 5 segundos
- **Esperado**: Status 200

### testReservasEndpoint()
Valida el endpoint principal de reservas.
- **Parámetros**: pagination[pageSize]=10
- **Esperado**: Array de reservas con estructura correcta

### testSocketConnection()
Prueba la conexión WebSocket para sincronización en tiempo real.
- **Timeout**: 5 segundos
- **Fallback**: Si falla, no es crítico (el sistema funciona sin Socket.IO)

### testAutoCancelacionVencidas()
Ejecuta la función de auto-cancelación y valida su comportamiento.
- **Validación**: Respeta ventana de 25 minutos
- **Horario**: Solo opera durante horario laboral (5:00-17:00)

### testResponseTimes()
Mide la latencia de los endpoints principales.
- **Threshold**: 3000ms promedio
- **Métricas**: Reservas, Horarios, Puestos

## 🐛 Debugging

### Logs Detallados

Todos los logs se emiten en consola con categorías claras:

```
✅ [Conectividad] Conexión a API Base - PASÓ (234ms)
⚠️ [Socket.IO] Socket.IO deshabilitado en configuración
❌ [API] Endpoint de Reservas - FALLÓ (5001ms)
```

### Estructura de Resultados

```javascript
{
  startTime: 1234567890,
  endTime: 1234567900,
  duration: 10000,
  summary: {
    total: 12,
    passed: 10,
    failed: 1,
    warnings: 1,
    duration: 10000,
    timestamp: "2026-03-19T15:30:00Z"
  },
  details: [
    {
      name: "Conexión a API Base",
      category: "Conectividad",
      status: "passed",
      duration: 234,
      data: { status: 200, statusText: "OK" },
      error: null
    }
    // ... más pruebas
  ]
}
```

## 🚨 Problemas Comunes

### ❌ Error: "Network Error"
**Causa**: No hay conexión con el servidor Strapi  
**Solución**: Verificar que `https://macfer.crepesywaffles.com` esté accesible

### ⚠️ Socket.IO no conecta
**Causa**: Servidor sin Socket.IO configurado  
**Solución**: Normal - el sistema funciona en modo fallback sin Socket.IO

### 🐌 Pruebas lentas (>3000ms)
**Causa**: Latencia de red o servidor sobrecargado  
**Solución**: Revisar conectividad o escalar recursos del servidor

### ❌ Auto-cancelación falla
**Causa**: Horarios no configurados correctamente  
**Solución**: Verificar endpoint `/api/working-horarios` devuelve datos válidos

## 📈 Mejores Prácticas

1. **Ejecutar pruebas después de cambios importantes**
   - Modificaciones en API
   - Cambios en lógica de reservas
   - Actualizaciones de dependencias

2. **Monitorear tendencias**
   - Guardar resultados históricos
   - Detectar degradación de rendimiento
   - Identificar patrones de fallos

3. **Usar auto-refresh en producción**
   - Activar en panel de diagnóstico
   - Monitorear durante horas pico
   - Validar después de deployments

4. **Interpretar contexto**
   - Algunas pruebas fallidas pueden ser normales (ej: Socket.IO sin configurar)
   - Priorizar errores críticos vs advertencias
   - Revisar logs detallados antes de reportar bugs

## 🔄 Integración Continua

Para agregar al pipeline CI/CD:

```yaml
# .github/workflows/tests.yml
name: Internal Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install dependencies
        run: npm install
      - name: Run internal tests
        run: node scripts/runTests.js
```

## 📞 Soporte

Si encuentras problemas con el sistema de pruebas:

1. Revisar logs detallados en consola
2. Verificar configuración de variables de entorno
3. Validar conectividad de red
4. Consultar documentación de Strapi
5. Reportar issue con logs completos

---

**Última actualización**: Marzo 19, 2026  
**Versión**: 1.0.0  
**Autor**: Sistema Interno Crepe Working
