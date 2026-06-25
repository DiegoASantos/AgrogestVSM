---
title: Handoff temporal de revisión de la Spec 003
status: draft
owner: mantenimiento
last_reviewed: 2026-06-25
---

# Handoff: Spec 003 - seguridad operativa

## Identificación

- fecha: 2026-06-25;
- responsable: Codex;
- spec: `docs/specs/003-operational-security-foundation.md`;
- alcance: cambios de la Fase 1 presentes en el working tree;
- criticidad: crítica.

## Objetivo

Revisar la fundación de seguridad operativa implementada para autenticación,
configuración, bootstrap, backup y restore de PostgreSQL/PostGIS.

## Cambios realizados

- rate limiting del login y configuración de proxy;
- validación de variables de entorno;
- bootstrap reproducible de una base vacía;
- restricciones TypeORM alineadas con migraciones;
- scripts PowerShell de backup, restore y smoke test;
- corrección de la suite mobile;
- runbooks de seguridad, recuperación, rollback e incidentes.

## Contratos y datos afectados

- API: comportamiento HTTP 429 del login;
- PostgreSQL/PostGIS: creación de esquema, extensiones, migraciones y restore;
- autenticación: límites por IP y confianza de proxy;
- variables: `APP_TRUST_PROXY`, límites de login y confirmaciones de base;
- despliegue: variables y orden de migraciones en Render.

## Validaciones ejecutadas

| Comando o prueba | Resultado |
| ---------------- | --------- |
| `pnpm check` | 40 archivos y 274 pruebas aprobadas |
| `pnpm build` | todos los workspaces aprobados |
| `pnpm db:smoke` | bootstrap, health, HTTP 429, backup y restore aprobados sin Docker |
| enlaces de `docs/` | 0 rotos |

## Riesgos conocidos y exclusiones

- staging cloud aún no provisionado;
- verificación estricta de CA pendiente según proveedor;
- throttling en memoria mientras exista una sola instancia;
- auditoría del backup administrado por el proveedor pendiente;
- no usar Docker.

## Instrucciones al reviewer

- revisar únicamente el alcance de la Spec 003;
- no modificar archivos;
- citar archivo y línea;
- priorizar pérdida de datos, bypass de seguridad y fallos de recuperación;
- separar defectos comprobados de mejoras opcionales.
