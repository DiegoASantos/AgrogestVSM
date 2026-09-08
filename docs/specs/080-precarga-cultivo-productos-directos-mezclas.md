---
title: Precarga de cultivo y productos directos en mezclas
status: implemented
numero: "080"
area: mobile, visitas, recetas, mezclas, sqlite, postgresql, api, sync, ux
created: 2026-09-07
approved_by: usuario mediante instruccion "Implementa el plan", 2026-09-07
implemented_in: apps/mobile/src/modules/visitas-campo; apps/mobile/src/modules/visita-recetas; apps/mobile/src/shared/database; apps/mobile/src/shared/sync; apps/api/src/database/migrations/061-productos-directos-mezclas.ts; apps/api/src/modules/visita-recetas; apps/admin-web/src/modules/visitas; docs/architecture/mobile-offline-sync.md; docs/domain/data-model.md
---

# Spec 080: Precarga de cultivo y productos directos en mezclas

## Contexto

En una segunda visita a la misma parcela, mobile recupera area, plantas y fecha
de siembra, pero obliga a volver a elegir cultivo y variedad. Ademas, Mezclas
solo permite asignar productos creados previamente en Receta. Este recorrido
resulta dificil para usuarios mayores que necesitan registrar directamente el
producto comercial, su dosis y unidad con el menor numero posible de pasos.

## Alcance

### Incluido

- Precarga editable de cultivo y variedad desde la ultima visita activa de la
  parcela.
- Buscador unico y siempre disponible en Mezclas para nombres comerciales
  fitosanitarios y fertilizantes.
- Alta de productos fitosanitarios sin objetivo como `Aplicación directa`.
- Alta de fertilizantes foliares directos desde Mezclas.
- Persistencia, borrador, SQLite, outbox, API, PostgreSQL y reportes.
- Compatibilidad con recetas historicas y clientes mobile instalados.

### Excluido

- Inferir una plaga, enfermedad o deficiencia que el tecnico no selecciono.
- Fertilizantes edaficos dentro del nuevo atajo.
- Cambios en formulas agronomicas, permisos, autenticacion o catalogos.
- Retirar los flujos tecnicos existentes de Receta.

## Requisitos

- RF-001: Una visita nueva precarga cultivo y variedad de la ultima visita
  activa de la parcela, ordenada por fecha, hora y creacion. Los valores son
  editables y nunca sobrescriben un borrador o una edicion ya realizada.
- RF-002: Si el cultivo o variedad anterior no existe en el catalogo local
  vigente, el campo queda pendiente y la UI informa que debe seleccionarse.
- RF-003: Mezclas muestra siempre `Agregar producto`, con una busqueda local que
  combina nombres comerciales fitosanitarios y fertilizantes e ignora
  mayusculas y tildes.
- RF-004: Una marca fitosanitaria completa ingrediente, tipo y concentracion
  desde la fila exacta del catalogo. El usuario solo ingresa dosis y unidad.
- RF-005: Un fertilizante agregado por este atajo usa via foliar, conserva su
  tipo y concentracion del catalogo, y solo solicita dosis y unidad.
- RF-006: El producto nuevo se asigna de inmediato a la mezcla activa y queda
  disponible para reutilizarse en otras mezclas. Eliminarlo de la receta
  requiere confirmacion si participa en mas de una mezcla.
- RF-007: Frecuencia, volumen para fitosanitarios y fertilizantes foliares,
  coadyuvantes, orden, copia y validaciones de cierre permanecen vigentes.
- RF-008: Fitosanitarios y fertilizantes directos conservan
  `origen = mezcla_directa`; los anteriores y los creados en Receta conservan
  `origen = recomendacion`.
- RF-009: Un fitosanitario directo no exige objetivo, nombre de objetivo,
  enfoque ni IDs tecnicos. Las recomendaciones normales mantienen todas sus
  reglas actuales.
- RF-010: Detalle y PDF presentan `Aplicación directa` sin inventar un objetivo
  sanitario o nutricional.
- RNF-001: El agregado conserva una sola operacion padre `visita_recetas`, el
  orden padre-hijos, idempotencia, reintentos y recuperacion tras reinicio.
- RNF-002: La UI mantiene controles tactiles de al menos 48 dp, etiquetas
  accesibles, categoria visible en resultados y soporte de texto ampliado.

## Contratos afectados

- Los usos fitosanitarios y de fertilizacion agregan
  `origen?: "recomendacion" | "mezcla_directa"`; la ausencia se interpreta
  como `recomendacion`.
- Para `mezcla_directa`, `objetivo` y `objetivoNombre` son opcionales y nulos;
  siguen obligatorios para `recomendacion`.
- SQLite y PostgreSQL agregan `origen` a fitosanidad y fertilizacion, y vuelven
  nullable solo las columnas de objetivo fitosanitario necesarias.
- Borrador y payload anidado de `visita_recetas` conservan el origen sin crear
  otro tipo de outbox.

## Seguridad y datos

No cambian guards, roles ni datos personales. API valida condicionalmente el
origen y rechaza una recomendacion normal sin objetivo. Los nombres visibles
se copian del catalogo local como instantanea historica.

## Migracion y rollback

- PostgreSQL: migracion aditiva 061 agrega `origen` con default
  `recomendacion`, relaja objetivos fitosanitarios y agrega checks
  condicionales.
- SQLite: migracion 72 reconstruye transaccionalmente solo la tabla
  fitosanitaria para volver nullable el objetivo, copia todas sus filas y
  metadatos de sync, y agrega `origen` con default `recomendacion` a ambos
  detalles. No elimina recetas ni outbox pendientes.
- Despliegue: migracion PostgreSQL y API compatible antes de mobile/OTA.
- Rollback de codigo ignora `origen`; PostgreSQL conserva las columnas y SQLite
  usa correccion hacia adelante. No se eliminan recetas ni outbox pendientes.

## Criterios de aceptacion

- [x] CA-001: La segunda visita precarga cultivo y variedad editables.
- [x] CA-002: Un borrador o cambio manual no es sobrescrito por la precarga.
- [x] CA-003: Mezclas permite buscar y agregar ambos tipos de producto aun si
      Receta ya contiene recomendaciones.
- [x] CA-004: El alta fitosanitaria directa finaliza sin objetivo tecnico, pero
      con dosis, unidad, frecuencia y volumen validos.
- [x] CA-005: El alta de fertilizante directo es foliar y exige volumen.
- [x] CA-006: Los productos directos se restauran, copian, sincronizan y
      eliminan sin duplicar la operacion padre.
- [x] CA-007: Recomendaciones normales y clientes anteriores conservan su
      comportamiento.
- [x] CA-008: Detalle y PDF muestran `Aplicación directa`.

## Pruebas

- unitarias de precarga, busqueda, alta, validacion y eliminacion;
- migraciones SQLite y PostgreSQL;
- DTO y servicio API para ambos origenes y payload legacy;
- borrador, repositorio, outbox, offline-online, reintento y reinicio;
- reportes mobile y web;
- lint, tipos, build y validacion manual Android.

## Impacto documental

- [x] Arquitectura offline.
- [x] Modelo de dominio.
- [x] Indice documental y de specs.
- [x] Riesgos y despliegue.
- [x] ADR: no aplica; extiende el agregado de receta vigente.
