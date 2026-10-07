---
title: Subetapa automática según cobertura de parcela
status: implemented
numero: 091
area: visitas-campo, mobile, offline
created: 2026-10-05
approved_by: usuario (Implement the plan, 2026-10-05)
implemented_in: apps/mobile/src/modules/visitas-campo/presentation/screens/new-visita-campo-screen.tsx; apps/mobile/src/modules/visitas-campo/domain/stage-distribution.ts
---

# Spec 091: Subetapa automática según cobertura de parcela

## Contexto

El paso 1 ya permite marcar varias etapas y labores y repartir entre ellas la
cobertura total de la parcela. El selector de subetapa, sus imágenes y la barra
añaden controles separados. Se simplifica la captura para que la persona marque
las opciones y escriba su porcentaje en la misma fila.

## Alcance

### Incluido

- Mostrar el catálogo completo de etapas y labores en una lista compacta de
  casillas, sin distintivo de tipo.
- Mostrar un campo numérico de porcentaje al lado de cada opción seleccionada.
- Derivar automáticamente la subetapa de una `Etapa` a partir de los límites
  porcentuales configurados; las `Labor` no tienen subetapa.
- Conservar la subetapa existente al abrir una visita para edición y derivarla
  de nuevo solo cuando cambie su porcentaje.
- Retirar del paso 1 el selector, nombre e imágenes de subetapa y la barra
  deslizante. Mantener la validación de cobertura total, los datos históricos de
  avance de labor, borradores y sincronización offline.

### Excluido

- Cambios de esquema SQLite/PostgreSQL, API, payload de sync o catálogos.
- Cambios en la visualización de subetapas del detalle, reportes y paso 6.
- Cambios en la distribución compartida descrita en la spec 090.

## Requisitos

- RF-001: La lista muestra todas las etapas y labores activas del cultivo con
  casillas. Solo las opciones seleccionadas muestran el campo de cobertura en
  la misma fila.
- RF-002: La primera opción seleccionada inicia en 100%; las siguientes quedan
  vacías. Las coberturas deben ser enteros de 1 a 100 y sumar exactamente 100%.
- RF-003: Para asignar subetapa, ordenar las subetapas activas con porcentaje
  válido entre 0 y 100 de menor a mayor. Elegir la primera cuyo porcentaje sea
  mayor o igual a la cobertura digitada; si no hay un límite superior, elegir
  la última subetapa configurada. Así, los límites 15, 35, 45 y 80 forman los
  tramos 1–15, 16–35, 36–45 y 46–100. Los porcentajes nulos o fuera de rango se
  ignoran. Si no queda ninguna subetapa con porcentaje válido, no se puede
  guardar una Etapa nueva o modificada cuyo porcentaje requiera asignación.
- RF-004: En una visita existente se conserva el `subEtapaId` guardado al
  abrirla, incluso si difiere del resultado calculado. Un cambio manual de
  cobertura vuelve a derivarlo automáticamente.
- RF-005: Una `Labor` solo captura cobertura; cualquier avance de labor
  histórico se conserva sin reinterpretarlo.
- RNF-001: Se guardan el mismo `coveragePercentage` y `subEtapaId` existentes
  en SQLite y se envían en la operación durable de visita; no cambia el orden,
  la idempotencia ni la recuperación offline.
- RNF-002: El tutorial guía a marcar opciones y digitar porcentajes hasta sumar
  100%, sin pedir seleccionar una subetapa.

## Contratos afectados

No cambia el contrato de API, SQLite ni sync. `subEtapaId` sigue siendo
obligatorio para etapas; mobile lo resuelve con el catálogo offline usando la
cobertura digitada. `coveragePercentage` sigue siendo la cobertura compartida
de Etapas y Labores.

## Seguridad y datos

Se conservan los permisos y validaciones actuales de visita, cultivo y
subetapa. No se agregan datos ni se exponen nombres o imágenes de subetapas en
el formulario.

## Migración y rollback

No se requiere migración ni despliegue de API. El rollback del cliente restaura
el selector anterior y continúa leyendo los mismos IDs y porcentajes ya
guardados.

## Criterios de aceptación

- [x] CA-001: Cada opción seleccionada muestra un campo porcentual en su fila;
  no se muestra selector, nombre, imagen ni barra de subetapa.
- [x] CA-002: Los límites 15, 35 y 45 asignan los tramos 1–15, 16–35, 36–45;
  valores superiores asignan la última subetapa hasta 100.
- [x] CA-003: Una etapa nueva sin porcentajes configurados no puede guardarse;
  una edición no cambia la subetapa existente hasta modificar su porcentaje.
- [x] CA-004: El reparto compartido suma 100%, las labores conservan su avance
  histórico y la visita mantiene su persistencia y sincronización actuales.
- [x] CA-005: El tutorial describe la selección y escritura manual de porcentajes.

## Pruebas

- Validar los límites inferiores y superiores, tramo final, entradas fuera de
  rango y catálogos sin porcentajes válidos.
- Revisar captura de una opción, múltiples opciones, edición de visitas,
  validación de suma, borrador y guardado offline.
- Revisar en Android que el porcentaje quede en la misma fila y que no aparezca
  ningún control de subetapa ni barra.

## Impacto documental

- [x] Arquitectura.
- [x] Dominio.
- [ ] Runbook.
- [ ] ADR.
- [ ] Variables o despliegue.

## Estado de entrega

Typecheck y lint mobile pasan; la validación documental pasa. No se ejecutaron
pruebas automatizadas ni revisión visual en Android durante este cambio.
