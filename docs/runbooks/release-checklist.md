---
title: Checklist de release
status: active
owner: mantenimiento
last_reviewed: 2026-06-26
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
- Variables revisadas contra `.env.example`, `render.yaml`, `vercel.json` y
  `eas.json`, sin leer archivos `.env`.

## API Render

- Migraciones revisadas.
- Backup y restore aplicables definidos antes de cambios de datos.
- Health check `/health` considerado en el plan.
- Rollback de código no se trata como rollback de datos.

## Admin web Vercel

- `NEXT_PUBLIC_API_URL` apunta al API correcto.
- Login y ruta protegida verificados.
- Cambios de contrato API coordinados con backend.

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
