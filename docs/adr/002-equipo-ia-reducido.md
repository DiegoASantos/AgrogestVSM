---
title: Equipo inicial de IA reducido
status: accepted
date: 2026-06-25
decision_makers:
  - mantenimiento
supersedes:
superseded_by:
---

# ADR-002: equipo inicial de IA reducido

## Contexto

El mantenimiento está a cargo de un único desarrollador. Crear desde el inicio
agentes separados para backend, mobile, web, QA, seguridad, base de datos y
revisión aumentaría coordinación, consumo y posibles contradicciones.

## Decisión

El equipo inicial será:

- Codex como orquestador e implementador principal;
- un explorador económico y de solo lectura;
- DeepSeek como reviewer independiente;
- skills especializadas bajo demanda.

Los nuevos subagentes exigirán evidencia de beneficio repetible.

## Alternativas consideradas

- ocho agentes especializados permanentes;
- un solo modelo sin revisión independiente;
- delegar implementación crítica a modelos gratuitos.

## Consecuencias

### Positivas

- menos pérdida de contexto;
- responsabilidades verificables;
- menor mantenimiento de prompts;
- facilidad para cambiar proveedores.

### Negativas y riesgos

- Codex concentra inicialmente más trabajo;
- algunas revisiones serán secuenciales;
- la especialización crecerá más lentamente.

## Verificación

Durante la Fase 2 se medirán tiempo, defectos, correcciones y consumo antes de
crear nuevos agentes.
