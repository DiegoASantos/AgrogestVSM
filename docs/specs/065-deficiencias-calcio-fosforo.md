---
title: Deficiencias nutricionales de Calcio y Fósforo
status: implemented
numero: "065"
area: api, mobile, nutricion, visitas, postgresql, sqlite, sync
created: 2026-08-21
approved_by: usuario, 2026-08-21
implemented_in: apps/api y apps/mobile, migraciones PostgreSQL 056 y SQLite 68, 2026-08-21
---

# Spec 065: Deficiencias nutricionales de Calcio y Fósforo

## Contexto

El módulo de Nutrición para visitas de Mango ofrece seis deficiencias y el
puntaje técnico consolida ese mismo universo. El técnico también necesita
evaluar Calcio y Fósforo, reconocerlos mediante sus imágenes y recomendarlos en
la receta cuando exista una evaluación.

Las instalaciones mobile descargan el catálogo nutricional desde la API y lo
conservan en SQLite. Por ello el cambio requiere una carga PostgreSQL
idempotente, invalidar la fecha del catálogo local y mantener compatibles los
clientes anteriores y los pendientes offline.

## Alcance

### Incluido

- agregar Calcio y Fósforo al catálogo activo de nutrientes de Mango;
- copiar para ambos los niveles y descripciones activos de severidad de
  Nitrógeno;
- mostrar sus tarjetas e imágenes en el módulo mobile de Nutrición;
- conservar los seis órdenes históricos y agregar las dos tarjetas al final;
- ampliar a ocho nutrientes el score técnico de API y mobile;
- refrescar el catálogo SQLite sin modificar evaluaciones, recetas ni outbox;
- comprobar su disponibilidad en recomendaciones curativas de receta.

### Excluido

- agregar los nutrientes a cultivos distintos de Mango;
- cambiar rangos de incidencia, fórmulas individuales o semáforos;
- crear niveles de severidad diferentes a los actuales;
- cambiar DTOs, endpoints, esquema de outbox o payloads de sincronización;
- agregar fertilizantes, concentraciones o incompatibilidades nuevas.

## Requisitos

- RF-001: Mango tiene dos nutrientes activos adicionales: `Calcio`, código
  `calcio`, y `Fósforo`, código `fosforo`.
- RF-002: Cada nuevo nutriente tiene los mismos detalles activos, nombres y
  descripciones de severidad que Nitrógeno.
- RF-003: Mobile muestra las imágenes `calcio.webp` y `fosforo.webp` mediante
  referencias relativas y estáticas compatibles con Metro.
- RF-004: El orden queda Nitrógeno, Magnesio, Potasio, Hierro, Zinc, Boro,
  Calcio y Fósforo, sin cambiar el número de orden histórico de los seis
  primeros.
- RF-005: Los rangos se mantienen en 0% grado 0, 1–5% grado 1, 6–20% grado 2
  y 21–100% grado 3.
- RF-006: `ScoreNutricion` es el mínimo de las notas de los ocho nutrientes.
  Una deficiencia no registrada aporta incidencia 0 y nota 3 sin crear una
  evaluación artificial.
- RF-007: Una evaluación de Calcio o Fósforo se integra a la receta como
  deficiencia curativa mediante el flujo existente.
- RNF-001: La migración PostgreSQL es idempotente, valida sus precondiciones y
  no elimina datos empresariales.
- RNF-002: La migración SQLite solo invalida `catalogs_downloaded_at`; no borra
  catálogos, pendientes, evaluaciones ni recetas.
- RNF-003: API y mobile mantienen el contrato actual; `nutritionScores`
  conserva su estructura y pasa de seis a ocho elementos.

## Contratos afectados

No se agregan endpoints ni campos. `GET /nutrientes` incorpora dos filas de
catálogo para Mango y sus detalles. Los desgloses técnicos de Nutrición
mantienen la forma de cada elemento, pero `nutritionScores` contiene ocho y la
cadena `moduleFormula` enumera Calcio y Fósforo.

## Seguridad y datos

No cambian permisos ni datos personales. La carga se limita al cultivo Mango y
aborta si Mango, Nitrógeno o sus detalles activos no son inequívocos. No se
ejecutan operaciones contra producción desde este cambio.

## Migración y rollback

La migración PostgreSQL 056 crea o reactiva los dos nutrientes, reconcilia sus
códigos estables y copia los detalles activos de Nitrógeno. Una verificación
final exige exactamente ambos nutrientes y la misma cantidad de detalles
activos que la plantilla.

La migración SQLite 68 elimina únicamente la marca de descarga para forzar una
nueva lectura al disponer de conexión. El orden de despliegue es migración y
API, seguido de mobile.

El rollback no elimina filas porque pueden estar referenciadas por dispositivos
offline, evaluaciones o recetas. Ante una corrección se aplica baja lógica o
migración progresiva auditada; la presentación puede corregirse por OTA
compatible.

## Criterios de aceptación

- [x] CA-001: Calcio y Fósforo aparecen activos en Nutrición de una visita de
      Mango, con sus imágenes correctas.
- [x] CA-002: Ambos muestran los mismos niveles de severidad activos que
      Nitrógeno y permiten guardar incidencia positiva.
- [x] CA-003: Los límites 0, 5, 6, 20 y 21 producen grados 0, 1, 2, 2 y 3.
- [x] CA-004: API y mobile calculan el mínimo de ocho notas y asignan nota 3 a
      cada deficiencia no evaluada.
- [x] CA-005: Los seis nutrientes existentes conservan su orden de evaluación.
- [x] CA-006: Una evaluación de Calcio o Fósforo puede originar una
      recomendación curativa de fertilización.
- [x] CA-007: Actualizar desde SQLite 67 invalida el catálogo sin modificar
      outbox ni datos offline.
- [x] CA-008: Reejecutar la migración PostgreSQL no crea duplicados.

## Pruebas

- unitarias de migración PostgreSQL, score API y score local mobile;
- migración SQLite desde la versión 67 y preservación de datos offline;
- resolución de imágenes y orden de tarjetas;
- regresión de receta curativa y fertilización preventiva general;
- lint, typecheck, pruebas y build proporcionales de API y mobile;
- validación manual online/offline antes de una entrega mobile.

## Impacto documental

- [x] Arquitectura: actualizar sincronización mobile por la migración 68.
- [x] Dominio: actualizar el universo fijo del score nutricional.
- [x] Runbook: no cambia el procedimiento vigente.
- [x] ADR: no corresponde.
- [x] Variables o despliegue: no agrega variables; documentar el orden de
      despliegue compatible.
