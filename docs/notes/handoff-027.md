# Handoff: Spec 027 - múltiples productos y validación de mezclas

## Identificación

- fecha: 2026-08-03
- responsable: Codex
- spec o issue: `docs/specs/027-multiples-productos-receta-validacion-incompatibilidades.md`
- alcance del diff: receta mobile, reglas de incompatibilidad, pruebas y documentación vigente
- criticidad: alta

## Objetivo

Permitir varios ingredientes activos por hallazgo y varios fertilizantes por
receta, restaurarlos sin pérdida y advertir incompatibilidades sin bloquear la
decisión profesional.

## Cambios realizados

- `visita-receta-screen.tsx`: estado multi-producto, agregar/quitar, contadores,
  claves de dropdown independientes, confirmación previa y accesibilidad.
- `visita-receta-multiple-products.ts`: tipos y transformaciones puras entre
  estado UI y filas existentes.
- `validacion-mezclas.ts`: 12 reglas declarativas, alias exactos normalizados,
  condiciones de ausencia y mensaje con disclaimer.
- pruebas co-ubicadas para agrupación, aplanado, restauración, nomenclatura y
  reglas.
- spec 027, índice y modelo de dominio actualizados.

## Contratos y datos afectados

- API: sin cambios; el DTO existente ya recibe arrays.
- PostgreSQL/PostGIS: sin cambios; tablas hijas 1:N existentes.
- SQLite/outbox: sin cambios estructurales; la receta agregada ya persiste y
  sincroniza arrays de detalles.
- autenticación y permisos: sin cambios.
- variables y despliegue: sin variables; compatible con OTA del runtime actual.

## Validaciones ejecutadas

| Comando o prueba                                | Resultado                                                                  |
| ----------------------------------------------- | -------------------------------------------------------------------------- |
| Vitest `apps/mobile/src/modules/visita-recetas` | 5 archivos, 41 pruebas pasan                                               |
| Typecheck mobile                                | pasa                                                                       |
| ESLint de archivos cambiados                    | pasa                                                                       |
| Prettier de alcance                             | pasa                                                                       |
| Expo export Android                             | pasa                                                                       |
| `git diff --check`                              | pasa                                                                       |
| Regresión sync offline-online                   | 2 fallos previos: espera 7 procesados, recibe 6 + 1 omitido                |
| `docs:check`                                    | falla por deuda histórica general de frontmatter/enlaces fuera del alcance |

## Riesgos conocidos y exclusiones

- La advertencia usa `Alert` nativo porque la spec lo exige; un mensaje con
  muchas reglas puede ser extenso.
- La validación es orientativa y no sustituye etiquetas ni criterio profesional.
- Una versión mobile anterior no debe editar una receta multi-producto porque
  su UI solo restaura el primer fertilizante.
- No se agregó tabla, migración, endpoint ni cambio de sync.
- Cambios locales ajenos preservados: documento DOCX eliminado, guía
  metodológica nueva e índice de specs previamente modificado.

## Disposición de la primera revisión DeepSeek

- H1 aceptado: se contrastaron migraciones 019, 028 y 037; se agregaron casos
  para las 12 reglas con la nomenclatura real del catálogo.
- H2 aceptado: las ausencias ahora se muestran como `Condición`, no como un
  producto presente.
- H3 verificado: `handleReceta`, el cliente remoto y la API preservan `numero`,
  `objetivo` y `objetivoNombre`; se agregó una prueba de round-trip puro.
- H4 y H5 aceptados: se conserva `unidadDosis` histórica y se reutiliza una sola
  función para la unidad derivada.
- H6 resuelto: la spec se marca `implemented` después de cerrar los hallazgos y
  ejecutar las validaciones finales.
- H7 aceptado: el constructor devuelve cadena vacía sin advertencias y está
  probado.
- H8 aclarado: la guía metodológica ya es parte del alcance local preparado por
  el usuario; no fue modificada por el implementador.
- H9 diferido: la regresión general de sync es deuda previa y no toca los
  archivos de esta spec.

## Disposición de la revisión final DeepSeek

- Veredicto aprobado, sin hallazgos medios o altos reproducibles.
- Se corrigió el hallazgo bajo B1: `Corrector de pH`, `Ácido orgánico + indicador`
  y `Buffer P.H.` satisfacen las reglas que requieren corrección de alcalinidad.
- B2 no requiere cambio: una cantidad de plantas debe ser entera; no se preserva
  el truncamiento silencioso de valores decimales inválidos.

## Instrucciones al reviewer

- revisar únicamente el alcance descrito;
- no modificar archivos;
- incluir los archivos nuevos aunque todavía no estén versionados;
- citar archivo y línea;
- priorizar defectos reproducibles;
- devolver veredicto y hallazgos por severidad.
