---
title: Punto interno de referencia de parcela en mobile
status: implemented
numero: 030
area: parcelas, geodatos, mobile, api, sync, database
created: 2026-08-08
approved_by: usuario
implemented_in: apps/api/src/database/migrations/042-parcela-punto-referencia-interno.ts; apps/api/src/modules/parcelas; apps/mobile/src/shared/database/schema.ts; apps/mobile/src/shared/database/migrations.ts; apps/mobile/src/shared/database/seed-catalogs.ts; apps/mobile/src/shared/sync/sync-handlers.ts; apps/mobile/src/modules/parcelas; apps/mobile/src/modules/productores/presentation/screens/agregar-parcela-screen.tsx; packages/contracts/src/types/entity-types.ts
---

# Spec 030: Punto interno de referencia de parcela en mobile

## Contexto

La entidad `parcelas` conserva actualmente `punto_referencia` / `referencePoint`,
capturado por mobile en la entrada principal del predio. Ese punto no siempre
coincide con la ubicación interna de la parcela que se está registrando.

El flujo de alta necesita conservar ambos puntos sin cambiar el significado del
campo existente. Los dos valores pueden coincidir y su igualdad no constituye
un error ni requiere deduplicación.

## Alcance

### Incluido

- agregar un segundo GeoJSON Point nullable para la ubicación interna de la
  parcela en PostgreSQL/PostGIS y SQLite;
- exponer el campo en creación, actualización y lectura de parcelas en la API;
- descargarlo en el catálogo mobile y enviarlo mediante el handler offline de
  parcelas;
- capturar por separado el acceso al predio y la ubicación de la parcela en el
  formulario mobile;
- permitir copiar el punto de acceso como punto de parcela cuando ambos sean el
  mismo lugar;
- mantener compatibles la API y las bases locales existentes.

### Excluido

- modificar el polígono `geometry` / `geometria` de la parcela;
- calcular rutas o distancias entre ambos puntos;
- cambiar en este alcance el punto utilizado por clima, Cost-Build o procesos
  externos;
- hacer obligatoria la captura GPS cuando no haya permiso o señal disponible;
- corregir el compartido PNG de recetas, que se entrega como bug móvil
  independiente y no cambia datos ni contratos.

## Requisitos

- RF-001: PostgreSQL agregará `parcelas.punto_referencia_parcela` como
  `geometry(Point, 4326)` nullable.
- RF-002: La entidad TypeORM y el contrato REST usarán
  `parcelReferencePoint`; `referencePoint` conservará el significado de acceso
  principal al predio.
- RF-003: `POST /parcelas` y `PATCH /parcelas/:id` aceptarán el nuevo campo
  nullable y validarán GeoJSON Point, longitud, latitud y SRID 4326 con las
  mismas reglas del punto existente.
- RF-004: Las respuestas de parcelas incluirán ambos campos. La metadata y las
  features geográficas distinguirán `reference_point` de
  `parcel_reference_point` sin reemplazar identificadores existentes.
- RF-005: SQLite agregará `parcel_reference_point TEXT` mediante una migración
  aditiva e idempotente. Los registros existentes quedarán en `NULL`.
- RF-006: La descarga de catálogos conservará el nuevo punto como JSON GeoJSON
  y no sobrescribirá parcelas locales `pending`.
- RF-007: El alta offline guardará ambos puntos dentro de la misma transacción
  que crea la parcela y una única entrada de outbox.
- RF-008: El handler `parcelas` enviará ambos puntos en el mismo payload. La
  confirmación y reconciliación actuales no cambiarán de orden ni semántica.
- RF-009: La pantalla mostrará controles diferenciados para "Acceso al predio"
  y "Ubicación de la parcela", con coordenadas capturadas visibles.
- RF-010: El usuario podrá capturar cada punto con el GPS actual y podrá usar
  explícitamente el punto de acceso como punto de parcela.
- RF-011: Los puntos pueden ser iguales. No se agregará constraint ni
  validación que exija distancia entre ellos.
- RF-012: Si falta uno o ambos puntos, el formulario advertirá cuáles faltan y
  permitirá guardar sin bloquear el trabajo offline.
- RNF-001: El flujo continuará funcionando completamente sin conectividad.
- RNF-002: Ninguna migración borrará parcelas, visitas ni operaciones
  pendientes.
- RNF-003: API nueva aceptará clientes mobile anteriores y mobile nuevo se
  publicará después de desplegar la API compatible.
- RNF-004: No se registrarán coordenadas en logs de aplicación.

## Contratos afectados

