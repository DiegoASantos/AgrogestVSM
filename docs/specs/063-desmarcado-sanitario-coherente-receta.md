---
title: Desmarcado sanitario coherente con receta mobile
status: implemented
numero: "063"
area: mobile, visitas, sanidad, recetas, sqlite, sync
created: 2026-08-21
approved_by: usuario, 2026-08-21
implemented_in: apps/mobile/src/modules/observaciones-sanitarias y apps/mobile/src/modules/visita-recetas, 2026-08-21
---

# Spec 063: Desmarcado sanitario coherente con receta mobile

## Contexto

En los pasos Plagas y Enfermedades, una observacion sanitaria ya guardada puede
quedar visualmente desmarcada al limpiar sus valores. Al confirmar el paso, el
formulario crea o actualiza las selecciones activas, pero no elimina la
observacion que dejo de estar seleccionada. La receta consolida sus hallazgos
desde esas observaciones persistidas y vuelve a mostrar la plaga o enfermedad.

Ademas, una observacion eliminada localmente puede continuar temporalmente en
el servidor hasta procesar la operacion de borrado. La recarga remota de la
receta no debe reintroducir ese hallazgo mientras exista un borrado local
pendiente.

## Alcance

### Incluido

- eliminar al guardar las observaciones existentes del modulo actual cuyos
  valores fueron desmarcados por completo;
- conservar sin cambios las observaciones que siguen seleccionadas y las del
  otro modulo sanitario;
- reutilizar el borrado local y la operacion `delete` ya existentes para
  observaciones pendientes o sincronizadas;
- dar precedencia al desmarcado local frente a una consolidacion remota
  atrasada mientras el borrado permanezca pendiente;
- agregar pruebas de regresion para Plagas y Enfermedades, tanto offline como
  con una observacion previamente sincronizada.

### Excluido

- cambios de esquema SQLite, migraciones, contratos API o PostgreSQL;
- eliminar productos de una receta que el tecnico haya agregado manualmente;
- modificar calificaciones, notas del paso o reglas de incidencia y severidad;
- cambiar el comportamiento de Nutricion, Riego o Labores culturales.

## Requisitos

- RF-001: Al confirmar Plagas o Enfermedades, toda observacion existente del
  modulo actual que ya no tenga incidencia, porcentaje, severidad ni organos
  seleccionados debe eliminarse de SQLite.
- RF-002: Una observacion desmarcada no debe aparecer en la consolidacion local
  ni volver a quedar marcada al reabrir el paso.
- RF-003: Una observacion desmarcada no debe aparecer como hallazgo en Receta,
  incluso si el dispositivo esta offline o el servidor aun conserva la version
  anterior.
- RF-004: Si la observacion nunca se sincronizo, el borrado debe cancelar su
  operacion pendiente sin generar una llamada remota innecesaria.
- RF-005: Si la observacion tiene identidad remota, el borrado debe conservar
  el payload necesario y sincronizarse mediante la operacion `delete` existente.
- RF-006: El guardado solo debe eliminar observaciones pertenecientes a los
  elementos activos del paso actual; Plagas no elimina Enfermedades y viceversa.
- RNF-001: El cambio debe mantener escritura local primero, idempotencia,
  aislamiento por usuario y recuperacion tras reinicio o desconexion.
- RNF-002: No se agregan tablas, columnas, endpoints ni campos de contrato.

## Contratos afectados

No cambian API, PostgreSQL, esquema SQLite ni tipos compartidos. Se reutilizan
la entidad `visita_observaciones_sanitarias`, la outbox y el endpoint de borrado
existentes. Cambia la reconciliacion local de la pantalla sanitaria y la
prioridad entre un borrado local pendiente y la consolidacion remota de receta.

## Seguridad y datos

No cambian permisos ni se incorporan datos personales. La consulta de borrados
pendientes debe respetar el propietario de la sesion de la outbox. No se
registraran payloads agronomicos en logs.

## Migracion y rollback

No requiere migracion. La version nueva es compatible con bases locales y API
existentes. El rollback consiste en revertir el codigo mobile; las operaciones
de borrado ya encoladas siguen siendo validas para versiones anteriores.

## Criterios de aceptacion

- [x] CA-001: Marcar una plaga, guardar, volver, desmarcarla y confirmar hace
      que permanezca desmarcada al reabrir el paso.
- [x] CA-002: El mismo flujo funciona para una enfermedad.
- [x] CA-003: La plaga o enfermedad desmarcada desaparece de la consolidacion y
      no se ofrece nuevamente como hallazgo reactivo en Receta.
- [x] CA-004: CA-001 a CA-003 se cumplen sin conexion y tras reiniciar la app.
- [x] CA-005: Una observacion nunca sincronizada cancela su alta pendiente y no
      deja una operacion remota de borrado.
- [x] CA-006: Una observacion sincronizada crea un unico borrado durable con su
      identidad remota y desaparece localmente de inmediato.
- [x] CA-007: Desmarcar una plaga no modifica enfermedades ni otros modulos, y
      desmarcar una enfermedad no modifica plagas.
- [x] CA-008: Una respuesta remota anterior al borrado no reintroduce el
      hallazgo mientras la operacion local siga pendiente.

## Pruebas

- unitaria del calculo entre observaciones existentes y selecciones activas;
- unitaria del repositorio para cancelar un alta local y encolar un borrado
  sincronizado;
- unitaria de consolidacion/receta con borrado sanitario pendiente;
- regresion del handler de borrado sin `serverId` y con `serverId`;
- prueba enfocada mobile, lint y typecheck del paquete afectado;
- validacion manual del recorrido Plagas/Enfermedades -> Receta -> regreso al
  paso, online y offline.

## Impacto documental

- [x] Arquitectura: actualizar la precedencia de borrados locales en la
      consolidacion de receta al implementar.
- [x] Dominio: no cambia.
- [x] Runbook: no cambia.
- [x] ADR: no corresponde.
- [x] Variables o despliegue: no agrega variables; compatible con OTA.

## Correccion posterior a la implementacion

La reconciliacion de Receta tambien elimina tarjetas reactivas vacias que ya no
corresponden a un hallazgo sanitario activo despues de que el `delete` termino
de sincronizarse y su tombstone salio de la cola. Se mantienen los productos ya
digitados y las recomendaciones preventivas, conforme al alcance original.
