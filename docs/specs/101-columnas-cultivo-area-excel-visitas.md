---
title: Columnas de cultivo y area en el Excel de visitas
status: implemented
numero: 101
area: api, visitas-campo, reportes
created: 2026-10-13
approved_by: usuario mediante instruccion "Implement the plan", 2026-10-13
implemented_in: apps/api/src/modules/visitas-campo/application/visitas-campo.service.ts, apps/api/src/modules/reportes/domain/parcel-area-category.ts, 2026-10-13
---

# Spec 101: Columnas de cultivo y area en el Excel de visitas

## Contexto

El Excel de visitas no muestra fecha de siembra, edad del cultivo, hectareas ni
categoria de la parcela. El usuario eligio usar el area actual de la parcela y
mostrar la edad en anos y meses completos.

## Alcance

### Incluido

- Cuatro columnas despues de Parcela en `GET /visitas-campo/reporte-excel`.
- Fecha de siembra de la visita; edad desde esa fecha hasta la fecha de visita.
- Hectareas del area actual de la parcela y categoria por los mismos limites del
  reporte de parcelas.
- Ajuste de formato, combinaciones, autofiltro y pruebas del libro.

### Excluido

- Cambios de captura mobile, base de datos, filtros o pantalla web.

## Requisitos

- RF-001: Edad en anos y meses completos; falta o fecha posterior a la visita
  deja la celda vacia.
- RF-002: Area valida positiva se muestra como numero en Excel; area invalida
  deja hectareas vacias y muestra `Sin categoria`.
- RF-003: Datos generales se combinan verticalmente cuando una visita ocupa
  varias filas.
- RF-004: La hoja conserva sus columnas previas, estilos y diagnósticos; pasa
  de 19 a 23 columnas.
- RNF-001: Reutilizar la regla vigente de clasificacion sin duplicar umbrales.

## Contratos afectados

La ruta, query, MIME y nombre del archivo permanecen. La hoja Excel agrega
`Fecha de siembra`, `Edad del cultivo`, `Nro de hectareas` y `Categoria` como
columnas I-L; el ultimo encabezado pasa a W. Sin cambio JSON ni mobile.

## Seguridad y datos

Se conserva el filtro por rol y agronomo. Se usan datos ya autorizados en la
exportacion. Textos se escriben mediante la proteccion existente contra
formulas de Excel.

## Migracion y rollback

No hay migracion. Revertir el generador restaura el formato anterior sin alterar
datos. La cifra de hectareas y la categoria de una visita historica pueden
cambiar cuando se edita el area actual de su parcela.

## Criterios de aceptacion

- [x] CA-001: Cuatro columnas nuevas con fuentes y orden acordados.
- [x] CA-002: Edad correcta en limites de mes y fechas ausentes.
- [x] CA-003: Area/categoria correcta en limites y ausencias.
- [x] CA-004: Hoja vacia, filas multiples, estilos y autofiltro validos.
- [x] CA-005: Pruebas y validaciones pertinentes pasan.

## Pruebas

- Unitarias de edad y clasificacion.
- Lectura del XLSX generado con valores, formatos y combinaciones.
- Lint, typecheck, pruebas y build de API.

`pnpm check` paso con 2037 pruebas en 262 archivos y el build de API paso el
2026-10-13.

## Impacto documental

- [x] Dominio.
- [ ] Arquitectura.
- [ ] Runbook.
- [ ] ADR.
- [ ] Variables o despliegue.
