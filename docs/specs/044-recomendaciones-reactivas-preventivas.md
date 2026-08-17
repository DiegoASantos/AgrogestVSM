---
title: Recomendaciones reactivas y preventivas
status: implemented
numero: "044"
area: receta, fitosanidad, fertilizacion, api, database, mobile
created: 2026-08-17
approved_by: usuario, 2026-08-17
implemented_in: apps/api, apps/mobile y docs, 2026-08-17
---

# Spec 044: Recomendaciones reactivas y preventivas

## Contexto

La receta genera recomendaciones fitosanitarias a partir de hallazgos de campo
y asigna factores de fertilizacion segun las evaluaciones nutricionales. El
usuario tambien necesita recomendar productos de forma preventiva, sin crear
un diagnostico inexistente ni alterar la evidencia registrada durante la
visita.

El modelo sera dual: los hallazgos positivos conservan el flujo reactivo y el
usuario puede agregar manualmente prevenciones para plagas o enfermedades sin
presencia positiva. En fertilizacion se conserva el flujo actual y solamente
se identifica si cada producto es reactivo o preventivo.

## Alcance

### Incluido

- Recomendaciones fitosanitarias reactivas para incidencias grado 1 a 3.
- Accion manual para agregar una prevencion fitosanitaria contra una plaga o
  enfermedad no diagnosticada positivamente.
- Incidencia y severidad grado 0 dentro de la receta preventiva, sin crear ni
  modificar observaciones de campo.
- Identificacion `reactivo` o `preventivo` en fitosanidad y fertilizacion.
- Factor `1.0` no editable para fertilizacion preventiva y mezclas formadas
  exclusivamente por productos preventivos.
- Persistencia PostgreSQL y SQLite, contrato API, outbox y sincronizacion.
- Presentacion del enfoque en receta, receta anterior y PDF compartido.

### Excluido

- Asociar fertilizantes con una deficiencia nutricional.
- Crear evaluaciones u observaciones grado 0 desde la receta.
- Conversion automatica entre enfoques.
- Cambiar dosis, unidades o formulas.
- Cambios en admin-web, autenticacion, roles o permisos.

## Requisitos

### RF-001: Fitosanidad reactiva

- Los hallazgos con incidencia grado 1, 2 o 3 generan las tarjetas reactivas
  actuales.
- Los hallazgos grado 0 no generan una recomendacion reactiva.
- El factor de una mezcla sigue siendo el mayor factor reactivo de sus
  productos.

### RF-002: Fitosanidad preventiva

- La seccion ofrece una accion explicita `Agregar prevencion` incluso cuando no
  existen hallazgos positivos.
- El usuario escoge primero `plaga` o `enfermedad` y luego un elemento del
  catalogo sanitario activo para la etapa fenologica de la visita.
- El selector incluye elementos no evaluados o evaluados en grado 0 y excluye
  elementos con incidencia grado 1 a 3.
- Un objetivo preventivo aparece una sola vez por receta y admite varios
  productos dentro de su tarjeta.
- La prevencion guarda `incidenciaGrado = 0`, `severidadGrado = 0` y se puede
  eliminar manualmente.
- Una mezcla exclusivamente preventiva usa factor `1.0`. En una mezcla mixta,
  las prevenciones no elevan el factor derivado de los hallazgos reactivos.

### RF-003: Fertilizacion preventiva

- Cada fertilizante permite escoger `reactivo` o `preventivo`; el valor inicial
  y el fallback historico son `reactivo`.
- No se agrega un objetivo o deficiencia nutricional al registro.
- Al escoger `preventivo`, el factor se establece en `1.0`, deja de ser
  editable y el total se recalcula con la formula vigente.
- Al volver a `reactivo`, se restaura el factor derivado por el flujo actual.

### RF-004: Calculo sin cambios

La formula permanece exactamente igual:

```text
cantidadTotal = dosis * volumenAplicacion * factor
```

No se convierten dosis ni unidades. El grado 0 usa el factor `1.0` definido en
la Spec 029.

### RF-005: Contrato y persistencia

- Fitosanidad agrega `enfoque`, `objetivoId`, `incidenciaGrado` y
  `severidadGrado`.
- Fertilizacion agrega solamente `enfoque`.
- Los campos nuevos del API son opcionales para clientes instalados; la
  ausencia de `enfoque` se interpreta como `reactivo`.
