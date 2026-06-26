---
title: Deploy API en Render
status: active
owner: mantenimiento
last_reviewed: 2026-06-26
---

# Deploy API en Render para piloto

Esta guia deja la API `@agrogest/api` lista para publicarse en Render usando la
base PostgreSQL de Supabase que ya configuraste.

## Estado ya preparado en el repo

- `render.yaml` en la raiz con el servicio `agrogest-vsm-api`
- carga de `.env` robusta aunque arranques desde la raiz del monorepo
- compatibilidad con `PORT` de Render
- health check en `/health`
- logs JSON estructurados con `pino`
- migraciones ejecutadas antes de iniciar cada release
- hook inicial para ejecutar `seed-auth` una sola vez despues del primer deploy
- rate limiting de login y soporte de IP real detrás del proxy

## Antes de desplegar

1. Sube este repo a GitHub, GitLab o Bitbucket.
2. Verifica que el branch a desplegar tenga estos archivos:
   - `render.yaml`
   - `apps/api`
   - `packages/*`
3. Ten a mano estos valores:
   - `DB_PASSWORD` de Supabase
   - `CORS_ALLOWED_ORIGINS` del panel web
   - `SEED_ADMIN_PASSWORD` para el usuario admin inicial

La base debe tener el esquema existente o haber sido preparada previamente con
[el runbook de bootstrap](database-bootstrap.md). El servicio no ejecuta el
bootstrap destructivo durante el arranque.

## Opcion recomendada: usar el Blueprint del repo

1. Entra a Render.
2. Ve a `New` -> `Blueprint`.
3. Conecta el repositorio.
4. Render detectara `render.yaml`.
5. Revisa el servicio `agrogest-vsm-api`.
6. Confirma la region `virginia`.
   Esta region se dejo asi porque tu pooler actual de Supabase esta en `us-east-1`.
7. Completa los valores que Render te pedira porque estan marcados como secretos:
   - `CORS_ALLOWED_ORIGINS`
   - `DB_PASSWORD`
   - `SEED_ADMIN_PASSWORD`
8. Crea el servicio.

## Variables importantes que ya quedaron definidas en el Blueprint

- `NODE_ENV=production`
- `APP_HOST=0.0.0.0`
- `APP_TRUST_PROXY=true`
- `LOG_LEVEL=info`
- `DB_HOST=aws-1-us-east-1.pooler.supabase.com`
- `DB_PORT=5432`
- `DB_NAME=postgres`
- `DB_USER=postgres.pdppvazosimktbwiyuus`
- `DB_SCHEMA=public`
- `DB_SSL=true`
- `DB_SSL_REJECT_UNAUTHORIZED=false`
- `JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET` se generan automaticamente
- límite de login: 5 intentos por minuto y bloqueo de 5 minutos

## Que pasa en el primer deploy

1. Render instala dependencias del monorepo.
2. Compila solo `@agrogest/api`.
3. El hook inicial ejecuta una sola vez
   `node apps/api/dist/scripts/seed-auth.js`.
4. Cada arranque ejecuta `node apps/api/dist/scripts/migrate-database.js`.
5. Si las migraciones terminan correctamente, inicia
   `node apps/api/dist/main.js`.

Ese seed:

- crea roles base si faltan
- crea el usuario admin si no existe
- asigna el rol `ADMIN` al usuario configurado en `SEED_ADMIN_EMAIL`

## Verificacion despues del deploy

1. Abre la URL publica de Render:
   - `https://<tu-servicio>.onrender.com/health`
2. Debe responder un JSON con `"status": "ok"`.
3. Luego prueba login contra:
   - `POST https://<tu-servicio>.onrender.com/auth/login`

## Si prefieres crear el servicio manualmente

Usa estos valores en Render:

- Service type: `Web Service`
- Runtime: `Node`
- Region: `Virginia`
- Instance type: `Free`
- Build command:

```bash
corepack enable && pnpm install --frozen-lockfile --prod=false && pnpm --filter @agrogest/api build
```

- Start command:

```bash
node apps/api/dist/scripts/migrate-database.js && node apps/api/dist/main.js
```

- Health check path:

```text
/health
```

Variables requeridas:

```env
NODE_ENV=production
APP_HOST=0.0.0.0
APP_TRUST_PROXY=true
LOG_LEVEL=info
CORS_ALLOWED_ORIGINS=https://tu-admin-web.vercel.app
DB_HOST=aws-1-us-east-1.pooler.supabase.com
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres.pdppvazosimktbwiyuus
DB_PASSWORD=tu_password_supabase
DB_SCHEMA=public
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=false
JWT_ACCESS_SECRET=<secreto_largo>
JWT_ACCESS_EXPIRES_IN=1h
JWT_REFRESH_SECRET=<otro_secreto_largo>
JWT_REFRESH_EXPIRES_IN=30d
LOGIN_RATE_LIMIT_TTL_MS=60000
LOGIN_RATE_LIMIT_MAX=5
LOGIN_RATE_LIMIT_BLOCK_MS=300000
SEED_ADMIN_FIRST_NAME=Admin
SEED_ADMIN_LAST_NAME=VSM
SEED_ADMIN_EMAIL=admin@agrogestvsm.local
SEED_ADMIN_PASSWORD=<password_admin>
```

## Limitaciones del plan free

- el servicio se duerme tras inactividad y tarda en volver
- no tienes shell ni one-off jobs en free
- por eso se dejo `initialDeployHook` para sembrar auth en el primer deploy

El rate limiting usa memoria local. Si el servicio se escala a varias
instancias, se debe usar almacenamiento compartido.

## Verificación y rollback

Después de cada deploy:

1. comprobar `/health` y `/health/db`;
2. probar login válido;
3. verificar que intentos repetidos produzcan HTTP 429;
4. revisar catálogos, parcelas y visitas;
5. confirmar el panel desde el origen permitido.

Si falla, seguir [el runbook de rollback](rollback.md). Si el release cambia
datos, confirmar primero la compatibilidad de la migración.

## TLS

El Blueprint mantiene cifrado con `DB_SSL=true`, pero actualmente desactiva la
verificación de CA para el pooler. La configuración objetivo es cargar la CA de
Supabase y usar `DB_SSL_REJECT_UNAUTHORIZED=true`.

## Siguiente paso recomendado

Cuando la API ya este arriba:

1. despliega `apps/admin-web`
2. configura `NEXT_PUBLIC_API_URL` con la URL publica de Render
3. actualiza `CORS_ALLOWED_ORIGINS` en Render con esa URL exacta
