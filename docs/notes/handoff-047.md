# Handoff: Spec 047 - reconciliacion de catalogos de receta mobile

## Identificacion

- fecha: 2026-08-17
- responsable: Codex
- spec o issue: Spec 047
- alcance del diff: descarga y reconciliacion SQLite de ingredientes activos,
  marcas de producto y fertilizantes; pruebas y documentacion asociada
- criticidad: media

## Objetivo

Evitar que un alta local `pending/error` bloquee o duplique un producto que la
API ya confirma con el mismo `publicId`, y conservar referencias locales
coherentes entre marcas e ingredientes.

## Cambios realizados

- `apps/mobile/src/shared/database/seed-catalogs.ts`: resuelve identidades por
  `server_id`, ID remoto legado o `public_id`; confirma filas locales, limpia
  metadata de la sesion, consolida duplicados y remapea ingredientes de marcas.
- `apps/mobile/src/shared/database/seed-catalogs.test.ts`: cubre reconciliacion
  de errores, IDs locales de ingredientes, duplicados y preservacion sin pull.
- `docs/architecture/mobile-offline-sync.md`: documenta la regla de
  confirmacion remota y preservacion de pendientes no confirmados.
- `docs/specs/047-reconciliacion-catalogos-receta-mobile.md` e indices:
  registran alcance, criterios y compatibilidad.

## Contratos y datos afectados

- API: sin cambios.
- PostgreSQL/PostGIS: sin cambios.
- SQLite/outbox: sin migracion; cambia la reconciliacion transaccional y solo
  se elimina metadata de sync de la sesion autenticada para identidades
  confirmadas.
- autenticacion y permisos: sin cambios; se reutiliza el propietario de la
  sesion de catalogos.
- variables y despliegue: sin variables; compatible con OTA.

## Validaciones ejecutadas

| Comando o prueba                                                     | Resultado                            |
| -------------------------------------------------------------------- | ------------------------------------ |
| `pnpm test -- apps/mobile/src/shared/database/seed-catalogs.test.ts` | 9/9                                  |
| pruebas relacionadas de catalogos, seleccion y recovery              | 28/28                                |
| `pnpm --filter @agrogest/mobile typecheck`                           | correcto                             |
| `pnpm --filter @agrogest/mobile lint`                                | correcto                             |
| `pnpm --filter @agrogest/mobile build`                               | correcto                             |
| `pnpm docs:check`                                                    | 102 documentos correctos             |
| `pnpm test`                                                          | 194 archivos, 1482 pruebas correctas |
| `git diff --check`                                                   | correcto                             |

## Riesgos conocidos y exclusiones

- La correccion se aplica al descargar catalogos; no agrega polling ni filtros
  por agronomo.
- No se despliega ni publica una OTA en este cambio.
- La fuente remota autenticada y su `publicId` estable son autoritativos cuando
  confirman un alta local.

## Instrucciones al reviewer

- revisar unicamente el alcance descrito;
- no modificar archivos;
- citar archivo y linea;
- priorizar defectos reproducibles;
- devolver veredicto y hallazgos por severidad.
