---
title: Idempotencia del registro de visitas técnicas en mobile
status: implemented
numero: "110"
area: mobile, visitas, SQLite, sincronización
created: 2026-10-17
approved_by: usuario mediante respuesta "Sí, apruebo la spec 110", 2026-10-17
implemented_in: apps/mobile/src/modules/visitas-campo/presentation/screens/new-visita-selector-screen.tsx; apps/mobile/src/modules/visitas-campo/presentation/screens/new-visita-campo-screen.tsx; apps/mobile/src/modules/visitas-campo/repositories/visitas-campo.repository.ts; apps/mobile/src/modules/visitas-campo/repositories/visitas-campo.repository.test.ts; apps/api/src/modules/visitas-campo/application/visitas-campo.service.test.ts
---

# Spec 110: Idempotencia del registro de visitas técnicas en mobile

## Contexto

Se observan dos visitas de una misma parcela y fecha tanto en mobile como en web:
una con receta y otra sin ella. Mobile guarda la visita al completar el primer
paso, mientras que la receta se guarda al finalizar el recorrido. Dos pulsaciones
rápidas, una navegación repetida o el reintento del mismo formulario pueden crear
dos filas locales con UUID públicos diferentes, que la API sincroniza como visitas
distintas. También se permite explícitamente crear otra visita real el mismo día
según la spec 100. La recuperación de sincronización de la spec 081 conserva la
identidad pública de cada fila, pero no puede deduplicar dos filas ya creadas con
UUID diferentes.

## Alcance

### Incluido

- Proteger el selector y el envío del primer paso contra acciones concurrentes.
- Dar a cada apertura explícita de «Crear nueva» un identificador de intento
  estable para esa pantalla, distinto del de otras visitas intencionales.
- Hacer idempotente la inserción local para un mismo identificador de intento,
  con verificación de usuario y parcela; reutilizar la visita existente sin
  encolar otro `create` ni modificar sus datos.
- Recuperar el ID local ya creado cuando el guardado termina pero falla la
  navegación o se pulsa de nuevo «Continuar».
- Mantener el aviso para continuar la visita abierta; la nueva visita sigue
  disponible por decisión explícita del usuario.

### Excluido

- Fusionar o borrar automáticamente visitas existentes, recetas o sus hijos.
- Convertir la fecha y parcela en clave única, pues puede haber visitas reales
  distintas el mismo día.
- Bloquear registros cuando no haya red o la consulta remota falle.
- Cambiar los endpoints o la estructura de PostgreSQL.

## Requisitos

- RF-001: Dos eventos de envío del mismo formulario producen exactamente una
  visita local y una operación `visitas_campo:create`.
- RF-002: El identificador público del intento se conserva al reintentar ese
  formulario y se envía en el `POST` habitual.
- RF-003: La inserción busca dentro de la transacción una visita activa o
  pendiente con ese UUID; si pertenece al mismo usuario y parcela devuelve su
  ID local. Si corresponde a otro usuario o parcela, falla sin reutilizar datos.
- RF-004: «Crear nueva» tras el aviso genera otro intento y permite una segunda
  visita legítima. «Continuar anterior» reutiliza el ID local previo.
- RF-005: Los registros existentes con UUID diferentes no se deduplican por
  semejanza, para no perder datos o recetas.
- RNF-001: El mismo agregado local conserva outbox, orden padre-hijos,
  idempotencia remota y comportamiento offline de las specs 081 y 100.
- RNF-002: Sin nuevas dependencias nativas ni necesidad de regenerar el APK.

## Contratos afectados

- API y PostgreSQL: sin cambios; el `POST /visitas-campo` mantiene `publicId`.
- SQLite: sin migración de esquema; la inserción en `visitas_campo` reutiliza un
  UUID de intento existente y no agrega otra fila de outbox para ese intento.
- Navegación mobile: el selector pasa un UUID de intento al formulario nuevo;
  editar una visita existente sigue usando `visitaId`.

## Seguridad y datos

El reuso local exige coincidencia de agrónomo y parcela. No se registran nombres,
documentos, ubicaciones ni payloads en logs nuevos. No se eliminan registros
previos ni se infiere que dos visitas parecidas sean la misma.

## Migración y rollback

El cambio se distribuye como actualización del código mobile compatible con la
SQLite actual y la API vigente. Los pendientes previos mantienen sus UUID y
sincronizan normalmente. El rollback revierte la lógica de creación mobile; no
requiere revertir datos ni outbox. Los duplicados históricos se revisan caso por
caso antes de cualquier corrección de datos.

## Criterios de aceptación

- [x] CA-001: Dos pulsaciones inmediatas en selector y formulario no crean dos
  visitas ni dos operaciones `create`.
- [x] CA-002: Repetir el mismo intento devuelve el mismo ID local después de
  un fallo de navegación o reentrada con el mismo identificador.
- [x] CA-003: Una nueva visita elegida explícitamente el mismo día crea un UUID
  y un ID local nuevos.
- [x] CA-004: Una receta queda vinculada a la visita original y llega después
  del padre durante la sincronización.
- [x] CA-005: Si una solicitud remota se reintenta, la API devuelve la visita
  del mismo `publicId` y no crea otra.
- [x] CA-006: Los duplicados históricos no se alteran automáticamente.

## Pruebas

- integración SQLite: inserción doble con mismo intento, outbox única,
  conflicto de usuario/parcela y visitas nuevas con UUID distinto;
- flujo mobile: doble envío, recuperación tras fallo de navegación y elección
  explícita de nueva visita;
- regresión offline-online: padre, hijos, receta y reintento de `POST`;
- lint, typecheck y suites afectadas de mobile/API.

## Impacto documental

- [x] Actualizar `docs/architecture/mobile-offline-sync.md` cuando se implemente.
- [x] Registrar el estado en `docs/operations/risk-register.md`.
- [x] Enlazar esta spec desde `docs/index.md` y `docs/specs/README.md`.
