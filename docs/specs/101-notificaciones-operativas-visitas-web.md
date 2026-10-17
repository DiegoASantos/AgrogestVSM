---
title: Notificaciones operativas de visitas en el panel web
status: implemented
numero: 101
area: api, admin-web, database, seguridad
created: 2026-10-13
approved_by: usuario mediante instruccion "Implement the plan", 2026-10-13
implemented_in: apps/api/src/modules/notificaciones y apps/admin-web/src/shared/components/notification-bell.tsx, 2026-10-13
---

# Spec 101: Notificaciones operativas de visitas en el panel web

## Contexto

Administradores y analistas necesitan conocer visitas repetidas y productores
persona sin seguimiento reciente desde la campana del panel. Las visitas mobile
solo son observables en web despues de sincronizarse.

## Alcance

### Incluido

- Aviso historico por productor, agronomo y fecha Peru con dos o mas visitas
  activas, incluso si se hicieron en distintas parcelas y sin filtrar tipo de
  entidad del productor.
- Aviso vigente de productores activos `persona` con al menos una parcela activa
  cuando han transcurrido 45 dias calendario desde la fecha mas reciente entre
  alta, ultima visita activa a cualquier parcela y ultima confirmacion `si`.
- Lectura independiente por usuario de avisos de visitas repetidas.
- Campana web conjunta con alertas climaticas, actualizacion cada cinco minutos
  y al abrirla, y paginacion de avisos operativos.

### Excluido

- Push, correo, cambios mobile, bloqueo de visitas y baja automatica.
- Marcar como leido el recordatorio de 45 dias: desaparece al resolverse.

## Requisitos

- RF-001: ADMIN y ANALISTA pueden consultar avisos operativos y conteo total.
- RF-002: Una visita repetida se agrupa por productor, agronomo y fecha; se
  muestra el total y desaparece si quedan menos de dos visitas activas.
- RF-003: Cada usuario puede marcar su propio aviso de repeticion como leido;
  la operacion es idempotente y se valida que el grupo exista.
- RF-004: El recordatorio de 45 dias usa el productor completo, todas sus
  parcelas y la misma base temporal que el seguimiento mobile.
- RNF-001: Endpoints protegidos por JWT y roles en API; los parametros se validan
  y las consultas usan parametros SQL.
- RNF-002: Falla de clima o de avisos operativos no impide mostrar los otros.
- RNF-003: Migracion aditiva compatible con API previa.

## Contratos afectados

- `GET /notificaciones/operativas?limit=50&cursor=0` devuelve `items`,
  `unreadCount` y `nextCursor` (desplazamiento opaco para el cliente).
- `POST /notificaciones/visitas-duplicadas/lectura` recibe `productorId`,
  `agronomoUsuarioId`, `fechaVisita` y registra al usuario autenticado.
- PostgreSQL agrega `notificaciones_visitas_leidas` e indice parcial de visitas.
  Sin cambio en SQLite, outbox o contratos mobile.

## Seguridad y datos

Los avisos contienen nombres y actividad agronomica. Solo ADMIN y ANALISTA
pueden leerlos. El ID de lector sale exclusivamente del JWT. El guard global de
mutaciones de ANALISTA se exceptua solo para su propia lectura. No se registran
datos personales en logs.

La columna `usuario_id` es una FK bigint; las consultas usan el claim `userId`
del JWT (ID interno), mientras `sub` conserva el UUID público. Los errores 5xx
solo registran clase, SQLSTATE y constraint validado, nunca SQL, parámetros ni
stack.

## Migracion y rollback

Aplicar la migracion 068 antes de la API y el panel nuevos. La API antigua
ignora la tabla adicional. Ante rollback del codigo, conservar la tabla y las
lecturas, pues eliminarlas perderia preferencias de usuarios. Recuperar hacia
adelante. La atribucion historica sigue la relacion actual parcela-productor:
no existe snapshot del productor al momento de la visita.

## Criterios de aceptacion

- [x] CA-001: Se muestra un aviso por grupo repetido con conteo correcto.
- [x] CA-002: La lectura de un usuario no oculta el aviso a otro.
- [x] CA-003: Los recordatorios se limitan a persona activa y se resuelven con
  visita, respuesta `si` o desactivacion.
- [x] CA-004: AGRONOMO no accede a los endpoints; el panel mantiene clima.
- [x] CA-005: La migracion, tipos, pruebas y build pertinentes pasan.

## Pruebas

- Unitarias de paginacion, lectura idempotente y permisos del guard.
- Smoke PostgreSQL aislado de agrupacion, vencimiento, lectura individual,
  migracion idempotente y resolucion del recordatorio.
- Typecheck, lint y builds API/web.

## Impacto documental

- [x] Dominio.
- [x] Seguridad.
- [x] Riesgos.
- [x] Indices de specs.
