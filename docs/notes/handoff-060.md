# Handoff: Conectividad mobile sin falsos cambios a offline

## Identificacion

- fecha: 2026-08-19
- responsable: Codex
- spec o issue: Spec 060
- alcance del diff: clasificacion de observaciones HTTP, vigencia de calidad,
  pruebas y documentacion de conectividad mobile
- criticidad: media

## Objetivo

Evitar que respuestas lentas, errores 5xx, cancelaciones internas o un historial
antiguo cambien la aplicacion a `offline_auto` cuando existe conectividad util,
sin retirar la degradacion ante timeouts o fallos reales de transporte.

## Cambios realizados

- `client.ts`: toda respuesta HTTP confirma alcance y una cancelacion externa
  deja de publicar una observacion mala.
- `sync-manager.ts`: la duracion deja de convertir un exito en fallo y la
  ventana persistida caduca despues de cinco minutos.
- pruebas: regresion para respuesta lenta, 5xx, cancelacion, timeout y ventana
  degradada vencida.
- documentacion: Spec 060, ADR-005, arquitectura, indices y riesgo Android.
- documentacion posterior a revision: criterio de conectividad en el runbook de
  release y etiqueta de ADR reemplazado en el indice canonico.

## Contratos y datos afectados

- API: sin cambios de endpoint, DTO ni respuesta.
- PostgreSQL/PostGIS: sin cambios.
- SQLite/outbox: sin cambios de esquema o contenido; `sync_state` conserva el
  mismo JSON y solo cambia su vigencia de lectura.
- autenticacion y permisos: sin cambios.
- variables y despliegue: sin cambios; requiere un nuevo build/OTA mobile para
  llegar a dispositivos.

## Validaciones ejecutadas

| Comando o prueba                             | Resultado          |
| -------------------------------------------- | ------------------ |
| Vitest focalizado (`sync-manager`, `client`) | 18/18              |
| Vitest sync y cliente HTTP                   | 80/80              |
| `pnpm --filter @agrogest/mobile typecheck`   | OK                 |
| `pnpm --filter @agrogest/mobile lint`        | OK                 |
| `pnpm docs:check`                            | 124 documentos, OK |
| `git diff --check`                           | OK                 |

## Resultado de la revision independiente

- modelo: `deepseek/deepseek-v4-pro`;
- sesion: `ses_fe43437a6ffeb95NBgYi4W9m08`;
- duracion: 220.81 segundos;
- veredicto: aprobado sin defectos funcionales en codigo;
- hallazgo bajo aceptado: actualizar el criterio obsoleto de respuestas lentas
  en `deploy-mobile-expo.md`;
- observacion aceptada: identificar ADR-004 como reemplazado tambien en
  `docs/index.md`;
- observaciones sin cambio: conservar `SLOW_NETWORK_REQUEST_MS` para el sondeo
  manual y reemplazar el JSON vencido con la siguiente observacion.

## Riesgos conocidos y exclusiones

- falta validar las transiciones reales de NetInfo y `fetch` en un dispositivo
  Android; queda registrado como R-032;
- una API alcanzable con HTTP 5xx se considera online y muestra su error de
  servidor, de acuerdo con ADR-005;
- no se modifican outbox, handlers, datos operativos ni modo offline manual.

## Instrucciones al reviewer

- revisar unicamente el alcance descrito;
- no modificar archivos;
- citar archivo y linea;
- priorizar defectos reproducibles;
- devolver veredicto y hallazgos por severidad.
