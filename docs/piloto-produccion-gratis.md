# Piloto en produccion con servicios gratuitos

Esta guia documenta una ruta pragmatica para levantar un piloto de AgroGest VSM sin costo inicial, considerando:

- Base de datos PostgreSQL ya existente en Supabase.
- API NestJS en Render.
- Web administrativa Next.js en Vercel.
- Aplicativo movil Expo como APK instalable.

> Nota al 29 de mayo de 2026: los planes gratuitos pueden cambiar. Antes de usar esta guia para una demo formal, revisar las cuotas actuales de Render, Vercel, Supabase y Expo.

## Objetivo del piloto

El objetivo no es dejar una infraestructura final de alta disponibilidad. El objetivo es validar que el flujo completo funcione con usuarios reales o datos de prueba:

1. Login desde la web.
2. Consumo del API publicado.
3. Persistencia en Supabase.
4. Uso del panel administrativo en Vercel.
5. Instalacion del APK en telefonos Android.
6. Verificacion de operaciones principales: mantenimiento, parcelas, geodatos y visitas.

## Arquitectura recomendada

```text
Usuario web
  -> Vercel: apps/admin-web
    -> Render: apps/api
      -> Supabase PostgreSQL

Usuario movil Android
  -> APK Expo: apps/mobile
    -> Render: apps/api
      -> Supabase PostgreSQL
```

Para piloto, esta separacion es suficiente. Supabase administra la base de datos, Render expone el backend, Vercel sirve el frontend y Expo/EAS genera el APK.

## Limitaciones importantes del modo gratuito

Render Free puede dormir el servicio despues de inactividad. Esto significa que el primer login o primera peticion puede tardar hasta cerca de un minuto mientras el servicio vuelve a arrancar.

Vercel Hobby es valido para proyectos personales, pruebas y pequenos pilotos. No debe asumirse como plan definitivo para uso comercial o produccion con clientes.

Expo EAS permite crear builds con una cuenta gratuita, pero las colas y limites pueden variar. Para distribuir en Google Play se requiere cuenta de desarrollador de Google Play, que no es gratuita. Para el piloto se recomienda distribuir el APK directamente.

## Pre-requisitos

- Repositorio subido a GitHub, GitLab o Bitbucket.
- Supabase PostgreSQL funcionando.
- Password de la base de datos de Supabase.
- Cuenta gratuita en Render.
- Cuenta gratuita en Vercel.
- Cuenta gratuita en Expo.
- Node.js 20 o superior.
- pnpm 9 o superior.

Antes de desplegar, validar localmente:

```bash
pnpm install
pnpm --filter @agrogest/api typecheck
pnpm --filter @agrogest/api build
pnpm --filter @agrogest/admin-web typecheck
pnpm --filter @agrogest/admin-web build
pnpm --filter @agrogest/mobile typecheck
```

## Paso 1: Base de datos en Supabase

La base de datos ya esta en Supabase, por lo que aqui solo se debe confirmar la conexion:

- Host del pooler de Supabase.
- Puerto `5432`.
- Base de datos `postgres`, si se usa la base por defecto.
- Usuario tipo `postgres.<project-ref>`.
- Password de Supabase.
- SSL habilitado.
- Schema `public`, salvo que se haya decidido otro.

Variables esperadas por el API:

```env
DB_HOST=aws-1-us-east-1.pooler.supabase.com
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres.<project-ref>
DB_PASSWORD=<password_supabase>
DB_SCHEMA=public
DB_SSL=true
```

Recomendacion para piloto: usar el pooler de Supabase en lugar de conexiones directas si el backend esta en Render Free, porque ayuda a evitar exceso de conexiones.

## Paso 2: API en Render

Ya existe una guia especifica para esta parte:

- `docs/deploy-api-render.md`
- `render.yaml`

Ruta recomendada:

1. Entrar a Render.
2. Crear un `Blueprint`.
3. Conectar el repositorio.
4. Render detectara `render.yaml`.
5. Completar secretos:
   - `DB_PASSWORD`
   - `CORS_ALLOWED_ORIGINS`
   - `SEED_ADMIN_PASSWORD`
6. Crear el servicio.

El Blueprint actual compila el API con:

```bash
corepack enable && pnpm install --frozen-lockfile && pnpm --filter @agrogest/api build
```

Y arranca con:

```bash
node apps/api/dist/main.js
```

Variables minimas del API:

```env
NODE_ENV=production
APP_HOST=0.0.0.0
CORS_ALLOWED_ORIGINS=https://tu-admin-web.vercel.app
DB_HOST=aws-1-us-east-1.pooler.supabase.com
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres.<project-ref>
DB_PASSWORD=<password_supabase>
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

Verificacion despues del deploy:

```text
https://<servicio-render>.onrender.com/health
```

Debe responder estado correcto. Luego probar login desde un cliente HTTP:

```text
POST https://<servicio-render>.onrender.com/auth/login
```

Credenciales del piloto, si se mantiene el seed actual:

```text
email: admin@agrogestvsm.local
password: <SEED_ADMIN_PASSWORD configurado en Render>
```

## Paso 3: Web administrativa en Vercel

La web esta en:

```text
apps/admin-web
```

Variable requerida:

```env
NEXT_PUBLIC_API_URL=https://<servicio-render>.onrender.com
```

Configuracion recomendada en Vercel:

- Framework: `Next.js`.
- Project / Root Directory: `apps/admin-web`.
- Install Command: dejar automatico si Vercel detecta correctamente pnpm; si falla, usar `corepack enable && pnpm install --frozen-lockfile`.
- Build Command: `pnpm build`.
- Output Directory: automatico para Next.js.
- Environment Variable:
  - `NEXT_PUBLIC_API_URL=https://<servicio-render>.onrender.com`

