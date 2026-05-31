# Deploy API en Render para piloto

Esta guia deja la API `@agrogest/api` lista para publicarse en Render usando la
base PostgreSQL de Supabase que ya configuraste.

## Estado ya preparado en el repo

- `render.yaml` en la raiz con el servicio `agrogest-vsm-api`
- carga de `.env` robusta aunque arranques desde la raiz del monorepo
- compatibilidad con `PORT` de Render
- health check en `/health`
- hook inicial para ejecutar `seed-auth` una sola vez despues del primer deploy

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
- `DB_HOST=aws-1-us-east-1.pooler.supabase.com`
- `DB_PORT=5432`
- `DB_NAME=postgres`
- `DB_USER=postgres.pdppvazosimktbwiyuus`
- `DB_SCHEMA=public`
- `DB_SSL=true`
- `JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET` se generan automaticamente

## Que pasa en el primer deploy

1. Render instala dependencias del monorepo.
2. Compila solo `@agrogest/api`.
3. Arranca con `node apps/api/dist/main.js`.
4. Ejecuta una sola vez `node apps/api/dist/scripts/seed-auth.js`.

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
node apps/api/dist/main.js
```

- Health check path:

```text
/health
```

Variables requeridas:

```env
NODE_ENV=production
APP_HOST=0.0.0.0
CORS_ALLOWED_ORIGINS=https://tu-admin-web.vercel.app
DB_HOST=aws-1-us-east-1.pooler.supabase.com
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres.pdppvazosimktbwiyuus
DB_PASSWORD=tu_password_supabase
DB_SCHEMA=public
DB_SSL=true
JWT_ACCESS_SECRET=<secreto_largo>
JWT_ACCESS_EXPIRES_IN=1h
JWT_REFRESH_SECRET=<otro_secreto_largo>
JWT_REFRESH_EXPIRES_IN=7d
SEED_ADMIN_FIRST_NAME=Admin
SEED_ADMIN_LAST_NAME=VSM
SEED_ADMIN_EMAIL=admin@agrogestvsm.local
SEED_ADMIN_PASSWORD=<password_admin>
```

## Limitaciones del plan free

- el servicio se duerme tras inactividad y tarda en volver
- no tienes shell ni one-off jobs en free
- por eso se dejo `initialDeployHook` para sembrar auth en el primer deploy

## Siguiente paso recomendado

Cuando la API ya este arriba:

1. despliega `apps/admin-web`
2. configura `NEXT_PUBLIC_API_URL` con la URL publica de Render
3. actualiza `CORS_ALLOWED_ORIGINS` en Render con esa URL exacta
