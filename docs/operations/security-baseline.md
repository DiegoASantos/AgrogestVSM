---
title: Línea base de seguridad operativa
status: active
owner: mantenimiento
last_reviewed: 2026-10-07
---

# Línea base de seguridad operativa

## Implementado

- secretos JWT mínimos de 32 caracteres y rechazo de valores predecibles;
- access token de 15 minutos y refresh token rotado con limite fijo de 150 dias
  desde cada login; las rotaciones no extienden `expires_at` y los tokens nuevos
  se acortan al aproximarse al limite;
- refresh tokens almacenados como hash;
- guards globales de autenticación y roles;
- CORS restringido por lista en producción;
- TLS configurable para PostgreSQL;
- `synchronize: false` en ejecución normal;
- rate limiting de login por IP;
- exportación Cost-Build protegida por API key dedicada;
- `Cache-Control: no-store` en endpoints de autenticación;
- tokens mobile en almacenamiento seguro;
- mobile conserva acceso a datos locales hasta `sessionExpiresAt` aun sin red;
  la desactivacion de una cuenta se aplica al volver a consultar la API;
- access token web solo en memoria y refresh token por sesión de pestaña.
- `ANALISTA` puede mutar únicamente los endpoints de Mantenimiento marcados con
  rol explícito y `AllowAnalystMutation`; el bloqueo global continúa para las
  demás mutaciones y mobile rechaza sesiones con ese rol;
- el selector web de agrónomos para parcelas consume el lookup mínimo
  `/usuarios/agronomos`; el listado administrativo de usuarios permanece
  exclusivo de `ADMIN`;
- el importador web de coordenadas de Google Maps procesa únicamente URLs
  completas mediante una lista cerrada de hosts y patrones; nunca navega,
  resuelve enlaces cortos, registra ni envía la URL. Solo el GeoJSON extraído
  participa en el guardado explícito de la parcela;
- `GET /reportes/visitas` exige `ADMIN` o `ANALISTA`, devuelve solo identidad
  visible del ingeniero y agregados operativos, valida el rango inclusivo y
  parametriza fechas e identificadores; no habilita acceso a `AGRONOMO`;
- `GET /reportes/estimaciones` exige `ADMIN` o `ANALISTA`, valida y normaliza el
  rango a semanas completas, parametriza el filtro opcional de agrónomo y
  devuelve únicamente fechas, número de semana y agregados de visitas; excluye
  estimaciones y visitas inactivas y no habilita acceso a `AGRONOMO`;
- `GET /reportes/parcelas` exige `ADMIN` o `ANALISTA`, valida y parametriza los
  filtros temporales, territoriales y de estado, y limita la respuesta a
  identificadores y nombres operativos, área, estado y geodatos necesarios para
  el reporte; no expone datos de contacto ni habilita acceso a `AGRONOMO`;
- `GET /reportes/campos-por-etapas` exige `ADMIN` o `ANALISTA`, valida y
  parametriza el rango inclusivo junto con ingeniero y productor, y no habilita
  acceso a `AGRONOMO`;
- `GET` y `PUT /estimaciones/semanas/:fecha` exigen `ADMIN` o `ANALISTA`; el
  `PUT` declara `AllowAnalystMutation`, toma el autor exclusivamente del JWT y
  vuelve a comprobar en base de datos que el actor esté activo y que cada
  destinatario sea un usuario activo con rol `AGRONOMO`;
- la respuesta de Estimaciones limita la identidad a nombre visible y estado;
  no expone correo ni teléfono, y el lote rechaza IDs duplicados o cantidades
  inválidas antes de persistir parcialmente;

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
- `POST /comercial/pagos-cosecha`, `POST /comercial/acreedores-cosecha`,
  `GET /comercial/productores/:productorId/acreedores-cosecha` y
  `POST /comercial/registros-cosecha` exigen `ADMIN` o `AGRONOMO`; cada acceso
  vuelve a autorizar el productor y el registro exige un acreedor de ese mismo
  productor en estado `APPROVED`. Documento y cuenta no se registran en logs ni
  errores.
