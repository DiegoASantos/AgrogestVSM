---
title: Flujo de desarrollo asistido por IA
status: active
owner: mantenimiento
last_reviewed: 2026-09-28
---

# Flujo de desarrollo asistido por IA

## Responsabilidades

- desarrollador: aprueba alcance crítico, valida funcionalmente y autoriza
  commits y despliegues;
- Codex: orquesta, implementa, prueba, evalúa hallazgos y actualiza documentos;
- explorador: investiga en modo lectura;
- DeepSeek Reviewer: herramienta opcional de segunda opinión en modo lectura;
- skills: procedimientos bajo demanda, sin autoridad propia.

Solo existe un implementador con permiso de escritura por tarea.

## Flujo

1. Leer `AGENTS.md` y `docs/index.md`.
2. Evaluar si el pedido del usuario es suficientemente claro para decidir
   alcance, reglas, datos, contratos, seguridad, UX y validaciones.
3. Si el pedido es ambiguo, incompleto o pobre en detalles, hacer preguntas
   aclaratorias en la CLI activa antes de redactar una spec o implementar.
4. Determinar si se requiere spec o ADR.
5. Definir archivos bajo propiedad del implementador.
6. Explorar y acordar el alcance.
7. Implementar y ejecutar validaciones proporcionales.
8. Ejecutar la revisión de seguridad y datos cuando corresponda al alcance.
9. Actualizar la documentación y registrar riesgos pendientes.
10. Si se solicita una segunda opinión, preparar un handoff con
    `docs/governance/ai-handoff-template.md`, congelar el diff, ejecutar el
    reviewer de solo lectura y evaluar sus hallazgos. Repetir pruebas si hay
    correcciones.
11. Solicitar validación humana antes de commit, despliegue o cambio crítico.

## Preguntas aclaratorias

La IA debe priorizar alinearse con el requerimiento real del usuario sobre
avanzar con supuestos débiles. Antes de generar una spec crítica o de iniciar
un cambio amplio, debe preguntar cuando falte información que pueda modificar:

- alcance funcional;
- datos o migraciones;
- contrato API, mobile o admin web;
- reglas de negocio;
- seguridad, roles o datos sensibles;
- experiencia de usuario;
- criterios de aceptación o validación.

Las preguntas deben hacerse en la interfaz CLI activa del usuario o agente:
Codex, OpenCode, Claude Code u otra equivalente. Deben ser concretas,
preferiblemente pocas y orientadas a desbloquear una decisión. Si el pedido es
claro y el riesgo es bajo, la IA puede continuar sin interrumpir.

## Revisión opcional con DeepSeek

La revisión externa no es requisito de cierre. Si se solicita o se considera
útil para una tarea concreta, usar un agente con permisos de solo lectura y
comprobar que no se haya activado un agente con permisos de escritura por
sustitución automática.

La credencial se registra fuera del repositorio:

```powershell
opencode.cmd
# Dentro de OpenCode: /connect -> DeepSeek
```

Comprobación:

```powershell
opencode.cmd models deepseek
opencode.cmd agent list
```

Revisión interactiva:

```powershell
pnpm ai:review -- -Title "Spec NNN" -Handoff "docs/notes/handoff-NNN.md"
```

El script no omite permisos, no escribe la respuesta en documentación oficial y
no expone la clave.

## Permisos

- archivos `.env`: lectura denegada; `.env.example`: permitida;
- explorador y, cuando se use, reviewer: edición, delegación, skills, red y
  rutas externas denegadas;
- reviewer opcional: solo comandos de inspección del repositorio;
- configuración general: commit, push, reset, clean y borrado denegados;
- ediciones del agente principal requieren confirmación.

## Ediciones paralelas

Si se solicita un handoff, se declara el alcance del diff. Durante esa revisión:

- Codex no modifica los archivos revisados;
- el reviewer no puede editar ningún archivo;
- si cambia el diff, la revisión anterior queda obsoleta;
- otro implementador solo puede trabajar en archivos expresamente disjuntos.

## Salida

Cuando se solicita una revisión externa, su salida se normaliza con
`docs/governance/ai-review-template.md`. Todo hallazgo debe incluir evidencia,
impacto y corrección mínima.
