---
title: Acceso de analista a mantenimiento y reportes web
status: implemented
numero: 072
area: seguridad, api, admin-web
created: 2026-09-04
approved_by: usuario, 2026-09-04
implemented_in: apps/api/src/modules; apps/admin-web/src; docs/operations/security-baseline.md
---

# Spec 072: Acceso de analista a mantenimiento y reportes web

## Contexto

El rol `ANALISTA` necesita administrar desde el panel web todos los catalogos y
recursos agrupados bajo Mantenimiento. Tambien se requiere una entrada principal
para Reportes, inicialmente sin funcionalidad. La API debe conservar el bloqueo
general de mutaciones de ANALISTA y habilitar solo las operaciones aprobadas.

## Alcance

### Incluido

- Acceso web de `ADMIN` y `ANALISTA` a todas las rutas de Mantenimiento.
- CRUD de Mantenimiento para ANALISTA, incluidos geodatos de parcelas y
  asignacion o desasignacion de agronomos.
- Ruta principal `/reportes` vacia para `ADMIN` y `ANALISTA`.
- Excepciones explicitas de autorizacion en cada mutacion API requerida.

### Excluido

- Acceso de ANALISTA a Seguridad o a otras mutaciones de negocio.
- Cambios de permisos en mobile, esquema, migraciones o contratos de datos.
- Implementacion de reportes, filtros, exportaciones o endpoints nuevos.

## Requisitos

- RF-001: ANALISTA puede abrir y operar todas las pantallas web de Mantenimiento.
- RF-002: ANALISTA puede crear, actualizar y desactivar sus recursos mediante
  los mismos formularios disponibles para ADMIN.
- RF-003: ANALISTA puede editar geodatos y asignar o desasignar agronomos en
  parcelas.
- RF-004: `/reportes` aparece en la navegacion principal y admite acceso directo
  solo para ADMIN y ANALISTA.
- RF-005: Seguridad permanece visible y accesible solo para ADMIN.
- RNF-001: El guard global mantiene bloqueada toda mutacion ANALISTA no marcada
  y autorizada explicitamente.

## Contratos afectados

- API: no cambian rutas, DTOs ni respuestas; se amplia a ANALISTA la autorizacion
  de las mutaciones ya consumidas por Mantenimiento.
- Admin web: se agrega la ruta `/reportes` y se amplia la matriz de rutas de
  Mantenimiento.
- PostgreSQL y mobile: sin cambios.

## Seguridad y datos

- Cada mutacion permitida combina `@Roles(...)` con
  `@AllowAnalystMutation()`; ocultar rutas en la web no sustituye esta politica.
- El selector de agronomos usa `/usuarios/agronomos`, que expone solo ID, nombre
  visible y estado, sin abrir el listado administrativo `/usuarios`.
- El permiso API se aplica a cualquier cliente con un JWT ANALISTA valido;
  mobile sigue rechazando sesiones con este rol.
- Los permisos existentes de AGRONOMO se conservan sin ampliacion.

## Migracion y rollback

1. Desplegar API antes o junto con admin web para evitar formularios visibles
   que reciban `403`.
2. Verificar la matriz ADMIN, ANALISTA y AGRONOMO en rutas web y endpoints.
3. El rollback restaura controladores, servicio de parcelas y navegacion web;
   no existen datos ni esquema que revertir.

## Criterios de aceptacion

- [x] CA-001: ANALISTA ve Mantenimiento y completa CRUD en todos sus modulos.
- [x] CA-002: ANALISTA edita geodatos y asigna agronomos en Parcelas.
- [x] CA-003: ADMIN y ANALISTA ven `/reportes`; AGRONOMO recibe acceso restringido.
- [x] CA-004: ANALISTA no ve ni abre Seguridad y no puede mutar otros modulos.
- [x] CA-005: ADMIN y AGRONOMO conservan sus permisos previos.

## Pruebas

- Unitarias de autorizacion web y metadatos de roles de controladores.
- Unitarias del servicio de parcelas para asignacion por ADMIN y ANALISTA.
- Pruebas focalizadas, lint, typecheck, build y validacion documental.

## Impacto documental

- [x] Actualizar la excepcion historica de la spec 022.
- [x] Actualizar la linea base de seguridad.
- [x] Actualizar los indices de specs.
- [x] Marcar esta spec como implementada al completar las validaciones.
