---
title: Sesión fija de 150 días
status: implemented
numero: 087
area: API y mobile, autenticación
created: 2026-09-30
approved_by: Usuario, al solicitar «Implement the plan» el 2026-09-30
implemented_in: apps/api/src/modules/auth; apps/mobile/src/modules/auth; docker-compose.yml; apps/api/.env.example; JWT expiry configuration regression fix, 2026-10-01
---

# Spec 087: Sesión fija de 150 días

## Contexto

El usuario móvil debe poder volver a abrir la app, incluso sin red, durante 150 días desde su login sin volver a escribir credenciales. La API emite un access token corto y rota el refresh token; hoy cada rotación amplía el vencimiento del refresh y mobile limita la sesión local a 30 días. El valor predeterminado del refresh es 30 días, aunque cada entorno puede sobrescribirlo.

## Alcance

### Incluido

- Plazo máximo fijo de 150 días desde cada login para las sesiones emitidas por el API, incluido el panel web.
- Access token de 15 minutos, refresh rotado sin ampliar el plazo original y sesión mobile offline hasta ese mismo plazo.
- Fecha absoluta de vencimiento en las respuestas de login y refresh.
- Configuración y documentación de los entornos que emiten tokens.

### Excluido

- Cambios al rate limit de login, guards de roles o credenciales.
- Migración o extensión retroactiva de sesiones existentes.
- Cambios de esquema PostgreSQL o SQLite.

## Requisitos

- RF-001: El login fija `sessionExpiresAt` a 150 días desde su emisión. El registro de refresh conserva ese `expires_at` durante todas las rotaciones.
- RF-002: Access y refresh emitidos tras una rotación no vencen después del límite original. En el límite, la API exige un nuevo login.
- RF-003: Login y refresh devuelven `sessionExpiresAt` en formato ISO 8601; `expiresIn` y `refreshExpiresIn` reflejan el tiempo efectivo del token emitido.
- RF-004: Mobile usa `sessionExpiresAt` como límite de restauración local, no lo amplía al renovar y permite abrir datos locales sin red antes de ese límite.
- RF-005: Mobile acepta temporalmente respuestas de un API anterior sin `sessionExpiresAt` usando su política local anterior de 30 días durante el despliegue gradual.
- RNF-001: Se preservan la rotación, el hash y la revocación de refresh tokens, la validación de usuarios activos y el rate limit existente.

## Contratos afectados

- `POST /auth/login` y `POST /auth/refresh`: campo aditivo `sessionExpiresAt: string` en `data`. `refreshExpiresIn` comunica el plazo restante tras cada rotación.
- Mobile acepta el campo como opcional mientras convivan versiones de API; el panel web puede ignorarlo.
- `JWT_ACCESS_EXPIRES_IN=15m` y `JWT_REFRESH_EXPIRES_IN=150d` para nuevos tokens.
- Las tablas y los payloads de salida existentes conservan sus otros campos.

## Seguridad y datos

- Un dispositivo desconectado con sesión ya iniciada podrá mostrar sus datos locales hasta el día 150 aunque la cuenta sea desactivada en el servidor. El servidor rechazará la siguiente operación online de esa cuenta.
- El refresh de 150 días sigue almacenado como hash, rota en cada uso y puede revocarse. El access conserva vida corta.
- No registrar JWT, credenciales, identificadores personales ni valores de secretos. Verificar solo nombres y plazos de variables operativas.

## Migración y rollback

- Desplegar API antes de mobile. Configurar los plazos explícitos en cada entorno; los overrides anteriores tienen prioridad sobre los valores predeterminados del código.
- Las sesiones anteriores conservan su vencimiento emitido y pueden requerir un login adicional. El nuevo campo es aditivo y mobile conserva una ruta de compatibilidad con el API anterior.
- Para rollback, restaurar código y configuración anteriores. Los refresh tokens de 150 días ya emitidos conservan su vencimiento firmado y persistido hasta que expiren o se revoquen; si se exige acortar sesiones activas, revocarlas expresamente.

## Criterios de aceptación

- [x] CA-001: Un login nuevo emite access de 15 minutos y fija una fecha de sesión a 150 días.
- [x] CA-002: Las rotaciones conservan esa fecha y rechazan el refresh al llegar al día 150.
- [x] CA-003: Mobile restaura la sesión sin red antes del límite y exige login después, aunque haya renovado el refresh varias veces.
- [x] CA-004: Mobile funciona durante la transición con respuestas del API sin `sessionExpiresAt`.
- [x] CA-005: El sexto intento de login dentro de la ventana sigue recibiendo HTTP 429 según la configuración vigente.

## Pruebas

- Unitarias de emisión, rotación, vencimiento, revocación y compatibilidad de sesión mobile.
- Regresión de API: el módulo JWT no agrega una expiración por defecto a tokens que ya llevan su `exp` absoluto.
- Integración HTTP de respuestas de login/refresh y del limitador existente.
- Escenarios offline-online antes y después de 150 días, más comprobación manual de la sesión web.
- Lint, tipos y build proporcionales para API y mobile.

## Impacto documental

- [x] Arquitectura de sesión mobile offline.
- [ ] Dominio.
- [x] Runbook de despliegue API.
- [ ] ADR.
- [x] Línea base de seguridad y registro de riesgos.
- [x] Índices de documentación y variables de ejemplo.
