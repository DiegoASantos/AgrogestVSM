---
title: Etapas y labores en celdas independientes del Excel de visitas
status: implemented
numero: "098"
area: api, admin-web, visitas-campo, reportes
created: 2026-10-12
approved_by: usuario (aprobación del plan e instrucción "Implement the plan", 2026-10-12)
implemented_in: apps/api/src/modules/visitas-campo/application/visitas-campo.service.ts; apps/api/src/modules/visitas-campo/application/visitas-campo.service.test.ts; docs/domain/data-model.md
---

# Spec 098: Etapas y labores en celdas independientes del Excel de visitas

## Contexto

El Excel de visitas concatena las etapas y labores de una parcela en una sola
celda. El porcentaje histórico de subetapa aparece en una columna aparte y
puede confundirse con la cobertura de cada entrada. El usuario necesita una
fila y un porcentaje independiente por etapa o labor.

## Alcance

### Incluido

- Reorganizar únicamente el archivo `.xlsx` descargado desde Visitas en web.
- Mostrar `Etapa o labor`, `Subetapa` y `% de parcela` en columnas separadas.
- Combinar y centrar los datos comunes de cada visita cuando ocupen varias filas.
- Conservar los diagnósticos en filas paralelas sin concatenarlos.

### Excluido

- PDF, captura mobile, esquema de base de datos y datos persistidos.

## Requisitos

- RF-001: cada etapa o labor se muestra en una fila según su orden guardado.
- RF-002: el porcentaje es una celda numérica de Excel. Tiene prioridad la
  cobertura guardada; si falta, se usa el avance histórico de labor. Para una
  visita antigua con una sola etapa y sin cobertura se usa el avance histórico
  de subetapa. Sin valor disponible la celda queda vacía.
- RF-003: la subetapa se muestra en su propia columna, vacía para labores.
- RF-004: las columnas generales se combinan y centran a lo largo de todas
  las filas de la visita. Una etapa o labor única también se combina cuando
  los diagnósticos requieren varias filas.
- RNF-001: no modificar ni reinterpretar los datos almacenados; el uso de
  avances históricos como `% de parcela` se limita a esta exportación, por
  indicación expresa del usuario.

## Contratos afectados

`GET /visitas-campo/reporte-excel` conserva ruta, filtros, permisos, nombre de
archivo y tipo MIME. Cambia la estructura de la hoja de 18 a 19 columnas; las
columnas K-M pasan a ser etapa/labor, subetapa y porcentaje respectivamente.
Las visitas con varias entradas pueden ocupar más filas que sus diagnósticos.

## Seguridad y datos

Se mantiene la consulta de visitas activas y el filtro de agrónomo aplicado
por la API. Los nombres de etapa y subetapa se protegen como texto de Excel
frente a fórmulas. La equivalencia visual de avances históricos con cobertura
puede inducir a interpretarlos como superficie real; esta limitación se
documenta y no altera la semántica del dominio.

## Migración y rollback

No hay migración. La API se puede revertir al formato anterior del Excel sin
pérdida de datos; el panel web no necesita cambios de compatibilidad.

## Criterios de aceptación

- [x] CA-001: varias etapas o labores aparecen en filas independientes y con
  porcentajes numéricos propios.
- [x] CA-002: los avances antiguos acordados aparecen como `% de parcela` y
  los porcentajes ausentes dejan la celda vacía.
- [x] CA-003: datos generales y diagnósticos conservan sus combinaciones,
  centrado y contenido en la hoja de 19 columnas.

## Pruebas

- Prueba del libro con varias etapas y labores, cobertura y avance histórico,
  porcentaje ausente, orden, celdas combinadas y diagnósticos.
- `pnpm check`, `pnpm test:coverage` y `pnpm build` completados el 2026-10-12.

## Impacto documental

- [ ] Arquitectura.
- [x] Dominio: documentar la proyección especial del Excel.
- [ ] Runbook.
- [ ] ADR.
- [ ] Variables o despliegue.
