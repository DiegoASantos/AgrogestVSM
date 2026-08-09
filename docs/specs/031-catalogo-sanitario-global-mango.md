---
title: Catálogo sanitario global para etapas y labores de mango
status: implemented
numero: 031
area: database, visitas, sanidad, mobile, release
created: 2026-08-09
approved_by: usuario, 2026-08-09
implemented_in: apps/api/src/database/migrations/043-catalogo-sanitario-global-mango.ts; apps/api/src/database/migrations/index.ts; docs/domain/data-model.md; docs/architecture/mobile-offline-sync.md; docs/operations/risk-register.md
---

# Spec 031: Catálogo sanitario global para etapas y labores de mango

## Contexto

La captura sanitaria móvil obtiene plagas, enfermedades y niveles desde
`plagas_enfermedades_etapas_niveles`. Hasta ahora esa relación representaba
disponibilidad agronómica por etapa fenológica, por lo que algunos elementos no
aparecían fuera de las etapas para las que habían sido configurados.

Para el inicio de operación se acordó que todas las plagas y enfermedades
activas deben estar disponibles en todas las etapas y labores activas de mango.
El catálogo global ya contiene grados de incidencia y severidad, y la incidencia
de enfermedades ya se deriva del porcentaje de árboles enfermos.

## Alcance

### Incluido

- Completar mediante una migración de datos las relaciones faltantes entre todo
  el catálogo sanitario activo, todas las etapas y labores activas de mango y
  los grados 0 a 3 de incidencia y severidad.
- Reactivar relaciones coincidentes que estén inactivas.
- Preservar descripciones existentes y mantener las relaciones nuevas sin una
  descripción agronómica inventada.
- Validar el catálogo antes y después de la carga.
- Documentar preflight, backup, verificación, cancelación y recuperación.

### Excluido

- Crear o modificar tablas, columnas, constraints o índices.
- Cambiar DTOs, endpoints, entidades, SQLite, outbox o contratos mobile.
- Permitir incidencia manual en enfermedades.
- Permitir severidad de enfermedad cuando la incidencia sea grado 0.
- Aplicar el catálogo a cultivos distintos de mango.
- Ejecutar la migración o cualquier consulta contra producción desde una IA.

## Requisitos

- RF-001: Deben participar todas las filas activas de `plagas_enfermedades`
  cuyo tipo normalizado sea `plaga` o `enfermedad`.
- RF-002: Deben participar todas las filas activas de `etapas_fenologicas` del
  único cultivo activo cuyo nombre normalizado sea `mango`, incluyendo los tipos
  `Etapa` y `Labor`.
- RF-003: Debe existir exactamente un nivel para cada combinación de tipo
  `incidencia`/`severidad` y grado 0, 1, 2 y 3. La migración debe abortar si el
  catálogo no cumple esta cardinalidad.
- RF-004: Por cada plaga o enfermedad, etapa o labor y nivel deben existir ocho
  relaciones activas. La carga debe ser idempotente y no crear duplicados.
- RF-005: Un conflicto con una relación existente debe conservar su descripción
  y establecer `activo = true`.
- RF-006: En enfermedades, el porcentaje entero de árboles enfermos conserva la
  derivación autoritativa: 0% es grado 0; más de 0% y hasta 5% es grado 1; más
  de 5% y hasta 20% es grado 2; más de 20% y hasta 100% es grado 3.
- RF-007: Con incidencia grado 0 en enfermedades no se captura severidad. Con
  incidencia positiva se ofrecen los cuatro niveles globales de severidad.
- RNF-001: Toda la carga debe ejecutarse dentro de la transacción de migración y
  cualquier precondición o postcondición fallida debe revertirla completa.
- RNF-002: Clientes mobile existentes siguen siendo compatibles; ven los datos
  nuevos después de descargar nuevamente los catálogos.

## Contratos afectados

Solo cambia el contenido de PostgreSQL en
`plagas_enfermedades_etapas_niveles`. Los contratos API, SQLite y TypeScript no
cambian. Mobile ya descarga la relación y filtra localmente por etapa o labor.

## Seguridad y datos

No se agregan datos personales ni permisos. La migración opera únicamente sobre
catálogos técnicos. Antes de producción se requiere un backup validado y una
instantánea de las relaciones sanitarias para recuperación selectiva.

## Migración y rollback

1. Ejecutar preflight de cardinalidades sobre una copia o entorno controlado.
2. Validar un único cultivo mango activo, etapas/labores activas, al menos una
   plaga y enfermedad activas y los ocho niveles únicos.
3. Insertar el producto cartesiano con `ON CONFLICT`, preservando descripciones.
4. Verificar que el total activo objetivo sea
   `catálogo sanitario activo × etapas/labores activas de mango × 8`.
5. Desplegar la API, comprobar health y recargar catálogos en el dispositivo de
   smoke.
6. El rollback de código conserva la carga aditiva. Ante un error de datos se
   usa una migración correctiva basada en la instantánea previa; restaurar el
   backup completo queda como último recurso aprobado.

## Criterios de aceptación

- [x] CA-001: Todas las plagas y enfermedades activas aparecen en Brotamiento y
      en cualquier otra etapa o labor activa de mango.
- [x] CA-002: Cada elemento expone cuatro grados de incidencia y cuatro de
      severidad, sin duplicados.
- [x] CA-003: Enfermedades derivan incidencia en las fronteras
      0, 1, 5, 6, 20, 21 y 100 y deshabilitan severidad con grado 0.
- [x] CA-004: Ejecutar dos veces el SQL produce el mismo conjunto de relaciones.
- [x] CA-005: Una relación inactiva se reactiva sin perder su descripción.
- [x] CA-006: Cualquier precondición inválida revierte toda la migración.
- [x] CA-007: Un dispositivo que recarga catálogos recibe las relaciones nuevas
      sin migración SQLite ni pérdida de datos offline.

## Pruebas

- Unitarias de contenido y registro de la migración.
- PostgreSQL real temporal con catálogo parcial, relación inactiva y descripción
  existente; aplicación repetida y postcondición de cardinalidad.
- Casos de aborto por Mango ausente/duplicado, nivel faltante/duplicado o
  catálogo sanitario vacío.
- Regresión API/mobile de relaciones por etapa y fronteras de porcentaje.
- `pnpm check`, `pnpm build` y revisión independiente del diff congelado.

## Impacto documental

- [x] Actualizar el modelo de dominio sanitario.
- [x] Actualizar la arquitectura de recarga de catálogos mobile.
- [x] Actualizar índices de specs y documentación.
- [x] Registrar el riesgo de cardinalidad y caché de catálogo para el release.
- [x] No requiere ADR ni variables nuevas.

## Resultado de implementación

- La migración 043 completa y reactiva el producto cartesiano acordado sin
  modificar el esquema ni sobrescribir descripciones.
- PostgreSQL 18 temporal validó 32 relaciones para dos elementos sanitarios, una
  etapa y una labor; la segunda ejecución conservó las mismas 32 relaciones.
- Una relación inactiva quedó activa y mantuvo su descripción.
- Un catálogo con solo siete niveles abortó dentro de la transacción y dejó cero
  relaciones.
- `pnpm check` aprobó 156 archivos y 1186 pruebas; `pnpm build` aprobó todos los
  componentes del monorepo.
- El release queda condicionado a backup validado, preflight del catálogo real,
  health checks y recarga de catálogos en un dispositivo de smoke.
