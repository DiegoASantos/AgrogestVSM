---
title: Tutorial visual guiado para el paso 1 de visitas
status: implemented
numero: "051"
area: mobile, ux, accesibilidad, visitas
created: 2026-08-18
approved_by: usuario, 2026-08-18
implemented_in: apps/mobile/src/modules/visitas-campo/domain/step-one-tutorial.ts; apps/mobile/src/modules/visitas-campo/presentation/components/guided-form-tutorial.tsx; apps/mobile/src/modules/visitas-campo/presentation/screens/new-visita-campo-screen.tsx, 2026-08-18
---

# Spec 051: Tutorial visual guiado para el paso 1 de visitas

## Contexto

La asistencia por voz de la spec 048 fue retirada porque el ruido del campo
reduce la precision del reconocimiento. Los usuarios necesitan una ayuda local
que indique visualmente donde completar cada dato sin reemplazar el formulario
ni depender de conectividad.

## Alcance

### Incluido

- Boton manual `Tutorial` en el paso 1 de la visita.
- Fondo atenuado, campo interactivo resaltado, flecha e instruccion breve.
- Recorrido por campos visibles, habilitados y pendientes, con avance manual.
- Desplazamiento automatico y posicion adaptable al teclado y la pantalla.
- Numero de plantas, area y fecha de siembra obligatorios en mobile.
- Retiro de Hora de fin del paso 1; Receta conserva su captura al cierre.

### Excluido

- Tutoriales en los pasos 2 a 6 o en otras pantallas mobile.
- Apertura automatica, voz, red, telemetria o persistencia del progreso del tutorial.
- Cambios de API, PostgreSQL, SQLite, outbox o contratos remotos.
- Guardado o navegacion automatica al completar el recorrido.

## Requisitos

- RF-001: El tutorial inicia solo al pulsar el boton visible en el encabezado.
- RF-002: Solo recorre campos vacios, visibles y habilitados, respetando el
  orden del formulario y las dependencias entre catalogos.
- RF-003: El usuario interactua con el campo resaltado mientras el resto de la
  pantalla queda bloqueado por una capa atenuada.
- RF-004: Los selectores indican primero que deben abrirse y despues que debe
  elegirse una opcion.
- RF-005: `Siguiente` se habilita cuando el valor actual es valido;
  Observacion general permite `Omitir`.
- RF-006: `Anterior` regresa por el historial visitado y `Salir` conserva todos
  los valores ingresados.
- RF-007: Al terminar se informa que los pendientes fueron completados, se
  cierra el tutorial y el formulario queda disponible para revision.
- RF-008: Numero de plantas, area y fecha de siembra son obligatorios para
  guardar el paso 1, con las validaciones existentes de formato y rango.
- RF-009: Hora de fin no se muestra ni se envia desde el paso 1; el valor que
  Receta haya guardado no se modifica al editar los datos basicos.
- RNF-001: El tutorial funciona completamente offline y no agrega dependencias.
- RNF-002: El resaltado y la tarjeta permanecen utilizables con teclado,
  selectores, calendario, pantallas pequenas y disposicion de dos columnas.
- RNF-003: Borradores anteriores pueden contener propiedades retiradas; mobile
  las ignora sin descartar los demas valores.

## Contratos afectados

Solo tipos internos del formulario mobile y la referencia aditiva de
`FormScrollView`. API, entidades persistidas, SQLite y outbox no cambian.

## Seguridad y datos

La guia no solicita permisos, no registra interacciones y no transmite datos.
Los valores siguen el guardado offline-first y el aislamiento por usuario ya
vigentes para borradores.

## Migracion y rollback

No hay migracion de datos. Los borradores JSON antiguos se leen seleccionando
solo las propiedades vigentes. Rollback por revert del codigo y documentacion;
los datos de visita y la Hora de fin permanecen compatibles.

## Criterios de aceptacion

- [x] CA-001: Un formulario vacio recorre todos los pendientes en orden.
- [x] CA-002: Un formulario parcial omite valores completos y retoma el primer pendiente.
- [x] CA-003: Los campos dependientes esperan sus catalogos y no se saltan.
- [x] CA-004: Numero de plantas, area y fecha de siembra vacios impiden guardar.
- [x] CA-005: Observacion puede omitirse y completar el recorrido no guarda la visita.
- [x] CA-006: Hora de fin solo se edita en Receta y sobrevive a una edicion del paso 1.
- [x] CA-007: La guia funciona en modo avion y no incorpora permisos ni dependencias.

## Pruebas

- unitarias del orden, pendientes, validez, dependencias e historial;
- unitarias de los tres campos obligatorios;
- regresion de Hora de fin al editar datos basicos;
- smoke Android con scroll, teclado, selector, calendario y dos anchos de pantalla;
- lint, typecheck, tests focalizados, docs y diff check.

## Impacto documental

- [x] Arquitectura: sin cambio estructural; componente acotado al modulo mobile.
- [x] Dominio: obligatoriedad mobile documentada en esta spec.
- [x] Runbook: sin cambios de despliegue ni dependencias nativas.
- [x] ADR: no corresponde.
- [x] Variables o despliegue: sin cambios.
