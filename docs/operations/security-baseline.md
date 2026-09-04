---
title: Línea base de seguridad operativa
status: active
owner: mantenimiento
last_reviewed: 2026-09-04
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
- `ANALISTA` puede mutar únicamente los endpoints de Mantenimiento marcados con
  rol explícito y `AllowAnalystMutation`; el bloqueo global continúa para las
  demás mutaciones y mobile rechaza sesiones con ese rol;
- el selector web de agrónomos para parcelas consume el lookup mínimo
  `/usuarios/agronomos`; el listado administrativo de usuarios permanece
  exclusivo de `ADMIN`;

- aislamiento horizontal de parcelas para `AGRONOMO`: listados, lectura y
  mutaciones por ID se limitan a `agronomo_usuario_id` y una visita nueva exige
  una parcela activa asignada al usuario autenticado;
- catalogos SQLite de productores y parcelas aislados por el usuario de la
  sesion, sin reutilizar como visibles los datos descargados por otra cuenta.
- outbox y fallos mobile particionados por usuario; un cambio de cuenta no
  intenta publicar pendientes anteriores con el token nuevo;
- borradores de formularios de visita particionados por `publicId`; otra cuenta
  del dispositivo no puede leer, sobrescribir ni eliminar su contenido;
- alta y movimiento de parcelas por `AGRONOMO` limitados a productores creados
  por el usuario o que ya tengan una parcela asignada a el.
- endpoints de productor por ID (detalle, resumen, estructura, historial,
  actualizacion y desactivacion) ocultan productores ajenos y filtran parcelas,
  sectores y visitas por el agronomo autenticado;
- la reconciliacion de filas `pending` sin outbox solo reconstruye operaciones
  cuya pertenencia a la sesion puede demostrarse por propietario de catalogo o
  por la visita raiz; no reasigna catalogos globales huerfanos entre cuentas.
- la baja logica de ingredientes activos, marcas y fertilizantes exige rol
  `ADMIN`; el agronomo puede recuperar o descartar solamente altas locales no
  confirmadas que aparecen en los fallos de su sesion.
- la baja logica de visitas exige `ADMIN` o un `AGRONOMO` con permiso individual
  `puede_eliminar_visitas`; el agronomo solo puede afectar visitas propias y la
  API consulta el permiso persistido en cada solicitud;
- mobile usa el permiso cacheado solo para visibilidad y borradores offline;
  una visita sincronizada se conserva localmente hasta recibir confirmacion de
  la API, por lo que una revocacion o un fallo de red no causa perdida local.

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
- `WEATHERLINK_API_KEY` y `WEATHERLINK_API_SECRET` se configuran exclusivamente
  como secretos de Render. El navegador no los recibe y los errores persistidos
  no incluyen URLs, headers ni payloads del proveedor. El Secret debe rotarse
  ante cualquier exposicion.

## Permisos mínimos

- desarrollo: base aislada y datos ficticios;
- staging: credenciales propias, sin acceso a producción;
- producción: acceso limitado al mantenedor y responsables designados;
- MCP de PostgreSQL: solo lectura y nunca producción por defecto;
- cuentas compartidas: no permitidas.
