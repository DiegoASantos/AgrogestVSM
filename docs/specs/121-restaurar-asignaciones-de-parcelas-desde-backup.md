---
title: Restaurar asignaciones de parcelas desde un backup
status: approved
numero: 121
area: PostgreSQL, productores, parcelas, operaciones
created: 2026-10-21
approved_by: usuario en conversación, 2026-10-21
implemented_in: producción, 2026-10-21; reasignación transaccional de 36 parcelas
---

# Spec 121: Restaurar asignaciones de parcelas desde un backup

## Contexto

Se solicita devolver a un agrónomo los productores cuyas parcelas se movieron
temporalmente a otro agrónomo, preservando las asignaciones actuales del
primero. La asignación de productor es derivada: un agrónomo ve un productor si
tiene al menos una parcela activa asignada.

El respaldo semanal `agrogest_produccion_2026-09-28.dump` conserva 36 parcelas
activas y 36 productores distintos asignados al agrónomo de destino. Su SHA-256
es `176a08e94d517df15db4162989670a1aaa8a7e34bf20fc7fe943918dd5128d17`.
Los respaldos diarios del 1 al 21 de octubre muestran el traspaso posterior.
En el estado actual, las 36 parcelas originales siguen activas, sus productores
siguen activos y sin fusionar, y las 36 parcelas están asignadas al otro
agrónomo. Ninguno de esos productores tiene otra parcela activa. El agrónomo de
destino conserva además una asignación actual que no forma parte de este grupo.

## Alcance

### Incluido

- Crear y validar un backup completo previo de producción.
- Identificar por ID de parcela el conjunto activo asignado al agrónomo de
  destino en el respaldo del 28 de septiembre.
- Dentro de una transacción, reatribuir esas 36 parcelas activas al agrónomo de
  destino solo si siguen asignadas al agrónomo temporal y sus productores
  siguen activos y sin fusionar.
- Conservar todas las asignaciones actuales del agrónomo de destino y todos los
  demás datos de parcelas y productores.
- Verificar las 36 filas, los 36 productores visibles recuperados y el acceso
  actual conservado del agrónomo de destino.

### Excluido

- Restaurar un dump completo o sobrescribir tablas.
- Cambiar datos de productores, parcelas, visitas, roles o relaciones ajenas al
  conjunto identificado.
- Crear parcelas duplicadas, reactivar registros o modificar el esquema.
- Mantener el acceso de ambos agrónomos a las mismas parcelas: cada parcela
  admite un solo agrónomo asignado.

## Requisitos

- RF-001: El conjunto objetivo son exactamente las filas activas de `parcelas`
  asignadas al agrónomo de destino en el backup indicado y que en producción
  siguen activas bajo la asignación temporal. Deben corresponder a 36 parcelas
  y 36 productores distintos; si cambia el conjunto o el conteo, abortar.
- RF-002: Actualizar únicamente `parcelas.agronomo_usuario_id` en esas filas.
- RF-003: El agrónomo de destino debe conservar sus asignaciones actuales,
  incluida la existente fuera del conjunto histórico.
- RNF-001: La reparación debe ser transaccional, idempotente y verificable por
  IDs de parcela. No registrar nombres, documentos, contactos ni credenciales.

## Contratos afectados

No hay cambio de esquema ni contrato API. La visibilidad actual de productores
se deriva de las parcelas activas asignadas y se actualizará al consultar o
sincronizar los datos con la API.

## Seguridad y datos

El backup se usa como fuente histórica, no se restaura sobre producción. La
precondición comprueba que cada parcela permanece activa y bajo la asignación
temporal esperada; el cambio no altera productores ni permite asignación
múltiple. El backup previo debe validarse con `pg_restore --list` y conservarse
según el runbook.

## Migración y rollback

No requiere migración de esquema. Antes del cambio, crear un dump completo de
producción y comprobar que `pg_restore --list` lo reconoce. En una sola
transacción, verificar el conjunto esperado, actualizar las 36 filas y validar
los conteos antes de confirmar. Si cualquier precondición o verificación falla,
revertir la transacción. Si se necesita revertir tras confirmar, devolver solo
las filas del manifiesto a su asignación temporal, previa comprobación de que
no cambiaron desde la restauración; no restaurar la base completa.

## Criterios de aceptación

- [ ] CA-001: El backup de origen y el backup previo de producción pasan
  `pg_restore --list`.
- [ ] CA-002: La precondición encuentra exactamente las 36 parcelas activas y
  36 productores distintos del estado histórico; las 36 filas siguen elegibles
  en producción.
- [ ] CA-003: Tras la operación, las 36 parcelas están asignadas al agrónomo de
  destino y su asignación actual previa permanece intacta.
- [ ] CA-004: No cambian otros campos, parcelas ni productores; el agrónomo
  temporal conserva sus demás asignaciones.
- [ ] CA-005: La API y el panel muestran los productores recuperados para el
  agrónomo de destino; la sincronización mobile los refleja al reconectar.
- [ ] CA-006: El rollback acotado puede restituir solo el conjunto de 36 filas.

## Pruebas

- Comparar conjunto y conteos históricos contra producción en modo lectura.
- Ejecutar la actualización en una transacción con precondiciones y conteos
  esperados; validar el estado antes de `COMMIT`.
- Comprobar acceso autenticado de ambos agrónomos y actualizar el catálogo
  mobile mediante sincronización normal.

## Impacto documental

- [x] Dominio: se mantiene la asignación única de parcela y la visibilidad
  derivada del productor.
- [x] Runbook: usar backup previo y rollback acotado descritos en
  `database-backup-restore.md`.
- [ ] Arquitectura.
- [ ] ADR.
- [ ] Variables o despliegue.
