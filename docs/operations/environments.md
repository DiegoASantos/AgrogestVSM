---
title: Entornos
status: active
owner: mantenimiento
last_reviewed: 2026-06-26
---

# Entornos

## Desarrollo local

- API local;
- PostgreSQL/PostGIS local o instancia exclusiva de desarrollo;
- Expo en emulador o dispositivo;
- Next.js local.

Datos permitidos: ficticios o anonimizados.

## Staging

Entorno objetivo, todavía pendiente de provisionamiento:

- API y web separadas de producción;
- PostgreSQL/PostGIS propio;
- secretos propios;
- datos sintéticos o anonimizados;
- canal mobile de preview;
- lugar obligatorio para bootstrap, restauración, migraciones y smoke tests.

## Producción actual

- API desplegada en Render;
- PostgreSQL en Supabase;
- admin web en Vercel;
- Android mediante Expo EAS;
- actualizaciones OTA por canal de producción cuando son compatibles.

Datos permitidos: información empresarial real con acceso mínimo necesario.

Observabilidad:

- API emite logs JSON con `pino` a stdout de Render;
- `LOG_LEVEL=info` por defecto;
- `/health` expone entorno y versión desplegada;
- `/health/db` verifica PostgreSQL/PostGIS con autenticación.

## Matriz de acceso

| Recurso          | Desarrollo               | Staging                  | Producción               |
| ---------------- | ------------------------ | ------------------------ | ------------------------ |
| Desarrollador    | administración local     | mantenimiento            | acceso mínimo autorizado |
| IA local         | código y datos ficticios | sin secretos por defecto | sin acceso               |
| MCP PostgreSQL   | lectura opcional         | lectura controlada       | prohibido por defecto    |
| Usuarios empresa | no                       | validadores designados   | roles funcionales        |

## Pendientes de infraestructura

- provisionar staging;
- confirmar backups gestionados del proveedor;
- ejecutar el primer simulacro de restauración;
- asignar responsables nominales y accesos;
- configurar verificación estricta de certificado de base de datos.

## Regla

Las herramientas de IA y MCP no deben conectarse a producción para exploración
ordinaria. Cualquier acceso excepcional requiere mínimo privilegio y aprobación.
