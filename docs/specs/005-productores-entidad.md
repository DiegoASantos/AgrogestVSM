---
title: Entidad de productores
status: implemented
numero: 005
area: productores, api, admin-web, mobile, contratos, database
created: 2026-07-01
approved_by: usuario
implemented_in: apps/api/src/database/migrations/023-productores-entidad.ts; apps/api/src/modules/productores; apps/admin-web/src/modules/productores; apps/mobile/src/modules/productores; apps/mobile/src/shared/database; packages/contracts/src/types/entity-types.ts; docs/domain/data-model.md
---

# Spec 005: Entidad de productores

## Contexto

El modelo actual de productores asume que todo productor es una persona
identificada por `tipo_documento_id` y `nro_documento`. El negocio requiere
registrar tambien fundos y cooperativas como entidades productoras sin exigir
tipo ni numero de documento. Para preservar compatibilidad, se agregara un campo
`entidad` y se reutilizara la columna `nombres` como nombre obligatorio de
fundos y cooperativas, sin renombrarla.

El cambio afecta PostgreSQL, la entidad TypeORM, DTOs, servicio API, contratos
compartidos, admin web y la tabla SQLite usada por mobile para catalogos.

## Alcance

### Incluido

- Agregar `entidad` a productores con valores `persona`, `fundo` y
  `cooperativa`.
- Mantener `persona` como valor por defecto y valor de migracion para registros
  existentes.
- Permitir `tipo_documento_id` y `nro_documento` nulos para cualquier tipo de
  entidad.
- Exigir `nombres` y `apellidos` para productores de tipo `persona`.
- Exigir `nombres` como nombre de entidad para `fundo` y `cooperativa`.
- Mantener `telefono`, `email`, `direccion` y `activo` como campos opcionales o
  por defecto segun el comportamiento vigente.
- Actualizar API, admin web, mobile y contratos compartidos para consumir y
  presentar el nuevo tipo de entidad.
- Agregar pruebas proporcionales de migracion, validacion y contrato.

### Excluido

- Renombrar `nombres`, `apellidos` o columnas existentes.
- Crear una tabla nueva para tipos de entidad.
- Cambiar la relacion de productores con sectores, parcelas o visitas.
- Cambiar reglas de geodatos de parcelas.
- Crear sincronizacion offline nueva para alta local de productores.
- Reestructurar pantallas no relacionadas con productores.

## Requisitos

- RF-001: El productor debe exponer `entityType` en API, admin web, mobile y
  contratos compartidos.
- RF-002: `entityType` debe aceptar solo `persona`, `fundo` o `cooperativa`.
- RF-003: Si `entityType` no se envia al crear un productor, la API debe asumir
  `persona`.
- RF-004: Para `persona`, `firstName` y `lastName` son obligatorios.
- RF-005: Para `fundo` y `cooperativa`, `documentTypeId` y `documentNumber` no
  son obligatorios y la unicidad documental no se debe ejecutar ademas de que ni siquiera se debe mostrar en el formulario esos campos para `fundo` y `cooperativa`.
- RF-005A: Para `persona`, `documentTypeId` y `documentNumber` son opcionales.
  Si uno se informa, ambos deben informarse juntos y mantienen la regla de
  unicidad vigente por tipo y numero de documento.
- RF-006: Para `fundo` y `cooperativa`, `firstName` debe ser obligatorio y se
  persistira en la columna `nombres`.
- RF-007: Para `fundo` y `cooperativa`, `lastName` su valo debe ser `null`.
- RF-008: `phone`, `email` y `address` deben seguir siendo opcionales para todos
  los tipos de entidad.
- RF-009: `isActive` debe conservar `true` como valor por defecto.
- RF-010: El admin web debe permitir seleccionar entidad al crear o editar un
  productor, mostrando campos de documento solo cuando corresponda.
- RF-011: Las listas, filtros y labels de admin web y mobile no deben depender
  exclusivamente de `documentNumber`.
- RNF-001: El cambio debe ser compatible con datos existentes.
- RNF-002: La migracion PostgreSQL no debe operar contra produccion sin
  aprobacion explicita.
- RNF-003: La migracion SQLite debe agregar la columna sin borrar datos locales
  ni pendientes.
- RNF-004: No se deben introducir secretos, datos reales ni logs con datos
  personales innecesarios.

## Contratos afectados

- PostgreSQL:
  - Tabla `productores`.
  - Nueva columna `entidad varchar(20) not null default 'persona'`.
  - `tipo_documento_id` pasa a nullable.
  - `nro_documento` pasa a nullable.
  - Constraint `chk_productores_entidad` o nombre equivalente para restringir
    `entidad IN ('persona', 'fundo', 'cooperativa')`.
- API:
  - `CreateProductorDto` agrega `entityType`.
  - `UpdateProductorDto` hereda el contrato parcial.
  - Respuesta de productores agrega `entityType`.
  - `ensureUniqueDocument()` se ejecuta solo para `persona`.
- Admin web:
  - `ProductorListItem` y `ProductorPayload` agregan `entityType`.
  - Formulario de productores agrega selector de entidad y validacion
    condicional.
  - Tabla de productores muestra el tipo de entidad.
