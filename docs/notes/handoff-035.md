# Handoff: Spec 035 brechas de transmision WeatherLink

## Identificacion

- fecha: 2026-08-11
- responsable: Codex
- spec: `docs/specs/035-brechas-transmision-weatherlink.md`
- alcance: cliente y pruebas WeatherLink, documentacion
- criticidad: media

## Objetivo

Tratar dias sin transmision como ausencia de lecturas sin dejar la estacion en
error ni inventar datos.

## Cambios realizados

- sanitizacion de sensores vacios y registros sin timestamp;
- rechazo conservado para payloads estructuralmente invalidos;
- prueba de cursor diario con cero observaciones;
- spec y modelo del dominio actualizados.

## Contratos y datos afectados

- API HTTP: sin cambios.
- PostgreSQL: sin cambios.
- autenticacion, permisos y variables: sin cambios.

## Validaciones ejecutadas

| Prueba | Resultado |
| --- | --- |
| pruebas WeatherLink dirigidas | 13 OK |
| lint, typecheck y build API | OK |
| docs check y diff check | OK |

## Riesgos conocidos

- La ausencia de transmisión queda representada por ausencia de lecturas.
- Rechazos HTTP y payloads sin arreglo de sensores siguen siendo reintentables.

## Instrucciones al reviewer

- solo lectura;
- citar defectos reproducibles;
- no modificar archivos.
