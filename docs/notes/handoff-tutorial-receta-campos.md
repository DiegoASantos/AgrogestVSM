# Handoff: tutorial completo de receta por campo

## Identificacion

- fecha: 2026-08-26
- responsable: Codex
- spec o issue: requerimiento UX; no requiere spec critica
- alcance del diff: tutorial local de Receta, componente visual compartido, selector compartido, pruebas y arquitectura movil
- criticidad: media

## Objetivo

Corregir el tutorial de Receta para que destaque cada tarjeta real y, despues
de abrirla, avance al primer control y recorra todos los campos de todos los
productos. Excluir ingrediente activo y altas de catalogo. Aplicar verde oscuro
al boton, icono, texto y borde del tutorial de recomendaciones.

## Cambios realizados

- `recipe-tutorial.ts`: genera pasos dinamicos por tarjeta, producto y campo.
- `visita-receta-screen.tsx`: registra objetivos exactos, abre el flujo por
  tarjeta y avanza automaticamente al primer campo.
- `guided-form-tutorial.tsx`: permite definir el color del borde sin cambiar el
  estilo predeterminado del paso 1.
- `app-select-field.tsx`: expone una referencia opcional al contenedor visual.
- pruebas unitarias: validan orden, exclusion de ingrediente activo y recorrido
  independiente para multiples tarjetas.
- arquitectura mobile: documenta el comportamiento vigente y exclusiones.

## Contratos y datos afectados

- API: ninguno.
- PostgreSQL/PostGIS: ninguno.
- SQLite/outbox: ninguno.
- autenticacion y permisos: ninguno.
- variables y despliegue: ninguno.

## Validaciones ejecutadas

| Comando o prueba                                     | Resultado            |
| ---------------------------------------------------- | -------------------- |
| `pnpm.cmd --filter @agrogest/mobile typecheck`       | aprobado             |
| Vitest de tutorial, acordeones y seleccion de receta | 21 pruebas aprobadas |
| ESLint de los archivos modificados                   | aprobado             |
| Prettier check del alcance                           | aprobado             |

## Riesgos conocidos y exclusiones

- La validacion visual final en dispositivo fisico queda a cargo del usuario.
- No se incluyen acciones para crear ingredientes, marcas o fertilizantes.
- No se modifican persistencia, sincronizacion ni contratos.

## Instrucciones al reviewer

- revisar unicamente el alcance descrito;
- no modificar archivos;
- citar archivo y linea;
- priorizar defectos reproducibles;
- devolver veredicto y hallazgos por severidad.
