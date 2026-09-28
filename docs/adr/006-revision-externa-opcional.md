---
title: Revisión externa opcional en el flujo de IA
status: accepted
date: 2026-09-28
decision_makers:
  - mantenimiento
supersedes: ADR-002
superseded_by:
---

# ADR-006: Revisión externa opcional en el flujo de IA

## Contexto

ADR-002 incluyó a DeepSeek como reviewer independiente del flujo inicial. En la
etapa actual del proyecto, el mantenedor considera que exigir esa revisión en
cada cambio ya no aporta suficiente valor. El revisor puede seguir disponible
como herramienta, pero su disponibilidad no debe bloquear el trabajo.

## Decisión

Codex continúa como implementador principal. La revisión con DeepSeek u otro
agente externo es opcional y se solicita según la necesidad de una tarea. No
forma parte de la definición de terminado ni sustituye la revisión humana, las
pruebas proporcionales o los controles de seguridad aplicables.

Cuando se solicite una revisión externa, el revisor trabaja en modo lectura,
sin ediciones simultáneas, y sus hallazgos se evalúan contra el diff vigente.

## Alternativas consideradas

- Mantener una revisión externa obligatoria por cambio.
- Retirar por completo la herramienta de revisión.

## Consecuencias

### Positivas

- Menos bloqueos por disponibilidad o configuración del revisor.
- El esfuerzo de revisión se concentra donde el mantenedor lo considere útil.

### Negativas y riesgos

- Algunos cambios tendrán una sola revisión de IA; se conservan las pruebas,
  revisión de seguridad por alcance y aprobación humana requeridas.

## Verificación

Los runbooks y `AGENTS.md` no exigen DeepSeek para completar una tarea. El
comando de revisión permanece disponible para uso voluntario.
