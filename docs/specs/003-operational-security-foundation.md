---
title: Fundación de seguridad operativa
status: implemented
numero: "003"
area: operations-security-database
created: 2026-06-25
approved_by: mantenedor
implemented_in: working-tree-2026-06-25
---

# Spec 003: Fundación de seguridad operativa

## Contexto

El sistema pasó de proyecto académico a aplicación mantenida para una empresa.
Necesitaba controles mínimos para calidad, autenticación, bases reproducibles,
recuperación y soporte.

## Alcance

### Incluido

- restaurar `pnpm check`;
- rate limiting del login;
- configuración explícita de proxy, CORS y TLS;
- bootstrap seguro de PostgreSQL/PostGIS vacío;
- alineación de restricciones TypeORM con migraciones;
- seed auth con metadatos completos;
- scripts de backup, restore y smoke test;
- definición de entornos, permisos y datos permitidos;
- runbooks de rollback e incidentes;
- reconciliación de Render con el comportamiento real.

### Excluido

- provisión cloud de staging;
- cambios sobre Supabase o producción;
- Docker;
- observabilidad externa;
- rate limiting distribuido para múltiples instancias.

## Requisitos

- RF-001: El repositorio debe pasar lint, tipos y pruebas.
- RF-002: El login debe bloquear intentos repetidos.
- RF-003: Una base vacía debe poder obtener el esquema actual.
- RF-004: Un backup debe poder restaurarse en una base vacía.
- RNF-001: Bootstrap y restore requieren confirmaciones explícitas.
- RNF-002: Ninguna validación debe usar producción.
- RNF-003: Los procedimientos deben funcionar sin Docker.

## Contratos afectados

Nuevas variables:

- `APP_TRUST_PROXY`;
- `LOGIN_RATE_LIMIT_TTL_MS`;
- `LOGIN_RATE_LIMIT_MAX`;
- `LOGIN_RATE_LIMIT_BLOCK_MS`;
- `ALLOW_DATABASE_BOOTSTRAP`;
- `ALLOW_DATABASE_RESTORE`;
- `ALLOW_PRODUCTION_DATABASE_RESTORE`.

## Seguridad y datos

- rate limiting por IP;
- secretos fuera de Git;
- restore bloqueado por defecto;
- bootstrap limitado a esquemas vacíos;
- staging y herramientas de IA sin acceso a producción por defecto.

## Migración y rollback

No se modifica automáticamente una base existente. El bootstrap se usa solo en
esquemas vacíos. El rate limiting puede revertirse retirando guard, módulo y
variables, aunque no se recomienda.

## Criterios de aceptación

- [x] CA-001: `pnpm check` pasa.
- [x] CA-002: `pnpm build` pasa.
- [x] CA-003: El sexto login inválido devuelve HTTP 429.
- [x] CA-004: Bootstrap y 21 migraciones pasan en PostgreSQL/PostGIS temporal.
- [x] CA-005: Auth seed pasa.
- [x] CA-006: Backup custom se verifica y restaura.
- [x] CA-007: La restauración contiene al menos 40 tablas.
- [x] CA-008: Se restauran 8 provincias y 65 distritos de Piura.
- [x] CA-009: Los artefactos temporales se eliminan.

## Pruebas

- pruebas unitarias de configuración, throttling y confirmación de bootstrap;
- `pnpm check`;
- `pnpm build`;
- `pnpm db:smoke` sin Docker.

## Impacto documental

- [x] Arquitectura y modelo de datos.
- [x] Runbooks.
- [x] Entornos y seguridad.
- [x] Registro de riesgos.
- [x] Deploy de Render.
