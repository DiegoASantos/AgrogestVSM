---
title: Reparación del arranque SQLite en instalaciones nuevas
status: implemented
numero: 112
area: mobile, sqlite, arranque, release
created: 2026-10-19
approved_by: usuario mediante "Apruebo la corrección y la OTA iOS", 2026-10-19
implemented_in: apps/mobile/src/shared/database/migrations.ts, apps/mobile/src/shared/database/migrations-sqlite.test.ts; 2026-10-19
---

# Spec 112: Reparación del arranque SQLite en instalaciones nuevas

## Contexto

El primer iPhone del piloto instala el build Ad Hoc 0.2.4 (1), pero la app se
cierra al abrir. La compilación EAS `0fa109d0-608d-4cad-a461-dd4624fbbe83`
finalizó correctamente y no hay OTA iOS del runtime 0.2.4 publicada.

La ejecución del bootstrap real sobre SQLite en memoria reproduce
`duplicate column name: approval_status`: la base llega a `user_version = 74`
y la migración 75 intenta crear columnas que el esquema inicial vigente ya
incluye (`approval_status`, `source`, `review_observation`). `initDatabase()` se
llama sin captura desde el efecto de arranque, por lo que el error puede
terminar la ejecución JavaScript de release. La coincidencia con el fallo del
dispositivo debe contrastarse con su crash report y la reapertura tras reparar.

## Alcance

### Incluido

- Corregir exclusivamente la aplicación de la migración SQLite 75.
- Probar esquema vacío, reintento en 74 y actualización desde el esquema
  histórico de acreedores sin las tres columnas de revisión.
- Verificar conservación de registros y pendientes de outbox y ausencia de
  trabajo extra sobre bases ya actualizadas a 78.
- Actualizar arquitectura offline, runbook mobile y riesgo del piloto iOS.
- Preparar una OTA iOS correctiva compatible con runtime 0.2.4 y verificar
  con el usuario que la app logra arrancar. El usuario autoriza la corrección;
  la publicación requiere su autorización explícita si no la incluye al aprobar.

### Excluido

- Cambios en API, PostgreSQL, reglas de aprobación o payloads de sync.
- Cambios de firma, bundle ID, equipo Apple, runtime o dependencias nativas.
- Nuevas migraciones, reconstrucción de tablas, borrado de almacenamiento,
  desinstalación del iPhone o publicación OTA Android.
- Reescritura de las migraciones históricas destructivas previas a 74.

## Requisitos

- RF-001: En migración 75 reutilizar `addColumnIfMissing` para las tres columnas
  con las mismas definiciones, valores por defecto y constraints actuales.
- RF-002: Conservar la actualización histórica que marca `APPROVED` a los
  acreedores con `sync_status = 'synced'`; no cambiar esa regla de migración.
- RF-003: El avance a 75 ocurre dentro de su transacción vigente y solo al
  completar todos sus pasos. Un error real debe seguir propagándose con rollback.
- RF-004: Una instalación nueva y un bootstrap detenido en 74 con columnas
  presentes deben llegar a 78. Bases desde 75 no vuelven a ejecutar el paso 75.
- RF-005: La reparación no borra acreedores, productores, visitas, fotos,
  borradores ni outbox, y conserva IDs, propietarios, estados y payloads.
- RF-006: Probar el bootstrap con SQLite real para detectar colisiones de
  columnas que los dobles actuales no rechazan. Mantener compatibilidad de la
  suite con Node 20; ejecutar el smoke SQLite en una versión que lo soporte.
- RNF-001: No atribuir definitivamente el crash físico al defecto sin evidencia
  de dispositivo. Diferenciar reproducción SQLite local y validación en iPhone.

## Contratos afectados

Solo la ejecución condicional de DDL del paso 75. El esquema final, la versión
SQLite 78 y los contratos JSON/outbox existentes permanecen. Cambia JavaScript
compatible con el runtime nativo 0.2.4, por lo que no requiere IPA por sí mismo.

## Seguridad y datos

Usar exclusivamente datos sintéticos en pruebas. No acceder a bases reales ni
leer secretos. Conservar las claves foráneas y la política de transacciones.
No capturar errores para ocultarlos ni saltar migraciones completas. No cambiar
autorización, estados de revisión ni cifrado. Mantener los cambios locales del
asistente de firma Apple sin sobrescribirlos.

## Migración y rollback

Se repara el paso pendiente 75, porque una migración posterior no puede
ejecutarse mientras este paso aborta. No aumentar `user_version` ni forzarlo
manualmente. Antes de 75 se agregan solo las columnas ausentes y se conserva
el DML histórico. Bases 78 permanecen sin escrituras de migración.