- Una prevencion fitosanitaria exige objetivo valido, tipo coherente y ambos
  grados en 0.
- El API rechaza como preventivo un objetivo con incidencia positiva
  persistida en la visita.
- Una fertilizacion preventiva exige factor `1.0`.

### RF-006: Presentacion e historial

- Las tarjetas, la receta restaurada, la receta anterior y el PDF identifican
  cada recomendacion como `Reactivo` o `Preventivo`.
- La prevencion fitosanitaria muestra objetivo, incidencia grado 0 y severidad
  grado 0.
- La fertilizacion preventiva solo muestra su enfoque; no inventa una
  deficiencia.
- Las prevenciones no aparecen dentro del panel de hallazgos consolidados.

### RNF-001: Compatibilidad offline y despliegue

- Las migraciones son aditivas y no recrean tablas ni eliminan pendientes.
- Los reintentos del outbox conservan enfoque, objetivo y grados.
- Las recetas historicas se interpretan como reactivas sin reescritura masiva.
- API y migracion PostgreSQL se despliegan antes de la OTA mobile.

## Contratos afectados

- `mezclas[].productos[]`: `enfoque`, `objetivoId`, `incidenciaGrado` y
  `severidadGrado` opcionales.
- `fertilizacion[]`: `enfoque` opcional.
- Consolidacion sanitaria: identificador de catalogo por hallazgo para filtrar
  sin depender de nombres.
- SQLite y PostgreSQL: columnas aditivas espejo en los detalles de receta.

## Seguridad y datos

- No cambian guards, roles ni autenticacion.
- El API valida el objetivo preventivo contra el catalogo y contra la evidencia
  positiva de la visita.
- La receta preventiva no modifica el diagnostico de campo.
- No se agregan datos personales, secretos ni logs sensibles.

## Migracion y rollback

1. Agregar columnas nullable/default reactivo y constraints compatibles en
   PostgreSQL.
2. Desplegar API que acepte clientes anteriores y nuevos.
3. Agregar columnas SQLite mediante `addColumnIfMissing` sin reconstruccion.
4. Publicar la OTA mobile y verificar restauracion de una receta pendiente.

El rollback operativo vuelve al API y mobile anteriores; las columnas
aditivas permanecen ignoradas. SQLite conserva las columnas para no reconstruir
tablas con pendientes. Una contraccion fisica, si alguna vez se requiere, sera
una migracion posterior luego de verificar que no existen clientes dependientes.

## Criterios de aceptacion

- [x] CA-001: Solo incidencias grado 1 a 3 generan recomendaciones reactivas.
- [x] CA-002: Grado 0 y objetivos no evaluados aparecen en el selector
      preventivo.
- [x] CA-003: Objetivos positivos y prevenciones ya agregadas no aparecen en
      el selector.
- [x] CA-004: Una prevencion fitosanitaria guarda objetivo y ambos grados en 0.
- [x] CA-005: Una mezcla preventiva usa factor 1 y una mezcla mixta conserva el
      mayor factor reactivo.
- [x] CA-006: Fertilizacion conserva su flujo y solo agrega el enfoque; una
      prevencion usa factor 1.
- [x] CA-007: Las formulas, valores numericos y unidades no cambian por el
      enfoque.
- [x] CA-008: Guardado offline, reinicio, reintento y sincronizacion conservan
      los nuevos campos sin duplicar la receta.
- [x] CA-009: Receta, historial y PDF identifican las prevenciones.
- [x] CA-010: Clientes y recetas historicas sin campos nuevos siguen operando
      como reactivas.

## Pruebas

- Unitarias de filtrado, unicidad, grados y factores.
- DTO y servicio API para catalogo, tipo, diagnostico positivo y factor.
- Migraciones PostgreSQL y SQLite sobre versiones anteriores.
- Repositorio local, outbox y flujo offline-online.
- Restauracion, receta anterior y PDF.
- Lint, tipos, suite completa, builds y revision independiente.

## Impacto documental

- [x] Actualizar arquitectura de sync mobile.
- [x] Actualizar modelo de dominio y contratos de receta.
- [x] Enlazar Spec 044 desde los indices.
- [x] Registrar riesgos y compatibilidad de despliegue.
- [x] No requiere ADR ni variables nuevas.
