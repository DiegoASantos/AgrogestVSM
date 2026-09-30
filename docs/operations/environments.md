---
title: Entornos
status: active
owner: mantenimiento
last_reviewed: 2026-09-30
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

- API en el servidor IDL, expuesta en el puerto 5177;
- access tokens de 15 minutos y plazo fijo de sesión de 150 días en producción;
- PostgreSQL/PostGIS local en Docker, base `agrogest_produccion`;
- panel administrativo en el servidor IDL, expuesto en el puerto 5176;
- el panel llama a `/api` en su mismo origen; el proxy de Next.js reenvía esas
  solicitudes al servicio interno `api:3001` desde la LAN y el acceso público;
- Android mediante Expo EAS, con API en `http://190.119.191.195:5177`;
- actualizaciones OTA por canal de producción cuando son compatibles.

Datos permitidos: información empresarial real con acceso mínimo necesario.

Observabilidad:

- API emite logs JSON con `pino` a stdout de Docker;
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
- vigilar la ejecución y retención de backups locales;
- ejecutar el primer simulacro de restauración;
- asignar responsables nominales y accesos;
- habilitar HTTPS para el panel y la API cuando se disponga de dominio.

## Regla

Las herramientas de IA y MCP no deben conectarse a producción para exploración
ordinaria. Cualquier acceso excepcional requiere mínimo privilegio y aprobación.
