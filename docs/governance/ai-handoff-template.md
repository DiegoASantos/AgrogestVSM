---
title: Plantilla de handoff para revisión de IA
status: active
owner: mantenimiento
last_reviewed: 2026-06-25
---

# Handoff para revisión independiente

Copiar esta plantilla en `docs/notes/` durante una revisión. El archivo temporal
no se convierte en documentación oficial. Las conclusiones duraderas se
promueven al documento correspondiente.

```markdown
# Handoff: <título>

## Identificación

- fecha:
- responsable:
- spec o issue:
- alcance del diff:
- criticidad: baja | media | alta | crítica

## Objetivo

<resultado esperado y problema que resuelve>

## Cambios realizados

- <archivo o componente y propósito>

## Contratos y datos afectados

- API:
- PostgreSQL/PostGIS:
- SQLite/outbox:
- autenticación y permisos:
- variables y despliegue:

## Validaciones ejecutadas

| Comando o prueba | Resultado |
| ---------------- | --------- |
|                  |           |

## Riesgos conocidos y exclusiones

- <riesgo aceptado, deuda o trabajo fuera de alcance>

## Instrucciones al reviewer

- revisar únicamente el alcance descrito;
- no modificar archivos;
- citar archivo y línea;
- priorizar defectos reproducibles;
- devolver veredicto y hallazgos por severidad.
```

## Regla de propiedad

Mientras el handoff está en revisión, el implementador conserva la propiedad de
los archivos. El reviewer solo lee. Las correcciones se realizan después de
cerrar la revisión y únicamente por el implementador activo.
