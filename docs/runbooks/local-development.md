---
title: Desarrollo local
status: active
owner: mantenimiento
last_reviewed: 2026-07-05
---

# Desarrollo local

## Requisitos

- Node.js 20 o superior;
- pnpm 9;
- PostgreSQL con PostGIS;
- entorno Expo para mobile.

## Instalación

```bash
pnpm install
```

Crear:

- `apps/api/.env` desde `apps/api/.env.example`;
- `apps/mobile/.env` desde `apps/mobile/.env.example`;
- configuración `NEXT_PUBLIC_API_URL` para admin web cuando corresponda.

No versionar secretos.

## Inicio

Todo el monorepo:

```bash
pnpm dev
```

Por aplicación:

```bash
pnpm --filter @agrogest/api dev
pnpm --filter @agrogest/admin-web dev
pnpm --filter @agrogest/mobile dev
```

## Calidad

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm check
pnpm build
```

Existe un fallo conocido en una suite mobile que impide completar
`pnpm check`. Consultar [registro de riesgos](../operations/risk-register.md).

## Base de datos

```bash
pnpm --filter @agrogest/api build
pnpm --filter @agrogest/api migrate
pnpm --filter @agrogest/api seed:auth
```

Advertencia: las migraciones actuales presuponen parte del esquema inicial. No
usar este procedimiento sobre una base vacía hasta resolver el riesgo R-001.

## Diagnostico de sync mobile

El estado adaptativo del sync mobile se guarda en la tabla SQLite `sync_state`.
Para diagnosticar redes inestables, revisar:

- `window_json`: ultimos intentos y resultado de exito/fallo;
- `consecutive_failures` y `consecutive_successes`: recuperacion o degradacion
  reciente;
- `backoff_step`: posicion actual del backoff automatico;
- `last_attempt_at`: ultimo intento que realmente proceso el outbox.

La tabla es local y no afecta contratos API. Si se deshabilita el gestor
adaptativo por rollback, puede permanecer sin ser consultada.
