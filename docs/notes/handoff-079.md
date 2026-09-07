# Handoff: reporte semanal de estimaciones

## Identificación

- fecha: 2026-09-07
- responsable: Codex
- spec o issue: Spec 079
- alcance del diff: endpoint agregado de reportes, vista web de tabla y gráfico,
  navegación, pruebas y documentación canónica asociada
- criticidad: media

## Objetivo

Permitir que ADMIN y ANALISTA comparen, por semanas completas, las visitas
proyectadas con las visitas ejecutadas para todos los agrónomos o para uno en
particular.

## Cambios realizados

- endpoint `GET /reportes/estimaciones` con rango lunes-domingo y filtro
  opcional de agrónomo;
- serie continua de semanas, agregados históricos y variación firmada;
- submódulo web `/reportes/estimaciones` con filtros, gráfico de dos líneas y
  tabla semanal;
- estados de carga, error y ausencia de actividad, estilos responsive y modo
  oscuro;
- navegación, pruebas y documentación de arquitectura, dominio y seguridad.

## Contratos y datos afectados

- API: nuevo endpoint de lectura `GET /reportes/estimaciones`.
- PostgreSQL/PostGIS: sin migración; reutiliza `estimaciones_visitas` y
  `visitas_campo`.
- SQLite/outbox: sin cambios.
- autenticación y permisos: acceso exclusivo para ADMIN y ANALISTA; AGRONOMO
  excluido.
- variables y despliegue: sin variables; API y web deben liberarse juntas.

## Validaciones ejecutadas

| Comando o prueba                         | Resultado                                                                  |
| ---------------------------------------- | -------------------------------------------------------------------------- |
| pruebas focalizadas                      | API, cliente web, utilidades y navegación aprobadas                        |
| `pnpm check`                             | 234 archivos y 1841 pruebas aprobadas; lint, tipos y documentación válidos |
| `pnpm build`                             | API, web, mobile y paquetes aprobados; `/reportes/estimaciones` generado   |
| Prettier focalizado y `git diff --check` | aprobado para los archivos del alcance                                     |

## Riesgos conocidos y exclusiones

- No se creó una tabla ni se ejecutaron migraciones.
- No se modificó mobile ni se añadieron exportaciones, alertas o nuevos roles.
- La consulta devuelve agregados operativos y no expone datos personales.

## Instrucciones al reviewer

- revisar únicamente el alcance descrito;
- no modificar archivos;
- citar archivo y línea;
- priorizar defectos reproducibles;
- devolver veredicto y hallazgos por severidad.

## Resultado de revisión

- DeepSeek aprobó el alcance sin defectos bloqueantes.
- Se aceptó una observación baja y se añadió el año ISO abreviado al eje X para
  evitar ambigüedad en rangos que cruzan años.
- Se confirmó que los colores de las líneas están definidos en el tema de
  Reportes y mantienen contraste sobre el fondo oscuro. La duplicación mínima
  de normalización se conserva deliberadamente en las fronteras API y web.
- La revisión final confirmó el ajuste sin hallazgos y emitió veredicto
  aprobado.
