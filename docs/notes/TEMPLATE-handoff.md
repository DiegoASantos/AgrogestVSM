---
title: Handoff de revisión — TEMPLATE
status: draft
owner: mantenimiento
last_reviewed: 2026-06-25
---

# Handoff: [Spec o issue]

## Identificación

- fecha: YYYY-MM-DD;
- responsable: [Codex / otro];
- spec o issue: `docs/specs/NNN-titulo.md` o enlace al issue;
- alcance: [descripción breve del alcance];
- criticidad: [baja / media / alta / crítica].

## Objetivo

[Propósito de la revisión: qué se espera verificar.]

## Cambios realizados

- [cambio 1];
- [cambio 2];
- [cambio 3].

## Contratos y datos afectados

- [API / DB / mobile / web / variables: descripción del impacto];

## Validaciones ejecutadas

| Comando o prueba | Resultado |
| ---------------- | --------- |
| `pnpm check` | |
| `pnpm build` | |
| [otra validación] | |

## Riesgos conocidos y exclusiones

- [riesgo o exclusión 1];
- [riesgo o exclusión 2].

## Instrucciones al reviewer

- revisar únicamente el alcance documentado;
- no modificar archivos;
- citar archivo y línea;
- priorizar pérdida de datos, bypass de seguridad y fallos de recuperación;
- separar defectos comprobados de mejoras opcionales.