- PostgreSQL: `parcelas.punto_referencia_parcela geometry(Point, 4326) NULL`.
- API: `parcelReferencePoint?: GeoJSON Point | null` en DTOs y respuestas de
  parcelas.
- SQLite: `parcelas.parcel_reference_point TEXT NULL`.
- Mobile: `Parcela.parcelReferencePoint` y payload de sync de `parcelas`.
- Catálogo: la respuesta descargada y el UPSERT local conservarán el campo.

`referencePoint` no se renombra ni cambia de significado para preservar a los
consumidores existentes.

## Seguridad y datos

Ambos campos son geodatos de una explotación agrícola y mantienen los mismos
roles, guards y transporte HTTPS que la parcela actual. No se agregan endpoints
públicos, permisos ni logs. El nuevo punto no se exporta a Cost-Build en este
alcance.

## Migración y rollback

1. Desplegar migración PostgreSQL aditiva `042` y API capaz de leer/escribir el
   campo nullable.
2. Verificar esquema, creación con ambos puntos y lectura de parcelas antiguas.
3. Publicar mobile con migración SQLite `57`, catálogo, repositorio, sync y UI.
4. Mantener `referencePoint` y todos los contratos anteriores durante la
   ventana de compatibilidad.

Rollback de aplicación: volver a la API/mobile anterior; ambas columnas son
nullable y pueden permanecer sin afectar el código anterior. No se automatiza
`DROP COLUMN`. Si una versión mobile nueva ya tiene operaciones pendientes, se
prefiere corregir hacia adelante antes que retirar el campo o recrear SQLite.

Verificación PostgreSQL:

```sql
SELECT column_name, udt_name
FROM information_schema.columns
WHERE table_name = 'parcelas'
  AND column_name = 'punto_referencia_parcela';
```

## Criterios de aceptación

- [x] CA-001: Una parcela puede guardarse offline con dos GeoJSON Point
      distintos y ambos sobreviven al reinicio de la app.
- [x] CA-002: Al sincronizar, ambos puntos quedan almacenados y se devuelven por
      la API sin intercambiar sus significados.
- [x] CA-003: El usuario puede asignar exactamente el mismo punto a acceso y
      parcela sin error.
- [x] CA-004: Una parcela antigua con el nuevo campo `NULL` sigue siendo
      legible, editable y sincronizable.
- [x] CA-005: La falta o denegación de GPS muestra una advertencia útil y no
      impide guardar la parcela.
- [x] CA-006: La descarga de catálogo conserva ambos puntos y no sobrescribe
      una parcela local pendiente.
- [x] CA-007: Clientes mobile anteriores continúan creando parcelas usando solo
      `referencePoint`.
- [x] CA-008: Los mapas pueden distinguir las features de acceso y ubicación
      interna mediante `geometryRole`.

## Pruebas

- API unitarias: creación, actualización, respuesta, puntos iguales, GeoJSON
  inválido y campo nullable;
- migración PostgreSQL: SQL aditivo, tipo geometry Point/SRID 4326 y rollback
  documentado no destructivo;
- mobile repositorio y migración: insert, lectura, catálogo, base anterior y
  preservación de pendientes;
- sync offline-online: payload con ambos puntos, reintento y confirmación;
- UI/manual: captura separada, copia del punto de acceso, permiso denegado,
  guardado parcial y reinicio de app;
- validaciones proporcionales: lint, typecheck, pruebas y builds de API/mobile.

## Impacto documental

- [x] Arquitectura: actualizar sincronización mobile con los dos campos de
      parcela.
- [x] Dominio: definir explícitamente acceso al predio y ubicación interna.
- [x] Runbook: no requiere un procedimiento nuevo; conservar rollback aditivo.
- [x] ADR: no requerido.
- [x] Variables o despliegue: no agrega variables; documentar orden API antes
      de mobile en el cierre de la spec.

## Resultado de implementación

- `pnpm check`: aprobado; lint, tipos, 155 archivos de prueba, 1182 pruebas y
  validación de 80 documentos.
- `pnpm build`: aprobado para API, admin web, mobile y paquetes compartidos.
- PostgreSQL 18 + PostGIS: migración 042 aplicada dos veces sobre un clúster
  temporal; columna nullable, `POINT` SRID 4326 y lectura de `NULL` verificadas.
- Revisión independiente DeepSeek: aprobada sin hallazgos críticos ni altos.
- `pnpm db:smoke`: el cambio nuevo no pudo alcanzarse porque el bootstrap falla
  antes en la migración histórica 001 al referenciar `parcelas.sector_id`; el
  defecto preexistente quedó reabierto como R-001. La migración 042 se validó
  de forma aislada para no confundir ambos resultados.
