---
title: Estimaciones semanales de visitas por agrónomo
status: implemented
numero: "078"
area: estimaciones, api, admin-web, database, seguridad
created: 2026-09-07
approved_by: Usuario mediante instrucción "Implement the plan", 2026-09-07
implemented_in: apps/api/src/modules/estimaciones; apps/api/src/database/migrations/060-estimaciones-visitas-semanales.ts; apps/admin-web/src/modules/estimaciones; docs/architecture/overview.md; docs/domain/data-model.md
---

# Spec 078: Estimaciones semanales de visitas por agrónomo

## Contexto

La planificación operativa necesita registrar cuántas visitas se esperan de
cada agrónomo activo durante una semana y contrastar esa meta con las visitas
reales registradas. Actualmente el sistema ofrece reportes de visitas por rango,
pero no conserva metas semanales.

## Alcance

### Incluido

- Módulo principal `Estimaciones` en el panel administrativo.
- Captura tabular de visitas estimadas para todos los agrónomos activos.
- Semanas calendario de lunes a domingo y navegación histórica.
- Comparación con visitas reales activas atribuidas al agrónomo de la visita.
- Auditoría de creación y última modificación.
- Acceso de lectura y escritura para `ADMIN` y `ANALISTA`.

### Excluido

- Mobile, SQLite, outbox y sincronización offline.
- Metas diarias, mensuales o por productor, parcela o cultivo.
- Historial de cada versión anterior de una estimación.
- Exportaciones, notificaciones, aprobaciones y bloqueo de semanas cerradas.

## Requisitos

- RF-001: cualquier fecha seleccionada se normaliza a la semana calendario de
  lunes a domingo que la contiene.
- RF-002: existe como máximo una estimación lógica por agrónomo y semana.
- RF-003: la cantidad es un entero mayor o igual a cero; una celda vacía
  representa ausencia de estimación y cero representa una meta explícita.
- RF-004: guardar una cantidad crea, actualiza o reactiva la estimación; guardar
  `null` desactiva una estimación existente sin eliminar su auditoría.
- RF-005: solo usuarios actualmente activos con rol `AGRONOMO` aceptan nuevas
  metas; un agrónomo desactivado permanece visible y no editable en las semanas
  donde conserva una estimación activa.
- RF-006: las visitas reales cuentan registros activos de `visitas_campo` cuya
  `fecha_visita` pertenece a la semana y cuyo `agronomo_usuario_id` coincide.
- RF-007: la diferencia es `reales - estimadas` y el cumplimiento es
  `reales / estimadas * 100`, redondeado a dos decimales; cuando la estimación
  falta o es cero, el porcentaje no aplica.
- RF-008: se permite consultar y modificar semanas pasadas, actuales y futuras.
- RNF-001: el guard de la API exige `ADMIN` o `ANALISTA` tanto para lectura como
  para escritura.
- RNF-002: el guardado por lote es transaccional e idempotente por agrónomo y
  semana; IDs repetidos invalidan el lote completo.
- RNF-003: la respuesta y los logs no exponen correo, teléfono ni otros datos
  personales innecesarios.

## Contratos afectados

- `GET /estimaciones/semanas/:fecha` devuelve el rango normalizado, totales y
  filas con agrónomo, estado, estimación, visitas reales, diferencia,
  cumplimiento y auditoría visible.
- `PUT /estimaciones/semanas/:fecha` recibe:

```json
{
  "estimaciones": [
    { "agronomoUsuarioId": "7", "visitasEstimadas": 12 },
    { "agronomoUsuarioId": "8", "visitasEstimadas": null }
  ]
}
```

- La tabla PostgreSQL `estimaciones_visitas` conserva la meta semanal, baja
  lógica y usuarios de auditoría.
- El panel agrega la ruta protegida `/estimaciones` y una entrada principal de
  navegación.

## Seguridad y datos

- `ADMIN` y `ANALISTA` pueden consultar y modificar; `AGRONOMO` no accede.
- Los autores se toman del JWT validado, nunca del cuerpo del cliente.
- La API valida rol y estado del agrónomo dentro de la transacción.
- Las consultas usan parámetros y no registran nombres, IDs de usuarios ni
  cantidades en logs.

## Migración y rollback

- La migración 060 crea la tabla, constraints, FKs e índices sin transformar
  visitas ni datos existentes.
- Despliegue: migración, API compatible y finalmente panel web.
- Rollback operativo preferido: retirar web y API conservando la tabla.
- La eliminación física de tabla e índice requiere autorización explícita y
  respaldo previo de las estimaciones.

## Criterios de aceptación

- [x] CA-001: ADMIN y ANALISTA pueden abrir el módulo; AGRONOMO no accede.
- [x] CA-002: la semana actual aparece por defecto y cualquier fecha se
      normaliza correctamente a lunes-domingo.
- [x] CA-003: el lote crea, actualiza, reactiva o desactiva metas sin duplicar
      agrónomo y semana.
- [x] CA-004: la comparación cuenta solo visitas reales activas del autor y del
      rango inclusivo.
- [x] CA-005: diferencia y cumplimiento siguen las reglas definidas, incluido
      el caso de meta cero.
- [x] CA-006: agrónomos inactivos con historia siguen visibles y bloqueados.
- [x] CA-007: errores de validación o persistencia no guardan parcialmente el
      lote y la interfaz permite reintentar.

## Pruebas

- Unitarias de DTO, servicio, normalización semanal, métricas y autorización.
- Migración sobre esquema vacío y esquema anterior representativo.
- Cliente web, utilidades de fecha, navegación y estados de edición.
- `pnpm db:smoke`, `pnpm check` y `pnpm build`.

Resultado de cierre: pruebas focalizadas 70/70, `pnpm check` con 1829/1829
pruebas y documentación válida, y build completo aprobado. `pnpm db:smoke`
continúa bloqueado por R-001 en la migración histórica 001, antes de alcanzar la
migración 060.

## Impacto documental

- [x] Arquitectura.
- [x] Dominio.
- [ ] Runbook: evaluado, sin nuevo procedimiento.
- [ ] ADR: no introduce una decisión arquitectónica nueva.
- [ ] Variables o despliegue: no agrega variables; exige orden aditivo.
