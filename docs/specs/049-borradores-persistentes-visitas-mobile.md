---
title: Borradores persistentes en visitas mobile
status: implemented
numero: "049"
area: mobile, sqlite, offline, visitas, recetas
created: 2026-08-18
approved_by: usuario, 2026-08-18
implemented_in: apps/mobile/src/shared/database/visit-form-drafts.ts y apps/mobile/src/shared/hooks/use-visit-form-draft.ts, 2026-08-18
---

# Spec 049: Borradores persistentes en visitas mobile

## Contexto

Los formularios del flujo de visita conservan la informacion no guardada solo
en el estado React de cada pantalla. Al navegar hacia atras, la ruta se desmonta
y, al volver, el formulario se reconstruye exclusivamente desde las entidades
ya guardadas en SQLite. El tecnico pierde asi selecciones, observaciones y
recomendaciones que todavia no habia confirmado.

## Alcance

### Incluido

- datos generales de la visita y los pasos Plagas, Enfermedades, Nutricion,
  Riego y Labores culturales;
- Receta/Recomendacion, incluidas mezclas, productos, fertilizacion, riego y
  labores;
- persistencia durable por usuario en SQLite y restauracion silenciosa;
- limpieza al guardar correctamente el paso o eliminar la visita.

### Excluido

- formularios de productor, parcela y altas de catalogos de productos;
- sincronizacion, API, PostgreSQL y contratos compartidos;
- dialogos, avisos o controles para descartar manualmente el borrador.

## Requisitos

- RF-001: Cada formulario incluido debe restaurar automaticamente su ultimo
  borrador al volver a la pantalla o reiniciar la aplicacion.
- RF-002: La restauracion no debe mostrar dialogos, banners ni confirmaciones.
- RF-003: Los cambios se escribiran con debounce y se vaciaran al desmontar la
  pantalla o pasar la aplicacion a segundo plano.
- RF-004: Un borrador se eliminara solo despues de un guardado local exitoso;
  un error de validacion o persistencia debe conservarlo.
- RF-005: El borrador de Receta conservara los identificadores locales que
  relacionan recomendaciones, mezclas y productos.
- RF-006: La eliminacion completa de una visita retirara tambien sus borradores.
- RNF-001: Los borradores se aislaran por `publicId` del usuario autenticado.
- RNF-002: Los payloads no se registraran en logs y un JSON invalido no debe
  impedir abrir el formulario.
- RNF-003: Los borradores no son entidades sincronizables, no generan outbox y
  no modifican estados `pending`, `synced` o `error`.
- RNF-004: La escritura diferida no debe perder el ultimo cambio al navegar
  inmediatamente hacia atras.

## Contratos afectados

Solo SQLite mobile. Se agrega `visit_form_drafts`, identificada por usuario,
contexto y modulo, con payload JSON versionado y fecha de actualizacion. No se
modifican API, PostgreSQL, eventos, outbox ni tipos compartidos.

## Seguridad y datos

La clave de propietario se obtiene de la sesion local autenticada. Toda lectura,
escritura y eliminacion exige ese propietario. El cambio de cuenta no expone ni
elimina borradores ajenos. Los payloads contienen datos agronomicos ya tratados
por SQLite local y nunca se copian a logs o telemetria.

## Migracion y rollback

La migracion SQLite 63 es aditiva: crea tabla e indice sin modificar entidades
operativas ni colas de sincronizacion. Una version mobile anterior ignora la
tabla. El rollback operativo consiste en volver al JavaScript anterior y
conservar la tabla; cualquier correccion de datos sera hacia adelante, sin
eliminar borradores automaticamente.

## Criterios de aceptacion

- [x] CA-001: Volver a cualquiera de los siete formularios repone todos sus
  valores no guardados sin mostrar mensajes.
- [x] CA-002: El borrador sigue disponible tras cerrar y reiniciar la app.
- [x] CA-003: Guardar correctamente elimina solo el borrador de ese modulo.
- [x] CA-004: Un guardado fallido conserva el borrador.
- [x] CA-005: Otra cuenta del mismo dispositivo no puede recuperar el borrador.
- [x] CA-006: La persistencia no crea ni modifica entradas de outbox.
- [x] CA-007: Receta restaura productos, mezclas y sus relaciones locales.
- [x] CA-008: Una referencia de catalogo inexistente no bloquea la pantalla y
  el resto del borrador se conserva.

## Pruebas

- unitarias de repositorio, serializacion, aislamiento y limpieza;
- migracion desde version 62 y esquema vacio;
- ida y vuelta de los adaptadores de cada formulario;
- navegacion, segundo plano y reinicio de la aplicacion;
- regresion de outbox y guardado offline de la visita.

Validacion automatizada del 2026-08-18: 196 archivos de prueba y 1497 pruebas
correctas; lint, tipos, documentacion y build del monorepo correctos. La prueba
manual de cierre forzado por el sistema operativo queda como control previo al
release piloto.

## Impacto documental

- [x] Arquitectura mobile offline.
- [ ] Dominio.
- [ ] Runbook.
- [ ] ADR.
- [ ] Variables o despliegue.