Si Vercel no resuelve correctamente el monorepo con `Root Directory=apps/admin-web`, usar esta alternativa:

- Root Directory: raiz del repositorio.
- Build Command: `pnpm --filter @agrogest/admin-web build`.
- Install Command: `corepack enable && pnpm install --frozen-lockfile`.
- Output Directory: `apps/admin-web/.next`.

Despues de publicar la web, volver a Render y actualizar:

```env
CORS_ALLOWED_ORIGINS=https://<tu-admin-web>.vercel.app
```

Si se usa dominio personalizado, agregar tambien ese origen exacto:

```env
CORS_ALLOWED_ORIGINS=https://<tu-admin-web>.vercel.app,https://admin.tudominio.com
```

No agregar `/` final en los origenes CORS.

## Paso 4: APK del aplicativo movil

La app movil esta en:

```text
apps/mobile
```

El cliente movil usa:

```env
EXPO_PUBLIC_API_URL=https://<servicio-render>.onrender.com
```

Para piloto, la opcion mas simple es generar un APK de preview con Expo EAS. Esto permite instalarlo directamente en un dispositivo Android sin publicar en Google Play.

Desde la carpeta del proyecto movil:

```bash
cd apps/mobile
npx eas-cli@latest login
npx eas-cli@latest build:configure
```

Si el comando crea `eas.json`, configurar un perfil de preview para APK:

```json
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      },
      "env": {
        "EXPO_PUBLIC_API_URL": "https://<servicio-render>.onrender.com"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
```

Generar el APK:

```bash
npx eas-cli@latest build --platform android --profile preview
```

Al terminar, Expo entregara un enlace de descarga. Descargar el APK e instalarlo en el telefono Android.

Si Android bloquea la instalacion, habilitar instalacion desde origenes desconocidos solo para la app usada para abrir el APK. Para piloto interno esto es aceptable; para usuarios finales conviene publicar en Google Play.

## Paso 5: Orden correcto de despliegue

1. Confirmar Supabase.
2. Publicar API en Render.
3. Probar `/health`.
4. Publicar web en Vercel apuntando a Render.
5. Actualizar CORS en Render con la URL final de Vercel.
6. Probar login web.
7. Generar APK con `EXPO_PUBLIC_API_URL` apuntando a Render.
8. Instalar APK y probar login movil.

## Checklist de validacion del piloto

- API responde `/health`.
- API puede conectarse a Supabase.
- Seed admin creado correctamente.
- Login web funciona.
- Login movil funciona.
- CORS permite solo la URL de Vercel.
- Mantenimientos cargan datos.
- Parcelas cargan datos.
- Editor de geodatos guarda punto y poligono.
- Validaciones de geodatos funcionan en frontend y backend.
- APK usa la URL publica del API, no `localhost`.
- Primer request lento en Render Free esta identificado como comportamiento esperado.

## Problemas comunes

### Login falla con `Failed to fetch`

Revisar:

- `NEXT_PUBLIC_API_URL` en Vercel.
- `EXPO_PUBLIC_API_URL` en el build del APK.
- `CORS_ALLOWED_ORIGINS` en Render.
- Que la API de Render este despierta.
- Que `/health` responda.

### Render no conecta con Supabase

Revisar:

- `DB_HOST`.
- `DB_USER`.
- `DB_PASSWORD`.
- `DB_SSL=true`.
- Que se este usando el pooler correcto.

### La web funciona local pero no en Vercel

Revisar:

- Variable `NEXT_PUBLIC_API_URL` configurada antes del build.
- Redeploy despues de cambiar variables.
- Build command correcto para monorepo.

### El APK apunta a localhost

Eso pasa si el build se genero sin `EXPO_PUBLIC_API_URL`. Corregir `eas.json` o la variable en EAS y generar otro build.

## Recomendacion de seguridad para piloto

Aunque sea gratis, no usar contrasenas debiles ni secretos de ejemplo:

- Cambiar `SEED_ADMIN_PASSWORD`.
- Usar secretos JWT largos.
- No subir `.env` reales al repositorio.
- No usar `CORS_ALLOWED_ORIGINS=*`.
- Mantener credenciales de Supabase solo en Render.

## Cuando pasar a una produccion real

Este esquema sirve para piloto. Para produccion real conviene evaluar:

- Plan pagado de Render o mover el API a una plataforma sin cold start.
- Backups y politicas de recuperacion en Supabase.
- Dominio propio y HTTPS estable.
- Observabilidad de errores.
- Logs persistentes.
- Publicacion formal del app en Google Play.
- Control de versiones y ambiente separado para staging.

## Referencias consultadas

- Render Free: https://render-web.onrender.com/docs/free
- Vercel Hobby Plan: https://vercel.com/docs/plans/hobby
- Expo EAS Build: https://docs.expo.dev/build/setup/
- Expo Distribution: https://docs.expo.dev/distribution/introduction/
