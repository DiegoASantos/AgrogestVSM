---
title: Compatibilidad del bootstrap con migración territorial 001
status: implemented
numero: 093
area: database, bootstrap, sectores, parcelas
created: 2026-10-06
approved_by: instrucción explícita del usuario (2026-10-06)
implemented_in: apps/api/src/database/migrations/001-territorial-sectors-and-piura-geography.ts; apps/api/src/database/migrations/001-territorial-sectors-and-piura-geography.test.ts; docs/runbooks/database-bootstrap.md; docs/operations/risk-register.md
---

# Spec 093: Compatibilidad del bootstrap con migración territorial 001

## Contexto

El modelo actual de `parcelas` usa `subsector_id`, mientras la migración
histórica 001 crea una restricción única y un índice con `sector_id`. Un
bootstrap desde el esquema actual falla con `42703` antes de completar las
migraciones. La migración 025 documenta la transición anterior de `sector_id` a
`subsector_id`.

## Alcance

### Incluido

- Hacer que la migración 001 detecte la columna de relación territorial que
  existe en `parcelas`.
- Crear la restricción única y el índice compuesto para `subsector_id` en el
  esquema vigente.
- Mantener compatibilidad con `sector_id` en un esquema anterior a la migración
  025.
- Añadir cobertura para ambos caminos y validar el bootstrap completo en un
  clúster temporal local.
- Actualizar runbook, riesgo R-001 e índices documentales.

### Excluido

- Cambiar la secuencia, identificador o datos geográficos sembrados por la
  migración 001.
- Alterar el borrado histórico de datos de prueba que ya hace la migración.
- Cambiar la migración 025, datos de producción, entidades o contrato de API.
- Ejecutar comandos sobre producción.

## Requisitos

- RF-001: cuando existe `parcelas.subsector_id`, la migración usa esa columna
  para la unicidad `(productor_id, subsector_id, codigo)` y el índice
  `(productor_id, subsector_id)`.
- RF-002: si solo existe `parcelas.sector_id`, conserva la unicidad e índice
  anteriores con esa columna, para que la migración 025 complete después el
  cambio a subsectores.
- RF-003: si no existe ninguna de las dos columnas, la migración falla con un
  error explícito que identifica la tabla y las columnas esperadas.
- RNF-001: conservar el ID de la migración 001; su SQL se ejecuta dentro de la
  transacción del runner y no debe dejar registrada una aplicación parcial.
- RNF-002: las bases que ya registraron la migración 001 no la vuelven a
  ejecutar mediante `migrate-database.ts`.

## Contratos afectados

- PostgreSQL: migración 001 selecciona la columna existente y asegura las
  claves e índices territoriales correspondientes. No crea ni elimina
  columnas.
- Bootstrap: TypeORM sincroniza el modelo actual antes de ejecutar migraciones;
  el estado vigente presenta `subsector_id`.
- Upgrade: el runner omite migraciones ya registradas. En una actualización
  histórica anterior a 025, la rama `sector_id` permite mantener el orden
  existente.

## Seguridad y datos

Validar únicamente con `pnpm db:smoke` o una base temporal local. No usar
credenciales ni bases de producción. El cambio no modifica el alcance de los
borrados históricos de 001; el bootstrap mantiene la precondición de esquema
vacío del runbook.

## Migración y rollback

1. Corregir el SQL versionado de 001 con detección explícita de columna y
   creación idempotente de constraint/índice para la rama detectada.
2. Mantener intacto el ID de migración. El fallo actual ocurre dentro de una
   transacción y deja 001 sin registrar; una repetición limpia puede ejecutar
   la versión corregida.
3. Las bases con 001 ya aplicada la omiten y no reciben cambios por este
   parche. No se requiere migración nueva de esquema.
4. Si falla el bootstrap, descartar solo el clúster temporal creado por
   `db:smoke`; no ejecutar rollback SQL destructivo sobre una base persistente.

## Criterios de aceptación

- [x] CA-001: el bootstrap en PostgreSQL/PostGIS vacío aplica 001 sin error de
      `sector_id` y continúa con las migraciones posteriores.
- [x] CA-002: con el modelo vigente, la restricción e índice quedan asociados
      a `subsector_id` y no hay referencias operativas a la columna ausente.
- [ ] CA-003: una base de prueba con el esquema anterior a 025 ejecuta la rama
      `sector_id` y la migración 025 termina con el esquema de subsectores.
- [ ] CA-004: provincias y distritos de Piura conservan los conteos esperados
      (8 y 65) y el smoke de DB pasa sus verificaciones. El smoke avanzó hasta
      025 y se detuvo por el riesgo independiente R-043.
- [x] CA-005: no se cambian datos ni el comportamiento de bases que ya tienen
      registrada la migración 001.

## Verificación de implementación

- Pasaron las cuatro pruebas focalizadas de migración 001.
- `pnpm db:smoke` en un PostgreSQL/PostGIS efímero aplicó 001 y continuó por
  002–024. Se detuvo en 025 porque `uq_subsectores_sector_nombre` ya existe
  como índice único de TypeORM. El script apagó y limpió su clúster temporal.
- No se operó contra producción. El smoke completo queda bloqueado por R-043,
  que está fuera del alcance de esta reparación.

## Impacto documental

- [x] Actualizar `docs/runbooks/database-bootstrap.md` con la validación actual.
- [x] Actualizar `docs/operations/risk-register.md`; mitigar R-001 y registrar
      el bloqueo independiente que apareció en 025.
- [x] Actualizar `docs/index.md` y `docs/specs/README.md` con esta spec.
- [x] Al implementar, completar `implemented_in`, cambiar el estado y anotar
      evidencia de las pruebas.
