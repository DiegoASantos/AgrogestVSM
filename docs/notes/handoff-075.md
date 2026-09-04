# Handoff: reporte web de parcelas por categoría de área

## Identificación

- fecha: 2026-09-04
- responsable: Codex
- spec o issue: Spec 075
- alcance del diff: nuevo endpoint y submódulo web `/reportes/parcelas`, pruebas,
  navegación, estilos y documentación asociada; incluye además los cambios locales
  previamente aprobados de la Spec 074 que ya estaban presentes
- criticidad: alta

## Objetivo

Permitir a `ADMIN` y `ANALISTA` consultar parcelas por su asignación actual,
territorio y estado, con resumen por ingeniero, mapa por categoría de superficie
y distribuciones porcentuales de parcelas y hectáreas.

## Cambios realizados

- `apps/api/src/modules/reportes`: DTO validado, endpoint protegido, consulta
  parametrizada, categorías y agregados.
- `apps/admin-web/src/modules/reportes`: cliente, tipos, filtros buscables, tabla,
  mapa, gráficos circulares, estados de interfaz y pruebas.
- navegación y ruta web: tercer submódulo del acordeón Reportes.
- `docs/`: Spec 075 y actualización de arquitectura, dominio y seguridad.
- ajuste solicitado el 2026-09-04: exclusión integral de parcelas sin ingeniero,
  filtro de estado aplicado sobre `parcelas.activo` y centrado del gráfico y la
  leyenda de distribución de hectáreas.

## Contratos y datos afectados

- API: nuevo `GET /reportes/parcelas` con cinco filtros opcionales.
- PostgreSQL/PostGIS: solo lectura; sin esquema ni migración.
- SQLite/outbox: sin cambios.
- autenticación y permisos: lectura exclusiva para `ADMIN` y `ANALISTA`.
- variables y despliegue: sin cambios.

## Validaciones ejecutadas

| Comando o prueba            | Resultado                                                                                                        |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Pruebas dirigidas API       | 20/20 aprobadas                                                                                                  |
| Pruebas dirigidas admin web | 11/11 aprobadas                                                                                                  |
| `pnpm test`                 | 1783/1783 aprobadas                                                                                              |
| Lint API y admin web        | aprobado                                                                                                         |
| Typecheck API y admin web   | aprobado                                                                                                         |
| Build API y admin web       | aprobado; ruta `/reportes/parcelas` generada                                                                     |
| `pnpm docs:check`           | aprobado, 149 archivos                                                                                           |
| `git diff --check`          | aprobado; solo avisos CRLF de Windows                                                                            |
| `pnpm format:check`         | falla basal: 758 archivos históricos no formateados; los archivos modificados fueron formateados individualmente |
| Pruebas posteriores         | API 20/20 y admin web 11/11 aprobadas                                                                            |
| Checks posteriores          | lint, typecheck y build de API y admin web aprobados                                                             |

## Riesgos conocidos y exclusiones

- No se ejecutó prueba contra una base PostgreSQL real ni validación visual en
  navegador porque no hay una sesión de navegador disponible en este entorno.
- El despliegue y el commit permanecen fuera de alcance.

## Instrucciones al reviewer

- revisar únicamente el alcance descrito;
- no modificar archivos;
- citar archivo y línea;
- priorizar defectos reproducibles;
- devolver veredicto y hallazgos por severidad.
