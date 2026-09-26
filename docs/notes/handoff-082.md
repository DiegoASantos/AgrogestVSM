---
title: Handoff de revisión — Spec 082
status: draft
owner: mantenimiento
last_reviewed: 2026-09-22
---

# Handoff: Spec 082

## Identificación

- fecha: 2026-09-22;
- responsable: Codex;
- spec: `docs/specs/082-datos-pago-cosecha-comercial.md`;
- alcance: primer paso mobile de Comercial, pago de cosecha offline y API;
- criticidad: alta.

## Objetivo

Verificar que la captura de documento y cuenta no permita bypass horizontal,
pérdida de pendientes ni duplicados al reintentar la sincronización.

## Cambios realizados

- formulario Comercial y pestaña inferior mobile;
- validación compartida, SQLite 73, outbox y handler de sync;
- PostgreSQL 062 y `POST /comercial/pagos-cosecha` idempotente;
- documentación, riesgo R-037 y pruebas enfocadas.

## Contratos y datos afectados

- API, PostgreSQL, SQLite, outbox y tipos compartidos;
- documento y cuenta/CCI del acreedor: datos personales sin cifrado SQLite,
  riesgo aceptado temporalmente en R-037.

## Validaciones ejecutadas

| Comando o prueba | Resultado |
| ---------------- | --------- |
| typecheck validation, API y mobile | OK |
| lint validation, API y mobile | OK |
| pruebas de esquema, servicio API y migraciones | OK: 53 pruebas |
| `pnpm docs:check` | OK |
| formato de archivos modificados | OK |

## Riesgos conocidos y exclusiones

- no se implementan edición, eliminación, consulta ni segundo paso;
- SQLite no cifra los datos de pago por decisión explícita registrada;
- el formato global del repositorio falla por archivos preexistentes fuera del
  alcance.

## Instrucciones al reviewer

- revisar únicamente el alcance documentado;
- no modificar archivos;
- citar archivo y línea;
- priorizar pérdida de datos, bypass de seguridad y fallos de recuperación;
- separar defectos comprobados de mejoras opcionales.
