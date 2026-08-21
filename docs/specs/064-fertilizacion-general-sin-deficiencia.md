---
title: Fertilización general sin deficiencia nutricional
status: implemented
numero: "064"
area: mobile, visitas, nutricion, recetas, sqlite, sync
created: 2026-08-21
approved_by: usuario, 2026-08-21
implemented_in: apps/mobile/src/modules/visita-recetas y apps/mobile/src/modules/visita-calificaciones, 2026-08-21
---

# Spec 064: Fertilización general sin deficiencia nutricional

## Contexto

La receta permite recomendaciones preventivas de fertilización, pero la
interfaz actual obliga a seleccionar un nutriente no evaluado. El técnico
también necesita recomendar productos de fertilización general sin registrar ni
inventar una deficiencia nutricional.

El contrato, SQLite y PostgreSQL ya admiten `nutrienteId` y
`nutrienteNombre` nulos. El cambio habilita ese caso en la captura y lo
distingue de los registros reactivos históricos cuyo nutriente no fue guardado.

## Alcance

### Incluido

- hacer opcional el selector de nutriente al agregar fertilización preventiva;
- agrupar en una tarjeta `Fertilización general` todos los productos preventivos
  sin nutriente;
- permitir agregar, editar y quitar varios productos dentro de la tarjeta;
- conservar la tarjeta al restaurar borradores y recetas guardadas;
- mostrar la misma denominación en el resumen de una receta anterior;
- agregar pruebas de creación, serialización, agrupación y compatibilidad.

### Excluido

- crear una evaluación, deficiencia o nutriente ficticio;
- cambios de esquema SQLite, migraciones PostgreSQL o nuevos tipos de outbox;
- cambios al contrato de API o a las reglas de recomendaciones por nutriente;
- cambios en fitosanidad, riego, labores, mezclas o cálculos de dosificación.

## Requisitos

- RF-001: El técnico puede agregar una fertilización dejando vacío el selector
  de nutriente.
- RF-002: Una fertilización sin nutriente se persiste con enfoque `preventivo`,
  `nutrienteId` y `nutrienteNombre` nulos y factor 1.
- RF-003: Todos los productos preventivos sin nutriente se proyectan en una
  sola tarjeta titulada `Fertilización general`.
- RF-004: La tarjeta general permite agregar otro producto, quitar productos
  individuales y eliminar la recomendación completa.
- RF-005: Las recomendaciones con nutriente conservan la agrupación y reglas
  existentes.
- RF-006: Un registro reactivo histórico sin nutriente mantiene la etiqueta
  `Deficiencia no registrada`.
- RNF-001: El guardado mantiene la receta como única operación padre de outbox,
  escritura local primero, idempotencia y recuperación tras reinicio.
- RNF-002: No se agregan tablas, columnas, endpoints ni campos de contrato.

## Contratos afectados

No cambian API, PostgreSQL, esquema SQLite ni tipos compartidos. Se reutiliza
`fertilizacion[].nutrienteId?: string | null`, el nombre nullable y el enfoque
preventivo existentes. La agrupación general es una proyección de UI; se sigue
guardando una fila por producto dentro del agregado de receta.

## Seguridad y datos

No cambian permisos ni se incorporan datos personales. El cambio evita crear
datos agronómicos ficticios y no agrega payloads a logs.

## Migración y rollback

No requiere migración. API, SQLite y outbox actuales ya aceptan los campos
nulos. El rollback consiste en revertir la captura y agrupación de mobile; las
filas preventivas sin nutriente ya guardadas siguen siendo legibles por
clientes anteriores.

## Criterios de aceptación

- [x] CA-001: Dejar el nutriente vacío y agregar crea una tarjeta
      `Fertilización general`.
- [x] CA-002: Varios productos generales aparecen dentro de una sola tarjeta.
- [x] CA-003: Agregar, editar y quitar productos generales no modifica las
      recomendaciones asociadas a nutrientes.
- [x] CA-004: La tarjeta general se conserva al salir, reabrir o trabajar sin
      conexión.
- [x] CA-005: El payload sincronizado conserva enfoque preventivo, nutriente y
      nombre nulos y factor 1, sin crear una evaluación nutricional.
- [x] CA-006: Elegir un nutriente conserva el comportamiento preventivo actual.
- [x] CA-007: Los registros reactivos históricos sin nutriente continúan como
      `Deficiencia no registrada`.

## Pruebas

- unitarias de creación, etiqueta, agrupación y serialización mobile;
- regresión de agrupación para filas reactivas históricas;
- validación del contrato API preventivo sin nutriente y con factor 1;
- prueba enfocada mobile, API, lint, typecheck y documentación;
- validación manual del flujo online y offline al preparar la entrega mobile.

## Impacto documental

- [x] Arquitectura: documentar la fertilización preventiva general dentro del
      agregado de receta.
- [x] Dominio: no cambia el modelo; habilita un caso ya admitido.
- [x] Runbook: no cambia.
- [x] ADR: no corresponde.
- [x] Variables o despliegue: no agrega variables ni exige despliegue de API.
