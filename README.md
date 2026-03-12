# Crepes & Waffles Coworking

## Descripción
Espacio de coworking diseñado para profesionales y emprendedores que buscan un ambiente productivo.

## Características
-  Espacio de trabajo flexibles


## Instalación
```bash
npm install
```

## Uso
```bash
npm start
```

## Sincronizacion en tiempo real (WebSocket)
Para que dos usuarios vean cambios de reservas de inmediato sin recargar, configura el endpoint WebSocket en un archivo .env:

```bash
VITE_RESERVAS_WS_URL=wss://tu-servidor/ws/reservas
```

Opcionalmente puedes ajustar el polling de respaldo (en milisegundos):

```bash
VITE_RESERVAS_POLLING_MS=30000
```

Si no se define VITE_RESERVAS_WS_URL, la app sigue funcionando con eventos locales y polling como fallback.

## Contribuir
Las contribuciones son bienvenidas. Por favor abre un issue o pull request.

## Licencia
MIT

## Contacto
Para más información, contactanos en info@crepeswaffles.com
