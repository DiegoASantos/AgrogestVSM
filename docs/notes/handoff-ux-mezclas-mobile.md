# Handoff: Mejoras UX de Mezclas mobile

## Identificación

- fecha: 2026-09-09
- responsable: Codex
- spec o issue: mejora UX sobre specs implementadas 057, 058 y 080
- alcance del diff: interfaz y validación de Mezclas, tutorial relacionado y documentación vigente
- criticidad: media

## Objetivo

Reducir carga cognitiva en el cierre de una visita mediante progreso visible,
pendientes accionables, validación contextual y divulgación progresiva, sin
alterar el borrador offline ni los contratos del agregado de receta.

## Cambios realizados

- `visita-mezclas-screen.tsx`: tablero de progreso, contador táctil, pendientes
  por mezcla al final de sus campos, navegación dirigida, errores tras
  interacción y secciones colapsables para coadyuvantes y orden.
- `app-select-field.tsx`: límite opcional de cinco resultados visibles con
  búsqueda sobre el catálogo completo y resumen accesible de coincidencias.
- `app-select-field-options.ts`: filtrado normalizado y acotado probado sin
  depender de React Native.
- `visita-mezclas-form.ts`: clasificación pura de pendientes y localización de
  la primera mezcla que necesita corrección.
- `recipe-tutorial.ts`: recorrido de Mezclas reducido y agrupado en ocho tareas.
- `app-input.tsx`: referencia opcional al input para enfocar el campo pendiente.
- pruebas unitarias: pendientes exactos, mezcla destino y tutorial agrupado.
- `mobile-offline-sync.md`: descripción vigente del flujo visual y tutorial.

## Contratos y datos afectados

- API: sin cambios.
- PostgreSQL/PostGIS: sin cambios.
- SQLite/outbox: sin cambios; los nuevos estados son efímeros y no se persisten.
- autenticación y permisos: sin cambios.
- variables y despliegue: sin cambios.

## Validaciones ejecutadas

| Comando o prueba                                 | Resultado              |
| ------------------------------------------------ | ---------------------- |
| `pnpm.cmd --filter @agrogest/mobile typecheck`   | aprobado               |
| `pnpm.cmd exec vitest run apps/mobile/src`       | 570 aprobadas          |
| ESLint sobre los archivos TypeScript modificados | aprobado               |
| `pnpm.cmd docs:check`                            | aprobado, 159 archivos |
| `git diff --check`                               | aprobado               |

## Revisión independiente

- El runner de DeepSeek no devolvió un resultado utilizable y se detuvo tras
  exceder el tiempo esperado.
- El reviewer alternativo detectó stepper desacoplado del valor visible, salto
  inestable a coadyuvantes, navegación secuencial, foco impreciso, anuncio
  duplicado y cobertura insuficiente.
- Los seis hallazgos fueron aceptados y corregidos; esta versión incorpora
  navegación diferida después del cambio de mezcla, anclas y foco por campo,
  siguiente mezcla incompleta y pruebas adicionales.
- La revisión de este ajuste detectó que el contador del selector no anunciaba
  búsquedas con cinco coincidencias o menos. Se amplió el `liveRegion` a todos
  los resultados de una búsqueda, incluido el estado sin coincidencias.

## Riesgos conocidos y exclusiones

- La validación visual final requiere dispositivo Android con teclado, texto
  ampliado y lector de pantalla.
- No se modificaron fórmulas agronómicas, catálogos, persistencia ni sync.
- La lista horizontal de mezclas se conserva como acceso directo, complementada
  por progreso y navegación dirigida.

## Instrucciones al reviewer

- revisar únicamente el alcance descrito;
- no modificar archivos;
- citar archivo y línea;
- priorizar defectos reproducibles;
- devolver veredicto y hallazgos por severidad.
