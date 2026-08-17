# Handoff: Recomendaciones reactivas y preventivas

## Identificacion

- fecha: 2026-08-17
- responsable: Codex
- spec o issue: Spec 044
- alcance del diff: API y persistencia de recetas, migraciones PostgreSQL y
  SQLite, sync offline, formulario mobile, historial, PDF, pruebas y
  documentacion activa
- criticidad: alta

## Objetivo

Conservar las recomendaciones reactivas existentes y permitir que el tecnico
agregue manualmente prevenciones fitosanitarias para objetivos sin incidencia
positiva, ademas de identificar fertilizantes preventivos, sin modificar el
diagnostico de campo, las formulas ni las unidades.

## Cambios realizados

- API: valida enfoque, objetivo sanitario activo, tipo, grados 0, ausencia de
  diagnostico positivo y factor preventivo 1 antes de reemplazar la receta.
- PostgreSQL: migracion aditiva 049 con campos, constraints y clave foranea.
- Mobile: selector manual de objetivo preventivo por etapa, tarjetas
  reactivas/preventivas y enfoque por fertilizante.
- SQLite/sync: migracion 62, repositorio, payload anidado y reintento del
  agregado completo sin nuevas operaciones de outbox.
- Presentacion: enfoque en formulario, receta anterior y PDF; fitosanidad
  preventiva muestra incidencia y severidad grado 0.
- Documentacion: Spec 044, modelo de dominio, arquitectura offline y riesgo de
  orden de despliegue.

## Contratos y datos afectados

- API: `mezclas[].productos[]` agrega opcionalmente `enfoque`, `objetivoId`,
  `incidenciaGrado` y `severidadGrado`; `fertilizacion[]` agrega `enfoque`.
- PostgreSQL/PostGIS: cuatro columnas en `visita_receta_fitosanidad` y una en
  `visita_receta_fertilizacion`; no cambia PostGIS.
- SQLite/outbox: columnas espejo aditivas; `visita_recetas` sigue siendo la
  unica operacion padre del agregado.
- autenticacion y permisos: sin cambios.
- variables y despliegue: sin variables nuevas; desplegar migracion 049 y API
  antes de la OTA mobile.

## Validaciones ejecutadas

| Comando o prueba | Resultado |
| ---------------- | --------- |
| `pnpm.cmd check` | correcto: lint, tipos, 186 archivos y 1447 pruebas, docs |
| `pnpm.cmd build` | correcto en todos los workspaces |
| pruebas dirigidas de API, DB, mobile, repositorio y sync | correctas |
| `git diff --check` | correcto; solo avisos de normalizacion LF/CRLF |
| `pnpm.cmd format:check` | falla por baseline global de 802 archivos |

## Disposicion de la primera revision independiente

- Corregido: cambiar el enfoque de un fertilizante ahora recalcula unicamente
  ese registro y conserva factores manuales de grado 3 en los demas productos.
- Conservado: una mezcla mixta mantiene el factor calculado o ajustado por el
  flujo existente; la prevencion grado 0 no lo eleva.
- Descartado: las observaciones sanitarias no admiten multiples filas para la
  misma visita y objetivo; el servicio existente traduce esa restriccion unica.
- Conservado: marcar una tarjeta preventiva vacia como dato impide guardar una
  prevencion incompleta en silencio.
- Conservado por alcance: no se convierte automaticamente una prevencion en
  reaccion cuando cambia el diagnostico; el API rechaza la contradiccion.
- Conservado por compatibilidad: el catalogo global activo solo es fallback
  para visitas historicas sin etapa; las visitas nuevas exigen etapa.

## Riesgos conocidos y exclusiones

- No se ejecuto `pnpm db:smoke`: R-001 documenta un fallo previo del bootstrap
  historico antes de las migraciones nuevas.
- El API y la migracion PostgreSQL deben desplegarse antes de la OTA; el outbox
  conserva pendientes ante un rechazo temporal.
- No incluye admin-web ni asociacion de fertilizantes con deficiencias.
- No se convierten unidades ni se cambian formulas.

## Instrucciones al reviewer

- revisar unicamente el alcance descrito;
- no modificar archivos;
- citar archivo y linea;
- priorizar defectos reproducibles;
- devolver veredicto y hallazgos por severidad.
