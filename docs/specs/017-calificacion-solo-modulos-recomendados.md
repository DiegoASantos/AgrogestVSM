---
title: Calificacion de cumplimiento solo para modulos recomendados
status: implemented
numero: 017
area: visitas, calificaciones, scoring, api, mobile, sync
created: 2026-07-16
approved_by: usuario, 2026-07-16
implemented_in: apps/api/src/modules/visita-calificaciones/application/visita-calificaciones.service.ts; apps/mobile/src/modules/visita-calificaciones/; apps/mobile/src/shared/database/migrations.ts
---

# Spec 017: Calificacion de cumplimiento solo para modulos recomendados

## Contexto

La spec 008 exige calificar los cinco modulos de cumplimiento (`plagas`, `enfermedades`, `nutricion`, `riego` y `labores`) cuando existe cualquier receta anterior. Mobile usa `recetaAnterior.existe` a nivel de visita y crea puntajes automaticos de 3 mediante `autoScoreIfEmpty` si faltan datos actuales.

El cumplimiento solo puede medirse cuando la receta de la visita anterior a la misma parcela contiene al menos una recomendacion para el modulo. Si no existe esa recomendacion, el productor no tiene nada que cumplir: no se debe mostrar la seccion de cumplimiento ni persistir una calificacion. La API tambien exige hoy los cinco modulos y usa pesos que suman 100; por ello debe renormalizar los pesos de los modulos que si se evaluan.

## Alcance

### Incluido

- Determinar en API los modulos evaluables desde la receta inmediatamente anterior de la parcela.
- Exponer esa determinacion para mobile y usarla para ocultar y no exigir los modulos sin recomendacion.
- Eliminar el auto-3 del flujo de cumplimiento.
- Rechazar en API calificaciones de modulos no evaluables para visitas nuevas.
- Renormalizar el score de visita entre los modulos evaluables y mantener los agregados de productor y campania.
- Pruebas API, mobile y sync offline-first.

### Excluido

- Cambiar la matriz de pesos por etapa, la captura de recetas o sus datos.
- Migraciones PostgreSQL/SQLite, recalificacion o eliminacion de datos
  historicos.
- Cambios de roles, permisos, panel admin o estructura publica de scores.

## Requisitos

### Funcionales

- RF-001: La respuesta de receta anterior debe incluir un mapa completo
  `modulosEvaluables` con los cinco modulos y valores booleanos.
- RF-002: Un modulo es evaluable solo si la receta anterior contiene una recomendacion sustantiva: `fitosanidad.objetivo = plaga` para plagas; `fitosanidad.objetivo = enfermedad` para enfermedades; al menos un item de fertilizacion para nutricion; riego con `tipoRecomendacion` no vacio; y al menos una labor no vacia para labores.
- RF-003: Sin receta anterior calificable, todos los modulos son no
  evaluables.
- RF-004: Mobile debe usar exclusivamente `modulosEvaluables[modulo]`, no `recetaAnterior.existe`, para mostrar el resumen de receta, leyenda, selector 0-3 y justificacion de cada modulo.
- RF-005: Si un modulo no es evaluable, mobile no debe mostrar ni solicitar su cumplimiento, ni crear fila SQLite ni item de outbox para el.
- RF-006: Cada modulo evaluable requiere una calificacion explicita de 0 a 3 antes de finalizar la visita. Ya no se asigna 3 automaticamente segun datos de la visita actual, incluido riego.
- RF-007: El UPSERT de API debe rechazar con `400 Bad Request` una
  calificacion para un modulo no evaluable en una visita nueva, protegiendo el score frente a clientes desactualizados o alterados.
- RF-008: Sea `E` el conjunto no vacio de modulos evaluables, `p_m` el puntaje y `w_m` el peso de su etapa. El score se calcula asi:
`Score = (sumatoria((p_m / 3) x w_m) / sumatoria(w_m)) x 100, para m en E`. Conserva la importancia relativa de los pesos, se redondea con la precision vigente y queda entre 0 y 100.
- RF-009: Si falta una calificacion en `E`, no hay etapa mapeada o `E` es vacio, el score general es `null`. `scorePorModulo` solo tiene valor donde existe calificacion; los modulos no evaluables son `null`.
- RF-010: Los agregados de productor y campania conservan el contrato actual y consumen el score de visita renormalizado.
- RF-011: Una visita historica con las cinco calificaciones ya persistidas conserva su calculo actual, pues sus pesos suman 100. No se migran ni recalifican datos. Para visitas nuevas, RF-007 impide crear registros no evaluables.

### No funcionales

- RNF-001: La elegibilidad se calcula en API y se cachea con la receta; mobile no debe inferirla de campos opcionales.
- RNF-002: El calculo agregado no debe introducir una consulta de receta por cada visita; debe cargar o agrupar la informacion de manera acotada.
- RNF-003: Se mantiene idempotencia del UPSERT y el orden padre-hijo del outbox. No se agregan secretos, datos personales ni logs de observaciones.
