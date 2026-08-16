---
title: Visibilidad y reactivacion de productores y parcelas en mobile
status: implemented
numero: 041
area: api, database, mobile, sync, seguridad, productores, parcelas, visitas-campo
created: 2026-08-15
approved_by: usuario mediante instruccion "Implement the plan", 2026-08-15
implemented_in: working tree, 2026-08-15
---

# Spec 041: Visibilidad y reactivacion de productores y parcelas en mobile

## Contexto

La API ya limita a cada usuario `AGRONOMO` a los productores que tienen alguna
parcela asignada y a sus parcelas asignadas. Sin embargo, mobile filtra los
productores inactivos, mezcla parcelas activas e inactivas sin identificarlas y
puede conservar en SQLite datos descargados por otra sesion. Tampoco existe un
flujo mobile para reactivar una parcela antes de iniciar una visita.

El estado global del productor debe depender de sus parcelas: es activo si al
menos una parcela esta activa y es inactivo si no tiene parcelas activas. En la
app se muestran los productores y parcelas asignados al agronomo, activos
primero e inactivos despues. Un productor compartido conserva su estado global,
aunque la parcela asignada al agronomo actual este inactiva.

## Alcance

### Incluido

- Descargar para `AGRONOMO` productores y parcelas asignados, tanto activos
  como inactivos.
- Ordenar activos antes que inactivos e identificar el estado en los
  selectores mobile.
- Reactivar una parcela inactiva desde mobile, con confirmacion, incluso sin
  conexion mediante outbox.
- Derivar y mantener el estado global del productor desde sus parcelas.
- Validar en API que un agronomo solo modifique y visite parcelas asignadas.
- Aislar la visibilidad de los catalogos SQLite por sesion sin borrar historia
  ni operaciones pendientes.

### Excluido

- Exponer a un agronomo productores o parcelas asignados a otro agronomo.
- Vencimiento automatico de productores sin parcelas.
- Recuperar en otra instalacion un productor creado localmente que todavia no
  tiene parcela; se conserva el comportamiento actual del dispositivo.
- Cambiar el historial de visitas existente.

## Requisitos

- RF-001: `GET /productores` para `AGRONOMO` debe incluir productores activos e
  inactivos con al menos una parcela asignada al usuario.
- RF-002: `GET /parcelas` para `AGRONOMO` debe incluir sus parcelas activas e
  inactivas y excluir las ajenas.
- RF-003: ambos listados deben ordenar activos antes que inactivos sin romper
  paginacion ni busqueda.
- RF-004: un productor debe estar activo si y solo si existe al menos una
  parcela activa de ese productor.
- RF-005: crear, activar, desactivar o mover una parcela debe recalcular en la
  misma transaccion los productores afectados.
- RF-006: no se puede desactivar manualmente un productor con parcelas activas
  ni activarlo sin una parcela activa.
- RF-007: al seleccionar una parcela inactiva, mobile debe solicitar
  confirmacion; cancelar no la selecciona y aceptar la activa localmente.
- RF-008: la activacion offline debe encolar `parcelas:update` antes de la
  visita y conservar ambos registros hasta confirmacion de API.
- RF-009: la API debe rechazar una visita sobre una parcela inactiva, ajena o
  asignada a otro agronomo.
- RF-010: la cache mobile no debe mostrar catalogos de otra sesion y no debe
  borrar pendientes ni filas requeridas por visitas historicas.
- RNF-001: la migracion PostgreSQL debe ser idempotente y registrar rollback
  operativo para la correccion de datos.
- RNF-002: la migracion SQLite debe ser aditiva y compatible con outbox
  existente.

## Contratos afectados

- `PATCH /parcelas/:id` conserva el contrato y acepta `isActive`; para
  `AGRONOMO` exige que la parcela este asignada al usuario autenticado.
- `POST /visitas-campo` usa la identidad autenticada como autoridad para
  `AGRONOMO` y rechaza parcelas inactivas o ajenas.
- Las respuestas de productores y parcelas conservan `isActive`.
- `isActive` en altas o ediciones de productor deja de ser una decision
  independiente y la API rechaza estados incompatibles con las parcelas.
- SQLite agrega metadata local de propietario/visibilidad del catalogo; no se
  expone en contratos REST. Outbox y fallos durables tambien conservan el
  propietario de la sesion.
- PostgreSQL conserva `productores.creado_por_usuario_id` para autorizar la
  primera parcela de un productor creado por el agronomo sin permitir que use
  un `productorId` arbitrario.

## Seguridad y datos

- La API, no la UI, aplica el aislamiento horizontal por
  `parcelas.agronomo_usuario_id`.
- `ADMIN` conserva acceso administrativo completo.
- No se registran nombres, documentos, tokens ni coordenadas en logs nuevos.
- Las filas historicas quedan almacenadas pero no seleccionables por otra
  sesion.

## Migracion y rollback

### PostgreSQL

- Migracion 047: agregar la procedencia nullable del productor, recalcular
  `productores.activo` con `EXISTS` sobre parcelas activas y actualizar solo
  filas inconsistentes.
- Antes de produccion se requiere backup y consulta de conteos de estados.
- El rollback de codigo es compatible. Si se necesita restaurar estados
  manuales anteriores, usar el backup; no existe una inversa confiable para un
  estado empresarial derivado.

### SQLite

- Migracion compatible para metadata de propietario y visibilidad de
  productores, parcelas, outbox y fallos durables.
- Una version mobile anterior ignora las columnas nuevas.
- El rollback rutinario es una OTA correctiva; no se eliminan columnas ni
  pendientes.

## Criterios de aceptacion

- [x] CA-001: un agronomo ve solo sus productores y parcelas, activos e
  inactivos, con activos primero.
- [x] CA-002: otro agronomo no puede modificar ni visitar la parcela por ID.
- [x] CA-003: aceptar la confirmacion activa localmente la parcela y permite
  continuar; cancelar no la selecciona.
- [x] CA-004: offline, parcela se procesa antes que visita y un fallo de
  activacion mantiene la visita pendiente.
- [x] CA-005: activar la primera parcela activa al productor; desactivar la
  ultima lo inactiva; mover una parcela recalcula ambos productores.
- [x] CA-006: cambiar de usuario no expone catalogos de la sesion anterior.
- [x] CA-007: visitas e outbox existentes se conservan durante reconciliacion.

## Pruebas

- Unitarias de servicios API, repositorios SQLite y handlers de sync.
- Integracion de autorización horizontal y rechazo de visita inactiva.
- Cobertura de endpoints de productor por ID, movimiento de parcela a productor
  ajeno y reconciliacion de pendientes huerfanos por propietario autenticado.
- Migraciones PostgreSQL y SQLite desde una version anterior representativa.
- Flujo offline-online con activacion, reinicio, reintento y fallo permanente.
- Validacion manual del selector y confirmacion en mobile.

## Impacto documental

- [x] Arquitectura.
- [x] Dominio.
- [x] Runbook de rollback aplicable sin cambios estructurales.
- [ ] ADR: no requerido.
- [ ] Variables o despliegue: no se agregan variables.
