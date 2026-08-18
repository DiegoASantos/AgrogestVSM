# Handoff: Spec 050 - catalogo agroquimico desde Excel

## Identificacion

- fecha: 2026-08-18
- responsable: Codex
- spec o issue: Spec 050
- alcance del diff: migracion PostgreSQL 051, pruebas y documentacion del
  catalogo agroquimico; excluir los cambios mobile y de specs 048/049 ya
  presentes en el worktree
- criticidad: alta

## Objetivo

Cargar productos e ingredientes faltantes desde
`productos_agroquimicos_con_concentracion.xlsx`, comparando contra el estado de
la base al ejecutar la migracion. Un mismo nombre comercial puede repetirse con
tipos diferentes y debe reutilizar el ingrediente activo.

## Cambios realizados

- `051-catalogo-agroquimicos-excel.ts`: instantanea de 91 pares nombre--tipo,
  resolucion de 49 etiquetas en 45 ingredientes canonicos, actualizacion solo
  de nulos e insercion idempotente.
- `051-catalogo-agroquimicos-excel.test.ts`: cantidades, multiuso, aliases,
  preservacion de datos, concentraciones y rollback.
- `migrations/index.ts`: registro de la migracion 051.
- spec 050, modelo de dominio, arquitectura mobile, rollback e indices
  documentales actualizados.

## Contratos y datos afectados

- API: sin cambio de endpoint ni DTO.
- PostgreSQL/PostGIS: datos aditivos en `tipos_producto_fitosanitario`,
  `ingredientes_activos` y `marcas_producto`; sin cambio de esquema.
- SQLite/outbox: sin cambios; mobile recibe el catalogo por la descarga vigente.
- autenticacion y permisos: sin cambios.
- variables y despliegue: sin variables; aplicar primero en un entorno no
  productivo autorizado y con backup.

## Validaciones ejecutadas

| Comando o prueba                     | Resultado                                 |
| ------------------------------------ | ----------------------------------------- |
| Comparacion Excel vs instantanea 051 | 91/91 pares exactos                       |
| Pruebas de migraciones API           | 28 archivos, 97 pruebas correctas         |
| Suite API                            | 100 archivos, 807 pruebas correctas       |
| Typecheck API                        | correcto                                  |
| Lint de archivos modificados         | correcto                                  |
| Build API                            | correcto                                  |
| `pnpm docs:check`                    | 111 documentos correctos                  |
| `git diff --check`                   | correcto                                  |
| `pnpm db:smoke`                      | bloqueado antes de 051 por R-001 conocido |
| DeepSeek Reviewer                    | sin respuesta en dos intentos             |

## Riesgos conocidos y exclusiones

- No se consulto ni modifico produccion. La comparacion con datos nuevos se
  ejecuta dentro del SQL idempotente al aplicar la migracion.
- El smoke integral no alcanza migraciones nuevas porque la migracion 001 usa
  `parcelas.sector_id`; el riesgo ya esta registrado como R-001.
- El reviewer externo no produjo veredicto en dos intentos, incluido uno
  limitado a cuatro archivos. Codex realizo revision manual y agrego resolucion
  determinista ante tipos fitosanitarios duplicados por nombre.
- Las URL de fuente del Excel no se persisten porque el modelo no tiene una
  columna de procedencia.
- No revisar como parte de esta spec los cambios no relacionados de mobile,
  assets, specs 048/049 o lockfile presentes en el worktree.

## Instrucciones al reviewer

- revisar unicamente el alcance descrito;
- no modificar archivos;
- citar archivo y linea;
- priorizar defectos reproducibles;
- devolver veredicto y hallazgos por severidad.
