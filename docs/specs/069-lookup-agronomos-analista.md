---
title: Lookup de agrónomos para visitas con rol analista
status: implemented
numero: "069"
area: api, admin-web, seguridad
created: 2026-08-24
approved_by: usuario mediante solicitud de corrección, 2026-08-24
implemented_in: apps/api/src/modules/users; apps/admin-web/src/modules/visitas; docs/specs/022-rol-analista-web-solo-lectura.md
---

# Spec 069: Lookup de agrónomos para visitas con rol analista

## Contexto

El listado de visitas cargaba los nombres y filtro de agrónomos desde el
endpoint administrativo de usuarios. Un usuario con rol `ANALISTA` no puede
leer ese recurso, por lo que la interfaz ocultaba el error y mostraba IDs como
`Usuario #5`.

## Alcance

### Incluido

- Exponer un lookup de agrónomos activos para filtros de visitas.
- Autorizar su lectura a `ADMIN` y `ANALISTA`.
- Mostrar el nombre visible del agrónomo en la tabla y selector de visitas.

### Excluido

- Acceso de `ANALISTA` al listado administrativo completo de usuarios.
- Cambios a usuarios, roles, JWT o esquema de datos.

## Requisitos

- RF-001: `GET /usuarios/agronomos` devuelve solo ID, nombre visible y estado
  activo de usuarios con rol `AGRONOMO`.
- RF-002: El endpoint permite `GET` a `ADMIN` y `ANALISTA`; las rutas de
  administración de usuarios conservan `ADMIN` exclusivamente.
- RF-003: El frontend usa ese lookup para el selector y la columna Agrónomo.

## Contratos afectados

- API: se agrega `GET /usuarios/agronomos` con envoltorio de respuesta exitoso.
- Admin web: el catálogo de filtros de visitas deja de llamar `GET /usuarios`.

## Seguridad y datos

El nuevo endpoint no devuelve correo, teléfono, roles, permisos ni credenciales.
El guard global mantiene autenticación y las mutaciones de ANALISTA siguen
bloqueadas. No existen accesos por ID ni cambios de persistencia.

## Migración y rollback

No hay migración. Desplegar API antes o junto al panel web. Rollback: restaurar
el cliente y retirar el endpoint; no hay datos que transformar.

## Criterios de aceptación

- [x] CA-001: ANALISTA ve los nombres de agrónomos en visitas.
- [x] CA-002: ANALISTA puede seleccionar agrónomos activos en el filtro.
- [x] CA-003: La respuesta no expone correo ni teléfono.
- [x] CA-004: `GET /usuarios` conserva autorización exclusiva de ADMIN.

## Pruebas

- Unitarias del lookup API, metadata de roles y cliente de visitas.
- Lint, typecheck, pruebas focalizadas y revisión de seguridad.

## Impacto documental

- [x] Actualizar spec de rol ANALISTA y los índices de specs.
- [ ] Arquitectura, dominio, runbook, ADR, variables o despliegue: sin cambios.
