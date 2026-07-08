---
title: Línea base de seguridad operativa
status: active
owner: mantenimiento
last_reviewed: 2026-07-08
---

# Línea base de seguridad operativa

## Implementado

- secretos JWT mínimos de 32 caracteres y rechazo de valores predecibles;
- access token corto y refresh token rotado;
- refresh tokens almacenados como hash;
- guards globales de autenticación y roles;
- CORS restringido por lista en producción;
- TLS configurable para PostgreSQL;
- `synchronize: false` en ejecución normal;
- rate limiting de login por IP;
- exportación Cost-Build protegida por API key dedicada;
- `Cache-Control: no-store` en endpoints de autenticación;
- tokens mobile en almacenamiento seguro;
- access token web solo en memoria y refresh token por sesión de pestaña.

## Rate limiting

Variables:

- `LOGIN_RATE_LIMIT_TTL_MS`;
- `LOGIN_RATE_LIMIT_MAX`;
- `LOGIN_RATE_LIMIT_BLOCK_MS`;
- `APP_TRUST_PROXY`.

La configuración inicial permite cinco intentos por minuto y bloquea cinco
minutos. El almacenamiento es en memoria: es suficiente para la instancia única
actual de Render, pero debe migrarse a almacenamiento compartido si se escala a
varias instancias.

## CORS

En producción, `CORS_ALLOWED_ORIGINS` debe contener únicamente orígenes exactos
del panel. No usar `*` con credenciales.

## TLS de base de datos

`DB_SSL=true` cifra la conexión. El Blueprint actual usa
`DB_SSL_REJECT_UNAUTHORIZED=false` por compatibilidad con el pooler. La mejora
preferida es instalar la CA correspondiente y activar verificación estricta.

## Secretos

- Render, Supabase, Vercel y Expo administran secretos fuera de Git.
- `.env` está ignorado.
- Las IAs no deben leer ni copiar secretos salvo autorización explícita.
- Rotar secretos ante exposición o cambio de responsable.
- `COST_BUILD_API_KEY` habilita lectura masiva de datos para integración
  externa; debe configurarse solo como secreto del entorno y rotarse si se
  comparte por canales no seguros.

## Permisos mínimos

- desarrollo: base aislada y datos ficticios;
- staging: credenciales propias, sin acceso a producción;
- producción: acceso limitado al mantenedor y responsables designados;
- MCP de PostgreSQL: solo lectura y nunca producción por defecto;
- cuentas compartidas: no permitidas.
