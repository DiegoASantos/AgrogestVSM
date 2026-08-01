# Handoff: Concentraciones y unidades de productos en receta mobile

## Identificación

- fecha: 2026-08-01
- responsable: Codex
- spec o issue: Spec 024
- alcance del diff: migración PostgreSQL 037, entidades y catálogos API,
  migración SQLite 49, caché de catálogos, receta mobile y documentación activa
- criticidad: alta

## Objetivo

Cargar sin duplicados las concentraciones y unidades del documento fuente en los
catálogos de marcas fitosanitarias y fertilizantes, y mostrarlas automáticamente
en un único input readonly de la receta mobile.

## Cambios realizados

- `apps/api/src/database/migrations/037-*`: esquema y carga idempotente de 21
  marcas y 15 fertilizantes; corrección de `Austar 25 SC`.
- entidades y controlador de `visita-recetas`: contrato compatible con
  concentración numérica legada y nuevos valores textuales/unidad.
- `apps/mobile/src/shared/database`: migración aditiva 49, esquema y descarga de
  los campos de catálogo sin tocar outbox ni detalles de receta.
- pantalla de receta: autocompletado readonly de concentración y unidad para
  fitosanitarios y fertilizantes; cálculo solo con decimales simples.
- spec 024, modelo de dominio y arquitectura offline actualizados.

## Contratos y datos afectados

- API: `GET /marcas-producto` agrega `concentracionTexto` y `unidadMedida`; el
  campo numérico `concentracion` se conserva. `GET /fertilizantes` agrega
  `concentracion` y `unidadMedida`.
- PostgreSQL/PostGIS: `marcas_producto.concentracion` pasa a varchar; agrega
  `unidad_medida`. `fertilizantes` agrega concentración y unidad.
- SQLite/outbox: migración 49 agrega columnas de caché e invalida
  `catalogs_downloaded_at`; no cambia outbox ni datos operativos.
- autenticación y permisos: sin cambios.
- variables y despliegue: sin variables; desplegar migración/API antes de mobile.

## Validaciones ejecutadas

| Comando o prueba | Resultado |
| ---------------- | --------- |
| typecheck API y mobile | pasa |
| 4 archivos de pruebas focalizadas | 35/35 pasan |
| lint API y archivos mobile modificados | pasa |
| Prettier de archivos modificados | pasa |
| build API y mobile | pasa |
| suite global | 550/552; dos fallos previos en `sync-offline-online.test.ts` |
| `docs:check` | falla por deuda global previa de frontmatter/índice |
| `db:smoke` | falla antes del cambio, en migración histórica 001 |

## Riesgos conocidos y exclusiones

- El smoke PostgreSQL no pudo verificar la migración 037 por un fallo anterior
  del bootstrap: falta `parcelas.sector_id` al aplicar la migración 001.
- La suite global conserva dos aserciones ajenas donde una operación de sync se
  contabiliza como omitida; el alcance no modifica handlers ni motor de sync.
- No se persiste concentración/unidad del fertilizante en el detalle histórico;
  se reconstruye por nombre desde el catálogo según la spec.
- PDFs, función agronómica de fertilizantes y panel web están excluidos.

## Instrucciones al reviewer

- revisar únicamente el alcance descrito;
- no modificar archivos;
- citar archivo y línea;
- priorizar defectos reproducibles;
- devolver veredicto y hallazgos por severidad.

## Disposición posterior a la primera revisión

- Caso límite numérico: aceptado; se agregaron pruebas para espacios y `0.0`.
- Dependencia de `ON COMMIT DROP`: aceptada; las tablas temporales ahora se
  eliminan explícitamente y funcionan aun fuera de una transacción envolvente.
- Recarga de catálogo: rechazada con evidencia; `SyncRunner` monta `useSync` en
  el layout raíz y el primer ciclo online invoca `refreshCatalogsIfStale`.
- Fallback del cliente antiguo: sin defecto; se conserva por compatibilidad.
- Updates de Austar: rechazada; las condiciones son excluyentes y no actualizan
  dos veces la misma fila.
- Formato incidental: aceptado; se restauró el formato ajeno a la funcionalidad.
