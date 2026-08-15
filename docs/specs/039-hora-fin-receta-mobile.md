---
title: Hora de fin al finalizar receta mobile
status: implemented
numero: 039
area: mobile, visitas, recetas, sqlite, sync
created: 2026-08-15
approved_by: usuario mediante instruccion "Implement the plan", 2026-08-15
implemented_in: working tree, 2026-08-15
---

# Spec 039: Hora de fin al finalizar receta mobile

## Contexto

La visita ya conserva `endVisitTime` en SQLite, API, detalle y PDF, pero el
campo se captura opcionalmente al inicio. El tecnico necesita confirmar la hora
real de termino al final del flujo de receta.

## Alcance

### Incluido

- Hora de fin visible al pie de Receta, precargada con el valor existente o la
  hora actual y editable en formato de 12 horas.
- Validacion contra la hora de inicio.
- Persistencia solo al confirmar `Enviar`, usando el update y outbox existentes
  de `visitas_campo`.
- Pruebas de edicion, cancelacion, confirmacion y trabajo offline.

### Excluido

- Cambios de PostgreSQL, SQLite o contrato API.
- Visitas que crucen medianoche.
- Cierre automatico sin confirmacion del usuario.

## Requisitos

- RF-001: Receta debe mostrar una hora final editable y precargada.
- RF-002: La hora final debe ser valida y mayor o igual a la hora inicial.
- RF-003: `Seguir editando` no debe actualizar la visita.
- RF-004: `Enviar` debe actualizar visita y outbox antes de programar sync.
- RNF-001: La operacion debe sobrevivir desconexion, reintento y reinicio.

## Contratos afectados

- Se reutiliza `UpdateVisitaCampoDraft.endVisitTime` y el entity type
  `visitas_campo`.
- No cambia API, SQLite ni PostgreSQL.

## Seguridad y datos

- No se agregan permisos, secretos ni datos personales.
- La hora procede del dispositivo y puede ser corregida por el tecnico.

## Migracion y rollback

- Despliegue OTA compatible con bases instaladas.
- Rollback por version JavaScript anterior; sin rollback SQL.

## Criterios de aceptacion

- [x] CA-001: Usa hora existente o, si falta, la hora actual.
- [x] CA-002: La hora es editable y valida respecto de la hora inicial.
- [x] CA-003: Cancelar la confirmacion no actualiza `endVisitTime`.
- [x] CA-004: Enviar actualiza SQLite y conserva una operacion de visita.
- [x] CA-005: Offline conserva visita y receta pendientes hasta sincronizar.

## Pruebas

- Unitarias de formato, valor inicial y validacion temporal.
- Integracion de finalizacion de receta y update de visita.
- Regresion de outbox create/update y sync offline-online.
- Lint, typecheck y pruebas mobile.

Evidencia ejecutada el 2026-08-15: lint y build mobile, suite completa de 1374
pruebas, pruebas unitarias de hora y repositorio/outbox, `docs:check` y
`git diff --check`.

## Impacto documental

- [x] Arquitectura offline.
- [x] Dominio: no cambia.
- [x] Runbook: no cambia.
- [x] ADR: no aplica.
- [x] Variables o despliegue: no cambia.