- `POST /comercial/productores/:productorId/acceso-acreedores` exige `ADMIN` o
  `AGRONOMO` y autorización horizontal. El código aleatorio dura 180 días, se
  guarda solo como hash y la reemisión revoca el anterior. La sesión derivada
  dura 30 minutos y se revalida contra la invitación en cada llamada.
- las rutas públicas `/comercial/productor/*` restringen lectura y escritura
  al productor del código. El intercambio tiene límite de intentos por IP y
  hash de código. `ADMIN` y `ANALISTA` acceden a la revisión bancaria mediante
  guards; solo sus acciones de aprobación u observación admiten mutación del
  analista. Las respuestas bancarias y de credenciales usan `no-store`.
- acreedores y registros locales se aíslan por `owner_user_id` en la tabla,
  reconciliación, outbox y fallos; la cache descargada además se filtra por
  visibilidad de sesión. SQLite no cifra documento ni cuenta; el riesgo y su
  condición de revisión constan en R-037.

## Rate limiting

Variables:

- `LOGIN_RATE_LIMIT_TTL_MS`;
- `LOGIN_RATE_LIMIT_MAX`;
- `LOGIN_RATE_LIMIT_BLOCK_MS`;
- `APP_TRUST_PROXY`.

La configuración inicial permite cinco intentos por minuto y bloquea cinco
minutos. El almacenamiento es en memoria: es suficiente para la instancia única
de API desplegada con Docker Compose, pero debe migrarse a almacenamiento
compartido si se escala a varias instancias.

## CORS

En producción, `CORS_ALLOWED_ORIGINS` debe contener únicamente orígenes exactos
del panel. No usar `*` con credenciales.

El proxy `/api/*` del panel IDL usa un destino interno fijo y sustituye las
cabeceras de IP reenviada del cliente por la dirección de su socket antes de
contactar la API. Esto evita que una cabecera falsificada atraviese el panel
hacia el limitador de intentos de login. La exposición directa de la API sigue
requiriendo su propia configuración de proxy y controles de red.

## Red de base de datos

En producción, API y PostgreSQL/PostGIS se comunican por la red privada de
Docker Compose. El archivo `docker-compose.yml` también publica PostgreSQL en
`172.16.0.8:5440`; el firewall del servidor debe limitar ese puerto a los
equipos que realmente lo necesiten y nunca exponerlo a Internet. Si se habilitan
conexiones fuera del host o de la red privada, configurar TLS y verificación de
certificado antes de permitirlas.

## Secretos

- Los secretos de API y base se guardan en `apps/api/.env` en el servidor
  Ubuntu; el archivo está ignorado por Git y debe tener permisos de lectura
  limitados al usuario de despliegue.
- Expo/EAS conserva sus variables de build en la configuración de EAS; las
  claves privadas no se incluyen en el código fuente.
- Las IAs no deben leer ni copiar secretos salvo autorización explícita.
- Rotar secretos ante exposición o cambio de responsable.
- `COST_BUILD_API_KEY` habilita lectura masiva de datos para integración
  externa; debe configurarse solo como secreto del entorno y rotarse si se
  comparte por canales no seguros.
- `WEATHERLINK_API_KEY` y `WEATHERLINK_API_SECRET` se configuran únicamente en
  el archivo de entorno protegido del servidor. El navegador no los recibe y
  los errores persistidos no incluyen URLs, headers ni payloads del proveedor.
  El secreto debe rotarse ante cualquier exposición.

## Permisos mínimos

- desarrollo: base aislada y datos ficticios;
- staging: credenciales propias, sin acceso a producción;
- producción: acceso limitado al mantenedor y responsables designados;
- MCP de PostgreSQL: solo lectura y nunca producción por defecto;
- cuentas compartidas: no permitidas.
