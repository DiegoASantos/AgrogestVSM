---
title: Cierre de visitas mobile sin recomendaciones
status: implemented
numero: "096"
area: mobile, visitas, recetas, sqlite, sync
created: 2026-10-12
approved_by: usuario (instruccion "la apruebo asi", 2026-10-12)
implemented_in: apps/mobile/src/modules/visita-recetas, apps/mobile/src/modules/visitas-campo
---

# Spec 096: Cierre de visitas mobile sin recomendaciones

## Contexto

El flujo mobile permite que una visita termine sin receta ni recomendacion,
pero la validacion de Receta actualmente lo bloquea como si fuera un error.
Ademas, las visitas sin recomendaciones deben registrar una hora de fin
determinista: diez minutos despues de la hora de inicio.

## Alcance

### Incluido

- Permitir continuar y finalizar el flujo con receta vacia.
- No crear un agregado de receta vacio al cerrar una visita nueva sin
  recomendaciones.
- Mantener las validaciones de dosis y unidades cuando existan productos.
- Para visitas sin productos fitosanitarios o fertilizantes, riego ni labores,
  guardar automaticamente la hora de inicio mas diez minutos como hora de fin.
- Persistir la hora con la actualizacion y outbox existentes de `visitas_campo`.

### Excluido

- Cambios de esquema SQLite, API o PostgreSQL.
- Cambios al cierre de visitas que sí contienen recomendaciones.
- Cambios a reglas de calificacion, evaluaciones o sincronizacion de entidades
  hijas.

## Requisitos

- RF-001: La ausencia total de recomendaciones no debe producir error ni
  bloquear el avance desde Receta.
- RF-002: Productos incompletos deben seguir sujetos a las validaciones
  actuales.
- RF-003: Al finalizar sin recomendaciones, `endVisitTime` debe ser la hora
  de inicio mas diez minutos, incluso si habia una hora final previa.
- RF-004: El cierre debe actualizar SQLite y conservar una operacion existente
  de visita en outbox antes de programar sincronizacion.
- RNF-001: El cierre debe sobrevivir desconexion, reintento y reinicio.

## Contratos afectados

No cambia el contrato API, el esquema SQLite ni el tipo de operacion de outbox.
Se reutiliza `UpdateVisitaCampoDraft.endVisitTime`.

## Seguridad y datos

No se agregan permisos ni datos nuevos. La hora usa el valor local de inicio
almacenado en la visita.

## Migracion y rollback

No requiere migracion. El rollback es volver al bundle mobile anterior; las
horas guardadas siguen siendo compatibles con las versiones previas.

## Criterios de aceptacion

- [x] CA-001: Se puede finalizar una visita sin recomendaciones sin mostrar el
  error "La receta es obligatoria".
- [x] CA-002: Se mantienen validaciones de dosis y unidades para productos
  agregados.
- [x] CA-003: Visita iniciada a las 10:30 y sin recomendaciones finaliza con
  `endVisitTime` 10:40, aunque tuviera otro valor previamente.
- [x] CA-004: El valor y la operacion de visita permanecen pendientes para sync
  cuando no hay conexion.

## Pruebas

- Unitarias para sumar diez minutos, incluyendo cambio de hora y medianoche.
- Unitarias para identificar visitas sin recomendaciones y tutorial de cierre.
- Validacion de dosis y unidades para recetas con productos.
- La actualizacion y outbox existentes permanecen sin cambios de handler/payload.

Evidencia ejecutada el 2026-10-12: 22 pruebas mobile dirigidas, 18 pruebas del
repositorio de visitas, typecheck mobile, lint de los archivos modificados,
`docs:check` y `git diff --check`.

## Impacto documental

- [x] Arquitectura: documentado el cierre automatico y su persistencia local.
- [x] Dominio: no cambia.
- [ ] Runbook: no cambia.
- [ ] ADR: no aplica.
- [ ] Variables o despliegue: no cambia.
