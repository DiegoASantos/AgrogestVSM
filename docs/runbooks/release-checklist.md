---
title: Checklist de release
status: active
owner: mantenimiento
last_reviewed: 2026-10-07
---

# Checklist de release

## Antes del release

- Alcance cerrado y revisado.
- Specs críticas en `implemented` con `implemented_in`.
- Documentación activa actualizada.
- Riesgos nuevos o deuda registrados.
- `pnpm check` aprobado.
- `pnpm test:coverage` aprobado o excepción justificada.
- `pnpm build` aprobado.
- `pnpm quality:branch-protection` aprobado antes de releases formales, o
  excepción documentada si GitHub CLI no está disponible.
- E2E aplicable ejecutado:
  - `e2e:ci` para cambios de panel sin backend;
  - `e2e:full` para cambios de sesión, visitas o flujos full-stack.
- Variables revisadas contra los archivos `.env.example`, `docker-compose.yml`
  y `eas.json`, sin leer archivos `.env`.

## API y panel en servidor físico Ubuntu

- Confirmar que el respaldo de PostgreSQL/PostGIS del servidor está disponible
  y que su restauración es viable antes de cambios de datos.
- Revisar las migraciones pendientes y ejecutarlas como paso controlado antes
  de iniciar la versión nueva de la API; Compose no las ejecuta al arrancar.
- Reconstruir API y panel con Docker Compose; conservar el mismo origen `/api`
  del panel y validar `/health`, `/health/db` con sesión autorizada y login.
- La imagen del panel fija `NEXT_PUBLIC_API_URL=/api` y usa
  `API_INTERNAL_URL=http://api:3001`; web y API deben compartir la red Compose.
- Confirmar acceso al panel y API en LAN y desde la red externa autorizada.
- Comprobar login, refresh y descargas autenticadas desde el panel.
- No tratar rollback de código como rollback de datos.
- La ruta pública `/productor/acreedores` debe funcionar sobre HTTPS antes de
  emitir invitaciones; `EXPO_PUBLIC_PRODUCTOR_WEB_URL` apunta a esa ruta.

## Mobile Expo/EAS

- Definir si el cambio es OTA o build nativo.
- No enviar OTA si cambia dependencia nativa, permisos o configuración nativa.
- Confirmar canal, runtime version y plan de rollback.
- Validar sync si afecta SQLite, outbox o datos offline.

## Criterio de cancelación

Cancelar o revertir el release si ocurre cualquiera de estos casos:

- migración fallida o datos inconsistentes;
- login o refresh token roto;
- error crítico en sync offline;
- health check rojo;
- credenciales, URLs o secretos mal configurados;
- documentación de rollback insuficiente para el cambio.

## Después del release

- Confirmar versión o commit desplegado.
- Ejecutar smoke test del componente entregado.
- Revisar logs sin exponer datos sensibles.
- Registrar incidencia o deuda si aparece un fallo.
