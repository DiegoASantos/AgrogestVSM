---
title: Restaurar ejecución de la prueba mobile de recetas
status: implemented
numero: "002"
area: mobile-testing
created: 2026-06-25
approved_by: mantenedor
implemented_in: working-tree-2026-06-25
---

# Spec 002: Restaurar ejecución de la prueba mobile de recetas

## Contexto

`pnpm check` completa lint y typecheck, pero Vitest falla antes de ejecutar
`visita-recetas.service.test.ts`. Una dependencia termina importando
`react-native/index.js` y Rolldown intenta interpretar sintaxis Flow no
soportada.

Esto deja el control de calidad global en rojo aunque las demás 266 pruebas
pasen.

## Alcance

### Incluido

- identificar la cadena exacta que introduce `react-native`;
- aislar o mockear la dependencia nativa en la prueba;
- conservar el entorno Node del resto de la suite;
- comprobar que la prueba de consolidación de recetas ejecuta sus assertions;
- restaurar `pnpm test` y `pnpm check`.

### Excluido

- cambios funcionales en recetas;
- migraciones SQLite;
- actualización de Expo, React Native, Vitest o Rolldown;
- refactorización general del módulo.

## Requisitos

- RF-001: La suite `visita-recetas.service.test.ts` debe cargarse y ejecutar sus
  pruebas.
- RNF-001: La solución no debe ocultar errores funcionales mediante un mock
  excesivamente amplio.
- RNF-002: Las demás suites deben continuar ejecutándose con la configuración
  actual.

## Contratos afectados

No se modifican contratos de API, PostgreSQL ni SQLite. El cambio esperado se
limita al aislamiento de pruebas o a dependencias puras del servicio.

## Seguridad y datos

No se procesan datos reales ni secretos.

## Migración y rollback

No requiere migración. El rollback consiste en revertir el ajuste de pruebas si
produce regresiones.

## Criterios de aceptación

- [x] CA-001: La suite de recetas deja de fallar durante el parseo.
- [x] CA-002: Sus assertions se ejecutan y pasan.
- [x] CA-003: `pnpm test` termina correctamente.
- [x] CA-004: `pnpm check` termina correctamente.
- [x] CA-005: No se elimina ni excluye la suite para conseguir el resultado.

## Pruebas

- ejecutar la suite de recetas de forma aislada;
- ejecutar `pnpm test`;
- ejecutar `pnpm check`.

## Impacto documental

- [x] Actualizar `docs/operations/risk-register.md` y cerrar R-002.
- [x] Registrar `implemented_in` al completar el cambio.
- [x] No requiere cambios de arquitectura, dominio, runbooks ni ADR.
