---
title: Ajuste visual y semántico del Excel de visitas
status: implemented
numero: "099"
area: api, visitas-campo
created: 2026-10-12
approved_by: usuario (plan e instrucción "Implement the plan", 2026-10-12)
implemented_in: apps/api/src/modules/visitas-campo/application/visitas-campo.service.ts; apps/api/src/modules/visitas-campo/application/visitas-campo.service.test.ts; docs/domain/data-model.md
---

# Spec 099: Ajuste visual y semántico del Excel de visitas

## Contexto

El Excel de visitas aún puede mostrar contenido recortado por anchos y alturas
fijos. Su distribución presenta una columna de subetapa y puede mostrar avances
históricos como si fueran cobertura de parcela. El usuario pidió dos columnas
para la distribución y eliminar esa equivalencia histórica.

## Alcance

### Incluido

- Mostrar cada etapa o labor en una fila con `Etapa o labor` y `% de parcela`.
- Quitar `Subetapa` y cualquier columna de avance histórico del Excel.
- Ajustar ancho de columnas y altura de filas al contenido, incluso en celdas
  combinadas, conservando legibles encabezados y diagnósticos.

### Excluido

- Cambios en la captura mobile, el reporte web, PDF o datos persistidos.
- Migraciones o nuevos campos de API.

## Requisitos

- RF-001: la distribución conserva el orden guardado de etapas y labores; el
  porcentaje usa solo `coveragePercentage` y se guarda como número de Excel.
- RF-002: sin cobertura guardada, `% de parcela` queda vacío. El avance
  histórico de labor y el porcentaje antiguo de subetapa nunca se proyectan
  como cobertura en este archivo.
- RF-003: los anchos se calculan a partir de encabezados y valores con límites
  razonables; el texto largo se envuelve y la altura cubre las líneas visibles.
  Las celdas combinadas cuentan con la altura total del grupo.
- RNF-001: conservar filtros, permisos, nombre de archivo, protección frente a
  fórmulas y contenido de las demás columnas.

## Contratos afectados

`GET /visitas-campo/reporte-excel` conserva ruta, filtros, permisos, MIME y
nombre del archivo. La hoja `Visitas` pasa de 19 a 18 columnas; K-L representan
etapa o labor y porcentaje de parcela. Los diagnósticos pasan a M-O.

## Seguridad y datos

No se altera la consulta ni la autorización. Los valores de texto mantienen la
protección frente a fórmulas. Los datos históricos persisten sin cambios, pero
ya no se presentan como cobertura de parcela.

## Migración y rollback

No hay migración. El despliegue reconstruye solo la API de producción. Se
conserva una etiqueta de la imagen anterior para recuperar el formato previo
si falla la descarga; la base de datos no se revierte.

## Criterios de aceptación

- [x] CA-001: etapas y labores aparecen en filas propias y en dos columnas de
      distribución, sin subetapa ni avance histórico.
- [x] CA-002: cobertura presente aparece como porcentaje numérico; cobertura
      ausente queda vacía aunque existan avances históricos.
- [x] CA-003: encabezados, nombres largos, diagnósticos y datos combinados son
      legibles sin recortes en el archivo generado.
- [ ] CA-004: el reporte autenticado descarga tras el despliegue de la API de
      producción y la API permanece saludable.

## Pruebas

- Pruebas del libro con varias etapas y labores, cobertura ausente y texto largo.
- `pnpm check`, pruebas de visitas y build de la API.
- Verificación de salud y descarga autenticada en producción.

## Impacto documental

- [ ] Arquitectura.
- [x] Dominio: actualizar la proyección de Excel de visitas.
- [ ] Runbook.
- [ ] ADR.
- [ ] Variables o despliegue.
