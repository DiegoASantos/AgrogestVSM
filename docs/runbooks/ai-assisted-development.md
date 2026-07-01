---
title: Flujo de desarrollo asistido por IA
status: active
owner: mantenimiento
last_reviewed: 2026-06-29
---

# Flujo de desarrollo asistido por IA

## Responsabilidades

- desarrollador: aprueba alcance crítico, valida funcionalmente y autoriza
  commits y despliegues;
- Codex: orquesta, implementa, prueba, evalúa hallazgos y actualiza documentos;
- explorador: investiga en modo lectura;
- DeepSeek Reviewer: agente primario invocable por CLI que revisa el diff en
  modo lectura;
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
8. Preparar un handoff usando
   `docs/governance/ai-handoff-template.md`.
9. Congelar las ediciones del alcance mientras DeepSeek revisa.
10. Ejecutar el reviewer de solo lectura.
11. Codex clasifica cada hallazgo como aceptado, rechazado o diferido.
12. Corregir hallazgos aceptados y repetir pruebas.
13. Registrar métricas y actualizar documentación.
14. Solicitar validación humana antes de commit, despliegue o cambio crítico.

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

## Ejecución de DeepSeek

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
- explorador y reviewer: edición, delegación, skills, red y rutas externas
  denegadas;
- reviewer: solo comandos de inspección del repositorio;
- configuración general: commit, push, reset, clean y borrado denegados;
- ediciones del agente principal requieren confirmación.

## Ediciones paralelas

Antes del handoff se declara el alcance del diff. Durante la revisión:

- Codex no modifica los archivos revisados;
- DeepSeek no puede editar ningún archivo;
- si cambia el diff, la revisión anterior queda obsoleta;
- otro implementador solo puede trabajar en archivos expresamente disjuntos.

## Salida

El formato del reviewer se normaliza con
`docs/governance/ai-review-template.md`. Todo hallazgo debe incluir evidencia,
impacto y corrección mínima.
