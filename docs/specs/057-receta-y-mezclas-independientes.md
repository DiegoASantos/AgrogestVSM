---
title: Receta y mezclas independientes con cierre recuperable
status: implemented
numero: "057"
area: mobile, recetas, mezclas, api, sqlite, postgresql, sync, ux
created: 2026-08-19
approved_by: usuario mediante instruccion "Implement the plan", 2026-08-19
implemented_in: apps/mobile/src/modules/visita-recetas; apps/mobile/src/shared/database; apps/mobile/src/shared/sync; apps/api/src/modules/visita-recetas; apps/api/src/database/migrations/053-receta-mezclas-productos-reutilizables.ts, 2026-08-19
---

# Spec 057: Receta y mezclas independientes con cierre recuperable

## Contexto

Receta concentra recomendaciones, preparacion de mezclas y cierre de visita en
un formulario extenso. Los tecnicos solicitan separar la preparacion en un
ultimo paso sencillo, reutilizar un mismo producto en varias mezclas, copiar
mezclas y recuperar el avance si abandonan la pantalla.

## Alcance

### Incluido

- Receta como paso 1 de 2 y Mezclas como paso 2 de 2.
- Productos y dosis base definidos en Receta; asignacion y dosis por uso en Mezclas.
- Productos fitosanitarios y fertilizantes, edaficos o foliares, reutilizables.
- Coadyuvantes y orden propios por mezcla, copia completa y editor de una mezcla.
- Borrador independiente y recuperable para Mezclas.
- Hora de fin obligatoria en mobile y en el comando backend de finalizacion,
  sin volver NOT NULL la columna de base.
- Contrato, persistencia y sync compatibles con clientes instalados.

### Excluido

- Cambios en formulas agronomicas, catalogos, roles o autenticacion.
- Hacer obligatorias recomendaciones de riego o labores.
- Eliminar inmediatamente columnas o contratos legacy.

## Requisitos

- RF-001: Receta conserva hallazgos, recomendaciones, productos, dosis base,
  riego y labores; Mezclas concentra cantidad, asignaciones, dosis particulares,
  volumen, plantas, coadyuvantes, orden y hora final.
- RF-002: Sin productos se permiten cero mezclas. Con productos se exigen entre
  una y veinte, todas no vacias y todos los productos asignados al menos una vez.
- RF-003: Un producto puede aparecer una vez en cada mezcla y usar una dosis
  diferente por mezcla.
- RF-004: La mezcla pide volumen cuando contiene aplicaciones fitosanitarias o
  foliares y plantas por uso edafico; las formulas actuales no cambian.
- RF-005: Con al menos dos mezclas puede copiarse desde cualquiera con datos. La
  copia reemplaza el destino tras confirmar e incluye toda su configuracion.
- RF-006: Solo una mezcla se edita a la vez y el resumen anuncia `Sin
configurar`, `En progreso` o `Lista` sin depender unicamente del color.
- RF-007: La hora final propone la hora actual o recupera la guardada; debe ser
  valida y no anterior a la hora inicial.
- RF-008: Receta y Mezclas conservan borradores hasta completar tanto el
  guardado local de la receta como el cierre de la visita. Salir, retroceder o
  enviar la app a segundo plano no pierde avances.
- RF-009: El detalle de una visita permite continuar Receta o Mezclas cuando
  exista el borrador correspondiente.
- RF-010: `PUT /visitas-campo/:visitaId/receta/finalizacion` exige
  `endVisitTime`, valida el agregado y actualiza receta y hora antes de confirmar
  la finalizacion.
- RNF-001: El agregado conserva orden padre-hijos, reintentos idempotentes y no
  confirma hijos antes de la respuesta valida de API.
- RNF-002: Controles tactiles de al menos 48 dp, etiquetas accesibles, contraste
  y soporte de texto ampliado.

## Contratos afectados

- Mobile agrega ruta `visitas-campo/[id]/mezclas`, borrador `mezclas`, tipos de
  asignacion y persistencia del agregado final.
- SQLite y PostgreSQL agregan `producto_ref` a los usos fitosanitarios y de
  fertilizacion, y `mezcla_id`/`mezcla_local_id` al uso fertilizante. Se
  reutiliza una referencia estable al duplicar el uso del mismo producto en
  varias mezclas, sin duplicar el producto editable de Receta.
- API agrega un DTO de finalizacion y mantiene `POST /receta` y la lectura
  legacy durante la ventana de compatibilidad.
- El outbox mantiene `visita_recetas` como padre; los items viajan anidados.

## Seguridad y datos

No cambian permisos ni datos personales. La API mantiene sus guards vigentes.
La hora de fin sigue nullable para visitas abiertas e historicas; solo el nuevo
comando de finalizacion la exige.

## Migracion y rollback

- PostgreSQL: migracion 053 agrega columnas, FK e indices y asigna referencias
  estables a filas existentes.
- SQLite: migracion 65 agrega las columnas e indices equivalentes y amplia el
  CHECK de borradores para `mezclas`, sin borrar recetas ni outbox.
- API compatible se despliega antes de la version mobile.
- El rollback de codigo conserva las tablas nuevas sin usarlas. SQLite usa
  correccion hacia adelante; no se recrean tablas con pendientes.

## Criterios de aceptacion

- [x] CA-001: Receta y Mezclas son pasos independientes y navegables.
- [x] CA-002: Un producto se reutiliza con dosis distintas entre mezclas.
- [x] CA-003: Fertilizantes edaficos y foliares pueden asignarse.
- [x] CA-004: La copia completa no comparte estado mutable con el origen.
- [x] CA-005: No se finaliza con productos sin asignar o mezclas vacias.
- [x] CA-006: Hora vacia, invalida o anterior es rechazada por mobile y API.
- [x] CA-007: El avance se recupera tras back, segundo plano y reinicio.
- [x] CA-008: Sync y reintentos conservan una sola operacion padre de receta.
- [x] CA-009: Recetas y clientes legacy permanecen legibles.

## Pruebas

- unitarias de cantidad, asignacion, repeticion, copia, formulas y hora;
- repositorio y migraciones SQLite/PostgreSQL;
- DTO, servicio transaccional y compatibilidad del endpoint anterior;
- borradores, navegacion, reinicio y reconciliacion tras editar Receta;
- offline-online, reintento, padre fallido y reconciliacion;
- validacion visual en telefono pequeno, landscape y texto ampliado.

## Impacto documental

- [x] Arquitectura offline.
- [x] Modelo de dominio.
- [x] Indices de specs y documentacion.
- [x] Riesgos y despliegue: no se detectaron brechas nuevas; se mantiene el
      despliegue API/migracion antes de mobile.
- [x] ADR: no aplica; extiende el agregado de receta existente.
