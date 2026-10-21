---
title: Reporte Excel visitas pbi por visita
status: implemented
numero: 116
area: api, admin-web, reportes
created: 2026-10-21
approved_by: usuario mediante "Implement the plan", 2026-10-21
implemented_in: apps/api/src/modules/visitas-campo, apps/admin-web/src/modules/visitas; 2026-10-21
---

# Spec 116: Reporte Excel visitas pbi por visita

## Contexto

La vista administrativa de visitas técnicas requiere descargar un reporte Excel
individual que siga la estructura de los tres bloques de la hoja "Garcia
Pedrera" del libro Productores Israel.xlsx. La tabla de cosecha/transporte debe
conservar sus encabezados, pero quedar vacía.

## Alcance

### Incluido

- Acción de descarga en cada visita técnica de la tabla administrativa.
- Endpoint autenticado de Excel para una visita por ID.
- Hoja única con nombre del productor, adaptado a las restricciones de Excel.
- Bloques de visita/campo, productos/recomendaciones y cosecha/transporte.

### Excluido

- Visitas comerciales, cambios de datos o migraciones de base de datos.
- Datos de cosecha/transporte; el bloque se entrega sin filas de datos.
- Cambios al reporte general actual de visitas.

## Requisitos

- RF-001: La acción de una fila descarga solamente la visita de esa fila.
- RF-002: El nombre descargado es `visitas pbi.xlsx` y contiene una hoja cuyo
  nombre es el del productor; caracteres inválidos se sustituyen y el nombre
  se limita a 31 caracteres.
- RF-003: La hoja conserva los encabezados y la organización de los tres
  bloques de la referencia. La primera tabla refleja la visita seleccionada,
  sus evaluaciones, etapas, diagnósticos y labores disponibles. La segunda
  refleja productos/recomendaciones de la receta asociada cuando existe. Los
  valores sin correspondencia o nulos quedan vacíos.
- RF-004: El bloque de cosecha/transporte conserva únicamente los encabezados,
  sin datos del productor ni de otras visitas.
- RF-005: La descarga requiere la autenticación y autorización de API ya
  aplicadas al controlador de visitas; un ID inválido o inexistente produce
  el error HTTP correspondiente sin devolver un archivo parcial.
- RNF-001: El XLSX protege texto de usuario contra interpretación como fórmula.

## Contratos afectados

Se añade `GET /visitas-campo/:id/reporte-pbi-excel`, con respuesta binaria XLSX,
`Content-Disposition: attachment; filename="visitas pbi.xlsx"` y el MIME
`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`. No cambian
los contratos JSON existentes.

## Seguridad y datos

El endpoint usa el guard global de autenticación/roles del API. El reporte solo
incluye datos de la visita identificada; no agrega datos históricos del
productor. El texto exportado se escribe como texto de hoja, sin fórmulas.

## Migración y rollback

No requiere migración. El rollback elimina la acción y endpoint nuevos; no
modifica registros ni el reporte general.

## Criterios de aceptación

- [x] CA-001: Cada fila descarga la visita asociada a su ID.
- [x] CA-002: XLSX con una hoja de nombre válido del productor y los tres
  bloques, siguiendo los encabezados de la referencia.
- [x] CA-003: Productos/recomendaciones corresponden a la receta de esa visita;
  el bloque de cosecha/transporte permanece vacío.
- [x] CA-004: ID inexistente responde 404 y la ruta de descarga declara MIME y
  nombre de archivo acordados; autenticación y roles usan los guards globales.

## Pruebas

- Unitarias del generador: estructura, valores de visita/receta y celdas de
  cosecha vacías; ID inexistente cubierto.
- API: encabezados de descarga, nombre y envío binario cubiertos por prueba del
  controlador; autenticación y roles usan los guards globales.
- Admin web: URL por ID y descarga binaria.

## Impacto documental

- [x] Arquitectura.
- [ ] Dominio.
- [ ] Runbook.
- [ ] ADR.
- [ ] Variables o despliegue.
