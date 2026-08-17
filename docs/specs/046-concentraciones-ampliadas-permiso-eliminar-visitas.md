---
title: Concentraciones ampliadas y permiso para eliminar visitas
status: implemented
numero: "046"
area: api, database, admin-web, mobile, sync, seguridad
created: 2026-08-17
approved_by: usuario, 2026-08-17
implemented_in: apps/api, apps/admin-web, apps/mobile y docs, 2026-08-17
---

# Spec 046: Concentraciones ampliadas y permiso para eliminar visitas

## Contexto

Las concentraciones textuales de `marcas_producto` y `fertilizantes` aceptan
solo 30 caracteres, lo que rechaza descripciones comerciales validas. Ademas,
la API permite la baja logica de visitas sin una autorizacion individual y
mobile no ofrece una accion controlada para retirar visitas de prueba.

## Alcance

### Incluido

- Ampliar ambas concentraciones a 300 caracteres en PostgreSQL y API.
- Agregar a cada usuario un permiso de eliminacion de visitas, desactivado por
  defecto y administrado exclusivamente por `ADMIN`.
- Permitir a un `AGRONOMO` autorizado eliminar solo sus propias visitas.
- Borrar fisicamente el agregado local SQLite y desactivar la visita remota.
- Exigir confirmacion remota antes de borrar una visita con `serverId`.

### Excluido

- Borrado fisico de visitas en PostgreSQL.
- Eliminacion por agronomos de visitas ajenas.
- Cambios al formato de concentracion o a los payloads historicos de recetas.
- Ejecucion de migraciones, deploy u OTA en produccion.

## Requisitos

- RF-001: Marcas y fertilizantes aceptan concentraciones de hasta 300
  caracteres y rechazan 301.
- RF-002: `usuarios.puede_eliminar_visitas` es booleano, no nulo y `false` por
  defecto para filas nuevas y existentes.
- RF-003: Solo `ADMIN` puede modificar el permiso desde el panel web.
- RF-004: `ADMIN` puede desactivar visitas; `AGRONOMO` requiere permiso y
  propiedad de la visita. Una visita ajena se oculta con 404 y un permiso
  ausente devuelve 403.
- RF-005: El perfil autenticado entrega `canDeleteVisits` a mobile.
- RF-006: Una visita sin `serverId` puede eliminarse offline junto con su
  agregado y metadatos de sync.
- RF-007: Una visita con `serverId` requiere conexion y baja remota exitosa
  antes de eliminar cualquier dato local.
- RF-008: La baja remota es idempotente y solo asigna `activo = false`.
- RNF-001: La migracion PostgreSQL y los contratos son compatibles con clientes
  anteriores.
- RNF-002: Ningun rechazo, timeout o error de red elimina una visita local
  sincronizada.
- RNF-003: No quedan operaciones outbox ni fallos durables huerfanos del
  agregado eliminado.

## Contratos afectados

- PostgreSQL: concentraciones `varchar(300)` y nuevo booleano en `usuarios`.
- API administrativa de usuarios: `canDeleteVisits?: boolean` en escritura y
  `canDeleteVisits: boolean` en respuestas.
- Auth `login`, `refresh` y `/auth/me`: agrega `canDeleteVisits` al usuario.
- `DELETE /visitas-campo/:id`: mantiene la respuesta existente y agrega
  autorizacion por rol, permiso y propiedad.
- Mobile: agrega `canDeleteVisits` al perfil de sesion; SQLite no cambia de
  version ni de esquema.

## Seguridad y datos

La API es la autoridad del permiso. La UI solo decide visibilidad. El servicio
consulta al usuario persistido al eliminar para que una revocacion no dependa
del token cacheado. Un agronomo no distingue si una visita ajena existe. El
borrado local exige propiedad y confirmacion explicita.

## Migracion y rollback

1. Crear y verificar backup antes de operar fuera de desarrollo.
2. Desplegar migracion PostgreSQL 050 y API compatible.
3. Desplegar admin web y luego la OTA mobile.

Rollback operativo: conservar las columnas ampliadas y el permiso aditivo;
codigo anterior ignora el booleano y sigue leyendo `varchar(300)`. No reducir a
30 sin inventariar y normalizar previamente los valores mas largos. Mobile se
revierte mediante OTA compatible, sin recrear SQLite.

## Criterios de aceptacion

- [x] CA-001: Ambos catalogos aceptan 300 caracteres y rechazan 301.
- [x] CA-002: Usuarios existentes quedan sin permiso y `ADMIN` puede cambiarlo.
- [x] CA-003: Auth expone el permiso en login, refresh y `/auth/me`.
- [x] CA-004: Un agronomo autorizado desactiva su visita y no puede afectar una
      visita ajena.
- [x] CA-005: Mobile oculta la accion sin permiso y confirma antes de eliminar.
- [x] CA-006: Un borrador se elimina offline sin residuos de sync.
- [x] CA-007: Una visita con `serverId` permanece intacta localmente ante fallo
      remoto y se elimina tras una respuesta exitosa.
- [x] CA-008: PostgreSQL conserva la visita con `activo = false`.

## Pruebas

- unitarias de migracion, DTO, mapeos de usuario y autorizacion API;
- integracion de baja logica y aislamiento horizontal;
- admin web para lectura y edicion del permiso;
- mobile para borrador offline, visita sincronizada, fallos remotos y limpieza
  del agregado;
- lint, typecheck, tests y builds proporcionales; `db:smoke` antes del release.

## Impacto documental

- [x] Arquitectura offline.
- [x] Modelo de dominio.
- [x] Linea base de seguridad.
- [x] ADR: no corresponde; reutiliza baja logica y autorizacion existentes.
- [x] Despliegue: API antes que admin web y mobile.
