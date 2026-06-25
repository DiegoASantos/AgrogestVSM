---
title: docs como vault y documentación canónica
status: accepted
date: 2026-06-25
decision_makers:
  - mantenimiento
supersedes:
superseded_by:
---

# ADR-001: `docs/` como vault y documentación canónica

## Contexto

El proyecto necesita documentación útil para el desarrollador y para distintas
IAs. Mantener una carpeta documental y un vault separado permitiría
contradicciones, duplicación y pérdida de autoridad.

## Decisión

La carpeta `docs/` será simultáneamente:

- documentación oficial;
- vault de Obsidian;
- base consultada y actualizada por OpenGem;
- conocimiento versionado mediante Git.

`docs/index.md` será el mapa canónico. La configuración local de Obsidian no se
versionará inicialmente.

## Alternativas consideradas

- mantener `.vault/` separado de `docs/`;
- usar una wiki externa;
- documentar únicamente mediante README y comentarios.

## Consecuencias

### Positivas

- una sola ubicación;
- historial y revisión mediante Git;
- compatibilidad con cualquier IA;
- navegación visual mediante Obsidian.

### Negativas y riesgos

- requiere disciplina para promover notas;
- los documentos pueden quedar obsoletos si no forman parte de la definición de
  terminado.

## Verificación

- todos los documentos oficiales están bajo `docs/`;
- los documentos activos son accesibles desde `docs/index.md`;
- no se configura otro vault canónico.
