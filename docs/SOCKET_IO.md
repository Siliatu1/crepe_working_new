# Socket.IO - Sincronización en Tiempo Real

## ✅ Estado Actual: ACTIVO

Socket.IO está **HABILITADO** y funcionando correctamente con el servidor backend (`https://macfer.crepesywaffles.com`).

## Funcionamiento

El backend emite el evento `reserva3` cada vez que se crea una nueva reserva. El frontend escucha este evento y actualiza automáticamente las reservas sin necesidad de recargar la página.

### Flujo de Actualización

1. Usuario crea una reserva
2. Backend procesa y guarda la reserva
3. Backend emite evento `reserva3` a través de Socket.IO
4. Frontend escucha el evento `reserva3`
5. Frontend sincroniza las reservas automáticamente

## Código de Conexión

```javascript
const socket = io("https://macfer.crepesywaffles.com/");

socket.on("connect", () => {
  console.log("Conectado a Socket.IO");
});

socket.on("reserva3", () => {
  // Actualizar las reservas automáticamente
  fetchReservas(fechaSeleccionada, setReservas);
});
```

## Eventos Disponibles

### `reserva3`
Emitido cuando se crea una nueva reserva en el sistema.

**Comportamiento:**
- Trigger: Creación de reserva en el backend
- Acción: Sincroniza y actualiza lista de reservas en todos los clientes conectados

## Configuración

### Variables de Entorno

Archivo `.env.local`:
```bash
VITE_ENABLE_SOCKET=true
VITE_RESERVAS_WS_URL=https://macfer.crepesywaffles.com
```

### Deshabilitar Socket.IO (Emergencia)

Si necesitas deshabilitarlo temporalmente:

```bash
VITE_ENABLE_SOCKET=false
```

La aplicación seguirá funcionando con el sistema de polling de respaldo.

## Archivo de Configuración

**Hook principal:** [src/hooks/useRealtimeSync.js](../src/hooks/useRealtimeSync.js)

- Maneja la conexión Socket.IO
- Escucha eventos del servidor
- Sincroniza cambios automáticamente
- Fallback a eventos locales si Socket.IO está deshabilitado

## Consola del Navegador

Mensajes esperados:

```
🟢 Conectado a Socket.IO
📡 Evento "reserva3" recibido del backend
🔄 Sincronizando desde: socket-reserva3
```

Si ves `🔴 Socket.IO desconectado`, verifica:
- Conexión a internet
- El servidor backend está activo
- No hay firewalls bloqueando WebSocket

## Notas Importantes

⚠️ **Prevención de Doble Reserva**
- Mantén el estado de loading activo durante operaciones
- Deshabilita botones mientras se procesa una reserva
- Esto evita que usuarios creen reservas duplicadas por clics múltiples

## Referencias

- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [Socket.IO Client (React)](https://socket.io/how-to/use-with-react)
