---
title: Gates de calidad y CI
status: active
owner: mantenimiento
last_reviewed: 2026-06-26
---

# Gates de calidad y CI

## Objetivo

Hacer que cada cambio importante sea verificable antes de commit, pull request o
release, sin depender de Docker ni de infraestructura local compleja.

## Gate local mínimo

Ejecutar antes de pedir revisión:

```bash
pnpm check
```

Este comando cubre:

- lint;
- typecheck;
- pruebas unitarias e integración API crítica;
- validación documental.

Para cambios de mayor riesgo ejecutar además:

```bash
pnpm test:coverage
pnpm build
```

## Gate CI

El workflow `.github/workflows/ci.yml` corre en `master`, `main` y `develop`:

1. instalación reproducible con `pnpm install --frozen-lockfile`;
2. validación documental;
3. lint, tipos y pruebas;
4. cobertura con umbrales graduales;
5. build de API, mobile, admin web y paquetes;
6. E2E automático del guard de autenticación del panel.

La rama utilizada actualmente es `master`; por eso debe estar incluida en el
CI y en la protección de ramas.

## Cobertura

La cobertura usa Vitest con provider `v8` y umbrales iniciales bajos. La regla
es subir umbrales cuando exista evidencia, no imponer porcentajes altos sin
valor.

Prioridad de cobertura:

- autenticación y refresh token;
- sync mobile, outbox y migraciones SQLite;
- migraciones y bootstrap backend;
- geodatos de parcelas;
- reglas de negocio de visitas y recetas;
- contratos compartidos entre apps.

## Integración API

`pnpm test:integration:api` ejecuta pruebas HTTP sobre controladores Nest reales
con Fastify, validación global, pipes y filtro de errores. No usa Docker ni una
base de datos obligatoria en CI.

La suite cubre actualmente:

- normalización y validación del login;
- envelope estándar de errores;
- conflicto de geodatos de parcelas;
- contrato de idempotencia `publicId` para visitas creadas desde mobile/sync;
- validación de IDs con `ParseEntityIdPipe`;
- reglas de enums y payload anidado en recetas de visita.

Los tests con PostgreSQL real quedan como gate manual/operativo mediante
`pnpm db:smoke`, porque requieren una base local o staging autorizada y no deben
apuntar a producción.

## E2E del panel

Hay dos niveles:

- `pnpm --filter @agrogest/admin-web e2e:ci`: automático, no requiere API ni
  base de datos; verifica que `/dashboard` redirige a `/login`.
- `pnpm --filter @agrogest/admin-web e2e:full`: manual, requiere stack local o
  staging con datos semilla y credenciales E2E.

Para ejecutar el E2E full-stack contra staging:

```bash
PLAYWRIGHT_SKIP_WEBSERVER=true \
PLAYWRIGHT_BASE_URL=https://admin-staging.example.com \
E2E_ADMIN_EMAIL=usuario-e2e@example.com \
E2E_ADMIN_PASSWORD=*** \
pnpm --filter @agrogest/admin-web e2e:full
```

No registrar credenciales reales en Git ni en documentación.

## Validación documental

```bash
pnpm docs:check
```

Comprueba:

- frontmatter mínimo en documentos activos;
- enlaces relativos rotos;
- documentos permanentes enlazados desde `docs/index.md`;
- specs numeradas correctamente;
- specs implementadas con `implemented_in` e impacto documental;
- ausencia de `specs/` en la raíz.

## Protección de ramas

Configurar en GitHub para las ramas usadas realmente, empezando por `master`:

- requerir pull request antes de merge;
- requerir workflow `Quality gate`;
- bloquear push directo si el equipo crece;
- requerir branch actualizado antes de merge cuando GitHub lo permita;
- restringir bypass a responsables explícitos;
- no permitir force push ni borrado de rama.

Mientras el mantenimiento lo haga una sola persona, se permite commit directo
solo con validación local equivalente y autorización humana explícita.

Verificación auditable:

```bash
pnpm quality:branch-protection
```

Este comando usa GitHub CLI (`gh`) para comprobar que `master` tiene protección
activa y exige el status check `Quality gate`. Si `gh` no está instalado,
autenticado o la rama no está protegida, el comando falla con una acción
explícita. La activación de la protección sigue siendo una configuración humana
en GitHub.
