---
title: Entornos
status: active
owner: mantenimiento
last_reviewed: 2026-10-07
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

- servidor físico con Ubuntu y Docker Compose;
- API expuesta en el puerto 5177;
- access tokens de 15 minutos y plazo fijo de sesión de 150 días en producción;
- PostgreSQL/PostGIS local en un contenedor Docker, base `agrogest_produccion`;
- panel administrativo en el mismo servidor, expuesto en el puerto 5176;
- API y base se comunican por la red privada de Docker usando el servicio `db`;
- el panel llama a `/api` en su mismo origen; el proxy de Next.js reenvía esas
  solicitudes al servicio interno `api:3001`;
- Android mediante Expo EAS, con API en `http://190.119.191.195:5177`;
- actualizaciones OTA por canal de producción cuando son compatibles.

### Panel web y API en Ubuntu

La corrección de la [spec 085](../specs/085-proxy-api-mismo-origen-web.md)
requiere reconstruir la imagen del panel. El target Docker fija
`NEXT_PUBLIC_API_URL=/api` y usa `API_INTERNAL_URL=http://api:3001` por defecto.
El servicio web y `api` deben compartir la
red de Docker Compose; `api` es el nombre del servicio, no una IP pública.
El panel reenvía `/api/*` a ese destino interno. Esto permite usar la misma
imagen desde la IP privada y la pública sin retorno por la IP pública dentro
de la LAN. No se modifican CORS ni las URLs que usa mobile.

En la configuración de producción del servidor Ubuntu, integrar el Dockerfile,
reconstruir el servicio web y comprobar que la pestaña Network muestra
`/api/auth/login` bajo el origen del panel. Verificar `/api/health` desde LAN y
desde otra red antes de probar el login. Cambiar solo la variable de entorno de
un contenedor ya compilado no reemplaza `NEXT_PUBLIC_API_URL` incrustada en el
JavaScript.

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
- confirmar ejecución, copia externa y retención de backups de la base local;
- ejecutar el primer simulacro de restauración;
- asignar responsables nominales y accesos;
- habilitar HTTPS para el panel y la API cuando se disponga de dominio.

## Regla

Las herramientas de IA y MCP no deben conectarse a producción para exploración
ordinaria. Cualquier acceso excepcional requiere mínimo privilegio y aprobación.
