# Handoff: reporte web de visitas

## Identificación

- fecha: 2026-09-04
- responsable: Codex
- spec o issue: Spec 073
- alcance del diff: reporte web, estilos, selector buscable y documentación; el
  endpoint API y la spec inicial quedaron incluidos en `HEAD` (`990d632`)
  durante la sesión y también deben revisarse.
- criticidad: alta

## Objetivo

Incorporar Reportes > Visitas para `ADMIN` y `ANALISTA`, con filtros buscables,
tabla de actividad por ingeniero, mapa de parcelas asignadas y gráfico diario
combinado de hectáreas observadas y visitas.

## Cambios realizados

- `apps/api/src/modules/reportes`: endpoint agregado, DTO, roles y pruebas.
- `apps/admin-web/src/modules/reportes`: cliente, tipos, filtros, resumen, mapa,
  gráfico y pruebas de lógica.
- `apps/admin-web/src/shared/components/searchable-select.tsx`: conserva el
  texto digitado mientras el selector está abierto.
- el mapa prioriza polígono, punto interno de parcela y punto de acceso, para no
  clasificar como ausente un `parcelPoint` válido.
- `apps/admin-web/src/app/globals.css`: layout de reportes responsivo.
- documentación activa y Spec 073 actualizadas.

## Contratos y datos afectados

- API: nuevo `GET /reportes/visitas` con rango obligatorio y filtros opcionales
  por agrónomo y productor.
- PostgreSQL/PostGIS: sin cambios de esquema; consultas parametrizadas de solo
  lectura sobre usuarios, roles, visitas y parcelas.
- SQLite/outbox: sin cambios.
- autenticación y permisos: endpoint exclusivo de `ADMIN` y `ANALISTA`.
- variables y despliegue: sin cambios; despliegue aditivo API antes de web.

## Validaciones ejecutadas

| Comando o prueba          | Resultado                                         |
| ------------------------- | ------------------------------------------------- |
| 4 archivos focalizados    | 13 pruebas aprobadas                              |
| `pnpm test`               | 226 archivos, 1758 pruebas aprobadas              |
| lint API y admin web      | aprobado                                          |
| typecheck API y admin web | aprobado                                          |
| build API y admin web     | aprobado; `/reportes` generado                    |
| navegador integrado       | no disponible; validación visual manual pendiente |

## Riesgos conocidos y exclusiones

- El mapa refleja asignaciones actuales, no históricas.
- El rango no tiene límite máximo; reevaluar índice o límite si crece el
  volumen de visitas y la consulta agregada presenta latencia.
- No se agregaron exportaciones, cambios mobile ni migraciones.
- Revisar tanto `git show 990d632` como el diff no comprometido, porque el
  commit contiene el endpoint API de la Spec 073.
- D1 de la primera revisión corregido: soporte de `parcelPoint` en el tipo web y
  en la construcción del mapa.
- O1-O4 y O6 no requieren cambio: los resultados de tabla y gráfico tienen
  universos documentados, las fechas son ISO validadas, el promedio se redondea
  a dos decimales, la envoltura HTTP global añade metadatos y el contador es
  descriptivo. O5 queda diferida como riesgo de rendimiento condicionado al
  crecimiento del volumen.

## Instrucciones al reviewer

- revisar únicamente el alcance descrito;
- inspeccionar `git show 990d632` y el diff actual sin modificar archivos;
- citar archivo y línea;
- priorizar defectos reproducibles de cálculo, autorización, filtros y mapa;
- devolver veredicto y hallazgos por severidad.
