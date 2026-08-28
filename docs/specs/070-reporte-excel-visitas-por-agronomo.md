---
title: Reporte Excel de visitas por agrónomo
status: implemented
numero: 070
area: visitas-campo, admin-web, api
created: 2026-08-26
approved_by: Usuario
implemented_in: apps/api/src/modules/visitas-campo, apps/admin-web/src/modules/visitas
---

# Spec 070: Reporte Excel de visitas por agrónomo

## Contexto

La interfaz de Visitas requiere exportar el trabajo realizado por uno o todos
los agrónomos dentro de un rango de fechas, sin limitarse a la página visible.

## Alcance

### Incluido

- Descarga autenticada de un archivo `.xlsx` desde la API.
- Rango inclusivo obligatorio y filtro opcional por agrónomo.
- Una hoja operativa con fecha, ficha, cultivo, agrónomo, productor, sector, parcela,
  horas, etapa fenológica, estado y diagnósticos de plagas, enfermedades y
  nutrición, humedad del suelo y estrés hídrico intencional.
- Tras añadir Cultivo después de N.° ficha, Hora fin ocupa la columna I, Etapa
  fenológica la J, Porcentaje de avance la K y Estado queda al final en la Q;
  las columnas de diagnóstico se centran y se combinan cuando una categoría
  tiene un único valor dentro de la ficha.
- Botón de exportación en la pantalla administrativa de Visitas.

### Excluido

- Scores técnicos, evaluaciones detalladas y recetas.
- Migraciones, sincronización mobile y cambios de roles.

## Requisitos

- RF-001: permitir todos los agrónomos o uno seleccionado dentro del rango.
- RF-002: exportar todas las visitas activas coincidentes, sin paginación.
- RF-003: devolver una hoja válida aun cuando no haya filas.
- RF-004: agrupar visualmente los datos generales de cada ficha cuando tenga
  múltiples diagnósticos, mostrando plagas, enfermedades y nutrición en filas
  paralelas.
- RNF-001: validar fechas ISO y que la fecha inicial no supere la final.

## Contratos afectados

- `GET /visitas-campo/reporte-excel` con `fecha_desde`, `fecha_hasta` y
  `agronomo_usuario_id` opcional; responde archivo Excel descargable.

## Seguridad y datos

- Mantiene el guard de autenticación y la visibilidad actual del módulo de
  Visitas; no introduce roles ni datos adicionales fuera de sus columnas.
- Para el rol `AGRONOMO`, la API fuerza el identificador de la sesión aunque
  se reciba otro agrónomo como filtro.
- No registrar contenido del reporte, identificadores personales ni tokens.
- El rango obligatorio reduce consultas accidentales muy amplias; si el volumen
  de visitas crece, reevaluar un límite operativo o procesamiento asíncrono.

## Migración y rollback

- Sin migración de datos ni esquema.
- Rollback: retirar el botón y la ruta nueva; no hay datos persistidos por la
  exportación.

## Criterios de aceptación

- [x] CA-001: el usuario puede descargar por agrónomo o todos en un rango.
- [x] CA-002: el archivo contiene las columnas operativas y diagnósticos
      acordados, incluido Porcentaje de avance como porcentaje numérico o
      `---` cuando no fue registrado, y sin columna de campaña.
- [x] CA-003: fechas inválidas o invertidas se rechazan sin generar archivo.

## Pruebas

- unitarias de validación, consulta y contenido del libro;
- integración HTTP de descarga y cabeceras;
- validación manual de descarga desde el panel.

## Impacto documental

- [ ] Arquitectura.
- [ ] Dominio.
- [ ] Runbook.
- [ ] ADR.
- [ ] Variables o despliegue.
