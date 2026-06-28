---
title: Codigo obligatorio de cultivos
status: implemented
numero: "004"
area: api-db-mobile
created: 2026-06-28
approved_by: usuario
implemented_in: apps/api/src/modules/cultivos; apps/api/src/database/migrations/022-cultivo-code-required.ts; apps/admin-web/src/modules/mantenimiento; docs/domain/cultivos.md
---

# Spec 004: Codigo obligatorio de cultivos

## Contexto

El catalogo de cultivos tiene una inconsistencia entre backend y mobile:

- la API permite crear o actualizar cultivos con `code` ausente o nulo;
- el servicio de cultivos persiste `code: null` cuando no se envia;
- la entidad TypeORM declara `cultivos.codigo` como nullable;
- SQLite mobile declara `cultivos.code` como `TEXT NOT NULL`;
- la descarga de catalogos mobile inserta el `code` recibido desde API con
  `INSERT OR REPLACE`.

Esto puede romper la descarga offline si existe un cultivo sin codigo en
PostgreSQL. El contrato debe ser unico: todo cultivo tiene codigo obligatorio,
normalizado, unico y no vacio.

## Alcance

### Incluido

- Hacer `code` obligatorio en `POST /cultivos`.
- Impedir que `PATCH /cultivos/:id` deje `code` en `null` o vacio.
- Alinear `CultivoEntity` con `codigo NOT NULL`.
- Agregar migracion PostgreSQL para volver `cultivos.codigo` no nulo y bloquear
  valores vacios.
- Mantener compatibilidad con SQLite mobile, que ya exige `code NOT NULL`.
- Ajustar admin web para no enviar `null` cuando el campo codigo esta vacio.
- Ajustar tipos y pruebas que esperan `code` nullable en cultivos.
- Actualizar documentacion de dominio de cultivos al implementar.

### Excluido

- Cambios al modelo de productores.
- Cambios al modelo de variedades, campanias, etapas fenologicas o nutrientes.
- Carga masiva o decision funcional de codigos para cultivos existentes sin
  codigo.
- Operaciones contra produccion.

## Requisitos

- RF-001: `CreateCultivoDto.code` debe ser obligatorio, string, no vacio,
  normalizado a mayusculas y con longitud maxima de 20 caracteres.
- RF-002: `UpdateCultivoDto.code`, cuando se envie, debe ser string no vacio,
  normalizado a mayusculas y con longitud maxima de 20 caracteres.
- RF-003: el servicio de cultivos no debe convertir `code` ausente en `null` en
  creacion.
- RF-004: PostgreSQL debe rechazar `cultivos.codigo IS NULL`.
- RF-005: PostgreSQL debe rechazar `btrim(codigo) = ''`.
- RF-006: los errores por codigo duplicado deben seguir devolviendo conflicto
  controlado.
- RF-007: admin web debe validar codigo obligatorio antes de enviar el payload
  de creacion o actualizacion.
- RNF-001: no debe activarse `synchronize: true`.
- RNF-002: la migracion debe ser idempotente o tener guardas explicitas.
- RNF-003: mobile no debe requerir migracion SQLite para este cambio porque su
  esquema ya exige `code NOT NULL`.

## Contratos afectados

- API:
  - `POST /cultivos` cambia `code` de opcional a obligatorio.
  - `PATCH /cultivos/:id` permite omitir `code`, pero si se envia no puede ser
    nulo ni vacio.
  - las respuestas de cultivos deben tratar `code` como string no nulo.
- PostgreSQL:
  - columna `cultivos.codigo` pasa a `NOT NULL`;
  - se agrega o valida una regla para impedir string vacio normalizado.
- Admin web:
  - el formulario de cultivos debe exigir codigo.
- Mobile:
  - sigue consumiendo `code` como dato obligatorio de catalogo.
  - no cambia outbox porque cultivos no se crean offline.

## Seguridad y datos

El cambio no introduce datos sensibles ni modifica autorizacion. Las mutaciones
de cultivos siguen protegidas por rol `ADMIN` en la API.

Riesgo principal: existen cultivos historicos con `codigo NULL` o vacio. La
migracion no debe inventar codigos silenciosamente porque el codigo es un dato
funcional visible para usuarios y catalogos. Antes de aplicar la contraccion
debe verificarse:

```sql
SELECT id, nombre
FROM cultivos
WHERE codigo IS NULL OR btrim(codigo) = '';
```

Si la consulta devuelve filas, se deben corregir manualmente en una migracion o
script aprobado con codigos funcionales definidos por el mantenedor.

## Migracion y rollback

Secuencia propuesta:

1. Verificar en desarrollo si existen cultivos con `codigo NULL` o vacio.
2. Si existen, detener la migracion con error claro o resolverlos mediante una
   migracion de datos aprobada.
3. Agregar validacion API y admin web para impedir nuevos valores nulos o
   vacios.
4. Cambiar `CultivoEntity.code` a string no nullable.
5. Agregar migracion PostgreSQL:
   - normalizar espacios si aplica;
   - abortar si quedan valores nulos o vacios;
   - `ALTER TABLE cultivos ALTER COLUMN codigo SET NOT NULL`;
   - agregar constraint `CHECK (btrim(codigo) <> '')` si no existe.
6. Ejecutar pruebas acotadas de API y validacion de build/typecheck segun
   riesgo.
7. Actualizar `docs/domain/cultivos.md` para retirar la deuda conocida.

Rollback:

- Si solo falla codigo antes de migrar datos: revertir el deploy de API/admin.
- Si la migracion ya se aplico y no hubo datos transformados, una migracion de
  rollback puede:
  - eliminar el check de codigo no vacio;
  - `ALTER TABLE cultivos ALTER COLUMN codigo DROP NOT NULL`.
- No restaurar backup salvo que una operacion de datos aprobada haya escrito
  codigos incorrectos y no exista correccion hacia adelante segura.

## Criterios de aceptacion

- [x] CA-001: `POST /cultivos` sin `code` o con `code` vacio devuelve error de
  validacion.
- [x] CA-002: `POST /cultivos` con `code` valido crea cultivo y devuelve `code`
  no nulo.
- [x] CA-003: `PATCH /cultivos/:id` con `code: null` o `code: ""` devuelve error
  de validacion.
- [x] CA-004: la entidad TypeORM declara `codigo` no nullable y `code` como
  string no nulo.
- [x] CA-005: PostgreSQL rechaza `cultivos.codigo NULL` y codigo vacio.
- [x] CA-006: admin web no permite guardar cultivos sin codigo.
- [x] CA-007: la descarga de catalogos mobile no recibe cultivos con `code`
  nulo.
- [x] CA-008: `docs/domain/cultivos.md` ya no registra la inconsistencia como
  deuda vigente.

## Pruebas

- unitarias de `CultivosService`;
- validacion DTO de creacion y actualizacion de cultivos;
- prueba o smoke de migracion PostgreSQL para `codigo NOT NULL` y check no
  vacio;
- prueba de admin web del payload de cultivos si existe infraestructura
  disponible;
- validacion manual de descarga de catalogos mobile o prueba de seed si el
  cambio toca tipos compartidos.

## Impacto documental

- [ ] Arquitectura.
- [x] Dominio: `docs/domain/cultivos.md`.
- [ ] Runbook.
- [ ] ADR.
- [ ] Variables o despliegue.