- Mobile:
  - SQLite `productores` agrega `entity_type text not null default 'persona'`.
  - Tipo `Productor` agrega `entityType`.
  - Repositorio mapea `entity_type` a `entityType`.
  - Seed de catalogos incluye `entityType` en `INSERT OR REPLACE`.
- Contratos compartidos:
  - `packages/contracts/src/types/entity-types.ts` alinea `Productor` con el
    contrato real.

## Seguridad y datos

- El cambio toca datos personales y datos de entidades productoras. Los logs no
  deben registrar documentos, telefonos, correos ni direcciones salvo errores
  tecnicos ya normalizados.
- La autorizacion vigente de la API debe mantenerse. El frontend solo controla
  visibilidad y ergonomia, no permisos.
- Los productores existentes deben quedar como `persona` y conservar documentos.
- Para `fundo` y `cooperativa`, el identificador visible principal sera el
  valor de `nombres`.
- No se agregan secretos ni variables de entorno.

## Migracion y rollback

### PostgreSQL

1. Crear la siguiente migracion disponible en
   `apps/api/src/database/migrations/`, actualmente
   `023-productores-entidad.ts`, no `002-productores-entidad.ts` porque ya
   existen migraciones hasta `022`.
2. En `up`:
   - agregar `entidad varchar(20) not null default 'persona'`;
   - quitar `not null` de `tipo_documento_id`;
   - quitar `not null` de `nro_documento`;
   - agregar check constraint para los valores permitidos.
3. En `down`:
   - documentar rollback operativo;
   - antes de restaurar `not null`, validar que no existan productores no
     persona sin documento;
   - remover constraint y columna `entidad` solo si la base ya fue saneada.

### SQLite mobile

1. Actualizar `schema.ts` para instalaciones nuevas.
2. Agregar migracion en `migrations.ts` con
   `ALTER TABLE productores ADD COLUMN entity_type TEXT NOT NULL DEFAULT 'persona'`
   usando helper idempotente si aplica.
3. No recrear ni truncar `productores`.
4. Mantener compatibilidad con catalogos descargados que todavia no incluyan
   `entityType` aplicando default `persona`.

### Compatibilidad

- Los clientes antiguos que no envien `entityType` seguiran creando `persona`
  si envian documento.
- Mobile debe poder leer productores existentes despues de la migracion local.
- Admin web debe seguir mostrando productores existentes sin intervencion
  manual.

## Orden de implementacion

1. Migracion PostgreSQL y su test.
2. Entidad TypeORM `ProductorEntity`.
3. DTOs de API.
4. Servicio de productores.
5. Contratos compartidos.
6. Admin web.
7. Mobile SQLite, repositorio, seed y tipos.
8. Tests afectados.
9. Validaciones: lint, typecheck, tests y build proporcionales.

## Criterios de aceptacion

- [x] CA-001: Un productor existente queda con `entityType = 'persona'` tras la
  migracion PostgreSQL.
- [x] CA-002: La API crea una `persona` con `firstName` y `lastName`
  obligatorios, documento opcional y rechazo de documentos duplicados cuando se
  informa documento.
- [x] CA-003: La API crea un `fundo` con `firstName` obligatorio, sin
  `documentTypeId` ni `documentNumber`.
- [x] CA-004: La API crea una `cooperativa` con `firstName` obligatorio, sin
  `documentTypeId` ni `documentNumber`.
- [x] CA-005: La API rechaza `entityType` fuera de `persona`, `fundo` o
  `cooperativa`.
- [x] CA-006: La respuesta API de productores incluye `entityType`.
- [x] CA-007: Admin web permite seleccionar entidad y ajusta campos requeridos
  segun el tipo.
- [x] CA-008: Admin web muestra el tipo de entidad en la tabla/listado.
- [x] CA-009: Mobile crea o migra la tabla local de productores con
  `entity_type` y default `persona`.
- [x] CA-010: Mobile mapea productores sin depender de `documentNumber` como
  valor siempre presente.
- [x] CA-011: `packages/contracts` queda alineado con el contrato real de
  Productor.

## Pruebas

- API:
  - test de migracion PostgreSQL forward/rollback;
  - tests de servicio o DTO para nombres obligatorios y documento opcional en
    `persona`;
  - tests de creacion de `fundo` y `cooperativa` sin documento;
  - test de unicidad documental solo para `persona`.
- Admin web:
  - actualizar `admin-critical-crud.service.test`;
  - agregar o ajustar pruebas de validacion client-side si existen para la
    pantalla de productores.
- Mobile:
  - test de migracion SQLite para `entity_type`;
  - test de repositorio o seed para mapear `entityType`.
- Validacion final:
  - `pnpm lint`;
  - `pnpm typecheck`;
  - `pnpm test`;
  - `pnpm build` si el alcance implementado toca las tres apps.

## Impacto documental

- [x] Arquitectura: no se espera cambio arquitectonico.
- [x] Dominio: actualizar `docs/domain/data-model.md` para explicar que
  Productor puede ser persona, fundo o cooperativa.
- [x] Runbook: no se espera actualizacion salvo que las validaciones revelen un
  procedimiento nuevo.
- [x] ADR: no se requiere ADR.
- [x] Variables o despliegue: no aplica.
- [x] Specs: al implementar, cambiar estado a `implemented`, completar
  `implemented_in` y actualizar los documentos activos afectados.