Publicar la OTA solo para iOS sobre el canal production y runtime 0.2.4 si se
autoriza. Si el dispositivo no logra activar la OTA por el crash temprano,
generar otro IPA Ad Hoc con el mismo identificador/equipo y `buildNumber`
incrementado, e instalarlo encima conservando el almacenamiento; esa entrega
nativa debe revisarse antes de iniciarla. La app rota puede requerir aperturas
sucesivas para descargar y seleccionar la OTA; no garantizar su recuperación.

Si la corrección introduce un fallo, emitir corrección hacia adelante. Revertir
al bundle anterior reintroduce el bloqueo en instalaciones nuevas/en versión
74, por lo que no se considera una recuperación funcional. No borrar datos.

## Criterios de aceptación

- [x] CA-001: Fallo original reproducido con SQLite real y documentado.
- [x] CA-002: Bootstrap vacío y detenido en 74 terminan en 78 sin colisiones.
- [x] CA-003: Actualización histórica conserva registros, pendientes y regla
  de aprobación; segunda ejecución no realiza cambios.
- [x] CA-004: Errores auténticos conservan rollback y versión anterior.
- [x] CA-005: Lint, tipos, pruebas pertinentes, export iOS y docs aprobados.
- [x] CA-006: Entrega y resultado físico documentados, incluyendo cualquier
  evidencia o paso externo aún pendiente.

## Pruebas

- Regresión del bootstrap vacío con SQLite real y `foreign_key_check`.
- Fixtures sintéticas de versión 74 con y sin columnas; cero y nulo en datos
  relevantes, acreedores `pending` y `synced`, e outbox con payload identificable.
- Reapertura en 78 sin reejecutar DDL/DML; fallo inyectado con rollback.
- Suite mobile de migraciones/conexión, lint, tipos y export iOS.
- iPhone: abrir desde el icono sin cierre, mostrar login, reiniciar app y repetir;
  posteriormente login y sync con datos sintéticos bajo control del mantenedor.

## Impacto documental

- [x] Arquitectura offline: reparación de bootstrap y conservación de datos.
- [ ] Dominio.
- [x] Runbook mobile e incidente: diagnóstico y entrega de recuperación.
- [ ] ADR.
- [x] Variables o despliegue: OTA iOS compatible y fallback IPA preservador.

## Evidencia de ejecución: 2026-10-19

- Reproducción original: bootstrap vacío con SQLite real falla con
  `duplicate column name: approval_status`, conserva `user_version = 74`.
- Corrección: la migración 75 usa `addColumnIfMissing` para las tres columnas
  y conserva backfill y transacción. No cambia dependencias ni runtime nativo.
- `pnpm test apps/mobile/src/shared/database/migrations-sqlite.test.ts
  apps/mobile/src/shared/database/migrations.test.ts
  apps/mobile/src/shared/database/connection.test.ts`: 55 pruebas aprobadas,
  incluidas seis con SQLite real; CI usa Node 24. En Node 20 estas seis se omiten
  porque el motor incorporado no está disponible.
- `pnpm --filter @agrogest/mobile build`: aprobado; validación de tipos.
- `pnpm check`: aprobado; lint, tipos, 2141 pruebas en 286 archivos y validación
  de 195 documentos. Archivo nuevo de pruebas aprobado por Prettier.
- Release desde árbol de trabajo con cambios locales sobre `d3367b3`; sin
  crear commit ni incluir una publicación Android, API o panel.
- Export iOS aprobado: 1858 módulos, 53 assets y bundle Hermes de 6.21 MB en
  `dist/ios-bootstrap-repair-0.2.4` (movido desde el directorio temporal de
  exportación), sin cargar archivos `.env`.
- EAS: canal `production` activo, apunta a rama `production`; build Ad Hoc
  instalado y runtime 0.2.4 confirmados. Publicación iOS autorizada por el usuario.
- OTA publicada el 2026-10-19 a las 16:40:34 UTC (11:40:34 Lima), solo iOS,
  rama/canal `production`, runtime 0.2.4. Grupo
  `3b04de86-dc68-4367-bc55-1285c2922983`, update
  `01a15509-4a6c-77f8-9931-e8c136f855f1`. Mensaje:
  `Corrige arranque SQLite en instalaciones nuevas (spec 112)`.
  [Detalle de la entrega](https://expo.dev/accounts/diegosv/projects/agrogest-vsm-mobile-pilot/updates/3b04de86-dc68-4367-bc55-1285c2922983).
- EAS exportó y subió un bundle iOS; reutilizó assets existentes. No se emitió
  un IPA nuevo ni se publicó una OTA Android.
- Validación física: el usuario confirma el 2026-10-19 que la app funciona en
  iPhone y que probó los demás flujos, incluido compartir PDF. Se cierra el
  bloqueo de arranque (R-060). No se recibió crash report; no se atribuye por
  ello una excepción nativa concreta. Reporta un incidente separado al generar
  imágenes de receta, anterior al diálogo de compartir (R-061).
