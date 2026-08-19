# Handoff: Spec 059 - seleccion fitosanitaria simplificada

## Identificacion

- fecha: 2026-08-19
- responsable: Codex
- spec o issue: Spec 059
- alcance del diff: formulario mobile de receta y mezclas, funciones puras,
  pruebas y documentacion vigente
- criticidad: media

## Objetivo

Permitir iniciar un producto fitosanitario por Nombre comercial o Ingrediente
activo, derivar el tipo de producto, usar Quimico como control inicial editable
y ocultar la navegacion cuando solo existe una mezcla.

## Cambios realizados

- Seleccion de ingredientes y marcas sin exigir tipo previo, con marca unica
  automatica y marcas repetidas diferenciadas por ingrediente y tipo.
- Tipo de producto derivado en solo lectura y Quimico aplicado solo a controles
  vacios mediante el nombre del catalogo.
- Restauracion compatible de borradores e historicos y pruebas de regresion.
- Spec 059, arquitectura mobile, dominio e indices actualizados.

## Contratos y datos afectados

- API: sin cambios.
- PostgreSQL/PostGIS: sin cambios.
- SQLite/outbox: sin cambios.
- autenticacion y permisos: sin cambios.
- variables y despliegue: sin cambios; compatible con OTA.

## Validaciones ejecutadas

| Comando o prueba | Resultado |
| ---------------- | --------- |
| `pnpm.cmd exec vitest run apps/mobile/src/modules/visita-recetas` | 124/124 pruebas pasan |
| `pnpm.cmd --filter @agrogest/mobile typecheck` | pasa |
| `pnpm.cmd --filter @agrogest/mobile lint` | pasa |
| `pnpm.cmd docs:check` | pasa, 121 documentos validados |
| Prettier sobre archivos modificados sin deuda previa | pasa |
| `git diff --check` | pasa |

## Riesgos conocidos y exclusiones

- `visita-receta-multiple-products.test.ts` conserva bloques antiguos que no
  cumplen Prettier; no se amplio el diff para reformatearlos.
- Si el catalogo no contiene Quimico, el formulario deja el control vacio en vez
  de usar un ID fijo.
- Fertilizantes, persistencia y sincronizacion quedan fuera del alcance.
- DeepSeek Reviewer se inicio con el agente `deepseek-reviewer`, pero no emitio
  salida ni veredicto despues de mas de cinco minutos y la sesion fue
  interrumpida para no dejar un proceso bloqueado.

## Instrucciones al reviewer

- revisar unicamente el alcance descrito;
- no modificar archivos;
- citar archivo y linea;
- priorizar defectos reproducibles;
- devolver veredicto y hallazgos por severidad.
