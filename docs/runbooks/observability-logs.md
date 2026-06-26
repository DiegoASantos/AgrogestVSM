---
title: Observabilidad con logs estructurados
status: active
owner: mantenimiento
last_reviewed: 2026-06-26
---

# Observabilidad con logs estructurados

## Decisión operativa

AgroGest VSM usa `pino` en la API para emitir logs JSON estructurados. No se
integra Sentry en esta fase.

El objetivo es que el desarrollador y cualquier IA puedan leer logs de Render,
identificar una petición, agrupar errores y reconstruir fallos sin depender de
mensajes libres difíciles de buscar.

## Fuente de logs

Actualmente la fuente principal es la API:

- `stdout` de Render;
- logs locales al ejecutar `pnpm --filter @agrogest/api dev` o `start`;
- health checks `/health` y `/health/db` para estado y versión desplegada.

Admin web y mobile no envían telemetría remota en esta fase. Sus errores se
correlacionan mediante reportes de usuario, capturas sin secretos y
`requestId` devuelto por la API cuando aplique.

## Eventos principales

### `api.started`

Emitido al iniciar la API.

Campos relevantes:

- `service`;
- `environment`;
- `version`;
- `commit`;
- `branch`;
- `url`;
- `trustProxy`.

### `http.request.completed`

Emitido al terminar cada petición HTTP.

Campos relevantes:

- `requestId`;
- `method`;
- `path`;
- `statusCode`;
- `durationMs`;
- `remoteAddress`.

La ruta no incluye querystring para evitar registrar filtros o valores
innecesarios.

### `http.request.exception`

Emitido para errores HTTP no controlados de servidor.

Campos relevantes:

- `requestId`;
- `method`;
- `path`;
- `statusCode`;
- `errorCode`;
- `error.message`;
- `error.stack`.

## Niveles

- `info`: arranque y peticiones exitosas;
- `warn`: peticiones rechazadas por validación, autenticación, permisos o
  conflictos de dominio;
- `error`: errores 5xx o fallos no controlados;
- `fatal`: reservado para caída de proceso si se implementa un hook explícito.

Configurar mediante:

```bash
LOG_LEVEL=info
```

Valores permitidos: `trace`, `debug`, `info`, `warn`, `error`, `fatal`.

## Correlación de incidentes

1. Pedir al usuario hora aproximada, módulo y acción.
2. Buscar en logs por `statusCode >= 500` o por ruta afectada.
3. Copiar el `requestId`.
4. Buscar todos los eventos con el mismo `requestId`.
5. Revisar `/health` para confirmar `commit`, `branch` y entorno.
6. Si afecta DB, revisar `/health/db` con usuario autorizado.
7. Registrar causa, mitigación y prevención en el incidente.

## Consultas útiles

Buscar errores de servidor:

```text
"event":"http.request.exception"
```

Buscar peticiones lentas en los logs exportados:

```text
"durationMs":
```

Buscar una petición concreta:

```text
"requestId":"<id>"
```

Buscar un endpoint:

```text
"path":"/visitas-campo"
```

## Datos prohibidos

No registrar:

- contraseñas;
- access tokens o refresh tokens;
- cookies;
- cabeceras `Authorization`;
- cuerpos completos de request/response;
- datos personales innecesarios de productores o usuarios;
- backups o cadenas de conexión.

El logger redacta claves comunes como `password`, `token`, `accessToken`,
`refreshToken`, `authorization` y `cookie`, pero la regla principal es no
enviar esos datos al logger.

## Retención y acceso

- Desarrollo: conservar logs locales solo mientras dure la depuración.
- Producción Render: usar la retención disponible del plan contratado.
- Si se exportan logs, guardar solo el rango necesario para el incidente.
- No compartir logs completos con una IA si contienen datos reales. Extraer
  líneas relevantes y anonimizar identificadores cuando sea posible.

## Alertas mínimas sin Sentry

Hasta tener una plataforma de monitoreo externa, revisar manualmente:

- picos de `statusCode` 5xx;
- errores repetidos en login o refresh;
- duración alta en rutas de sync o visitas;
- fallos de `/health` o `/health/db`;
- errores reportados por usuarios con `requestId`.

Antes de una entrega, ejecutar:

```bash
pnpm check
pnpm build
```

y confirmar que `/health` responde en el entorno desplegado.
