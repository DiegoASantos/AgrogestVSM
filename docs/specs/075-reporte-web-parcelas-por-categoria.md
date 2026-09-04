---
title: Reporte web de parcelas por categoría de área
status: implemented
numero: 075
area: reportes, parcelas, geodatos, admin-web, api
created: 2026-09-04
approved_by: Usuario, 2026-09-04
implemented_in: apps/api/src/modules/reportes; apps/admin-web/src/modules/reportes; apps/admin-web/src/app/(admin)/reportes/parcelas; docs/architecture/overview.md; docs/domain/data-model.md; docs/operations/security-baseline.md, 2026-09-04
---

# Spec 075: Reporte web de parcelas por categoría de área

## Contexto

El módulo web de Reportes necesita un submódulo Parcelas para analizar la
distribución territorial y de superficie según el tamaño registrado de cada
parcela. El ingeniero corresponde a la asignación actual de la parcela, no al
registrador de su última visita.

## Alcance

### Incluido

- Submódulo `Parcelas` dentro del acordeón Reportes y ruta
  `/reportes/parcelas`.
- Filtros buscables de Ingeniero, Productor, Sector y Subsector, además del
  estado `Todas`, `Activas` o `Inactivas`.
- Tabla de resumen por ingeniero con hectáreas, parcelas y media de hectáreas
  por parcela.
- Mapa de parcelas coloreadas por categoría de área.
- Gráfico circular de distribución porcentual de parcelas por categoría.
- Gráfico circular de distribución porcentual de hectáreas por categoría.
- Acceso de lectura para `ADMIN` y `ANALISTA`.

### Excluido

- Cambios de esquema, migraciones, mobile, SQLite u outbox.
- Modificación del área o de la asignación de una parcela desde el reporte.
- Exportación o histórico de cambios de superficie y asignación.

## Requisitos

- RF-001: Ingeniero, Productor, Sector y Subsector usan selectores con búsqueda
  de texto y opción para considerar todos los registros.
- RF-002: Subsector depende del Sector seleccionado; al cambiar Sector se
  limpia un Subsector que ya no corresponda.
- RF-003: Estado ofrece `Activas`, `Inactivas` y `Todas`; la vista inicia en
  `Activas`.
- RF-004: Ingeniero usa `parcelas.agronomo_usuario_id`, es decir, la asignación
  actual. Las parcelas sin ingeniero asignado se excluyen por completo del
  reporte, incluidos resumen, totales, mapa y gráficos.
- RF-005: Las categorías son continuas para áreas decimales positivas:
  `Micro` mayor que cero y menor que 4 ha; `Pequeño` desde 4 y menor que 7 ha;
  `Mediano` desde 7 y menor que 10 ha; `Grande` desde 10 ha.
- RF-006: Un área nula, cero, negativa o no numérica se considera sin categoría
  y se informa separadamente; no se asigna artificialmente a Micro.
- RF-007: La tabla presenta `Ingeniero`, `Hectáreas`, `Parcelas` y
  `Media de HT por parcela`. La media es hectáreas acumuladas divididas entre
  parcelas de la fila, con cero cuando no existen parcelas. Incluye fila Total.
- RF-008: El gráfico de parcelas usa como denominador las parcelas con categoría
  válida después de aplicar filtros.
- RF-009: El gráfico de hectáreas usa como denominador la suma de hectáreas de
  las parcelas categorizadas después de aplicar filtros.
- RF-010: El mapa muestra el polígono o, como fallback, el punto interno y el
  punto de acceso. Usa colores estables para las cuatro categorías y reporta
  parcelas categorizadas sin geodatos.
- RF-011: Tabla, mapa y gráficos consumen el mismo conjunto filtrado. Las
  parcelas sin categoría participan en el resumen por ingeniero, pero no en el
  mapa por categoría ni en los gráficos circulares.
- RNF-001: La API calcula categorías, sumas, medias y porcentajes; el navegador
  no descarga catálogos completos para recomponer la regla de negocio.
- RNF-002: La interfaz conserva el lenguaje visual agrícola de Reportes, alto
  contraste, tema oscuro, navegación por teclado y adaptación móvil.

## Contratos afectados

- Nuevo `GET /reportes/parcelas` con query opcional:
  - `agronomo_usuario_id`: entero positivo;
  - `productor_id`: entero positivo;
  - `sector_id`: entero positivo;
  - `subsector_id`: entero positivo;
  - `activo`: booleano.
- La respuesta contiene totales, resumen por ingeniero, distribución por las
  cuatro categorías y parcelas categorizadas con datos descriptivos y geodatos.
- Se reutilizan los lookups existentes de agrónomos, productores, sectores y
  subsectores; no se modifican sus contratos.

## Seguridad y datos

- El endpoint conserva los guards globales y `@Roles("ADMIN", "ANALISTA")` del
  controlador de Reportes.
- La respuesta no incluye correos, teléfonos, documentos ni roles completos.
  Solo expone nombres visibles, identificadores operativos, área y geodatos ya
  autorizados para estos roles.
- Los IDs y el booleano se validan; todas las condiciones SQL son parametrizadas.
- No se registran filtros, nombres, geometrías ni resultados del reporte en logs.

## Migración y rollback

No existe migración. El cambio es aditivo: desplegar primero la API y después
la web. El rollback elimina la ruta y el endpoint nuevos sin transformar datos
ni afectar los reportes existentes.

## Criterios de aceptación

- [x] CA-001: Parcelas aparece como tercer submódulo del acordeón Reportes.
- [x] CA-002: ADMIN y ANALISTA acceden; AGRONOMO queda bloqueado en API y web.
- [x] CA-003: Los cinco filtros actualizan conjuntamente tabla, mapa y gráficos.
- [x] CA-004: El resumen agrupa por asignación actual, excluye parcelas sin
      ingeniero y calcula hectáreas, parcelas, media y totales correctos.
- [x] CA-005: Los límites decimales clasifican sin huecos ni solapamientos y
      separan áreas inválidas.
- [x] CA-006: El mapa aplica colores estables y fallback geográfico sin duplicar
      el conteo de parcelas.
- [x] CA-007: Ambos gráficos circulares muestran cantidades y porcentajes con
      sus denominadores correctos.
- [x] CA-008: Carga, error, vacío, tema oscuro y móvil son legibles y recuperables.

## Pruebas

- Unitarias del DTO, roles y construcción de query.
- Unitarias de límites de categoría, resumen, porcentajes, filtros y geodatos.
- Unitarias de navegación y catálogos web.
- Lint, typecheck, pruebas y build de API y admin web.
- Revisión independiente del diff y validación visual cuando exista navegador.

## Impacto documental

- [x] Arquitectura: registrar el tercer submódulo de Reportes.
- [x] Dominio: registrar categorías, universo y denominadores.
- [x] Seguridad: registrar el nuevo endpoint de lectura masiva protegida.
- [x] Runbook: evaluado; no cambia el procedimiento operativo.
- [x] ADR: evaluado; no introduce una decisión arquitectónica nueva.
- [x] Variables o despliegue: evaluado; no agrega variables ni migraciones.
