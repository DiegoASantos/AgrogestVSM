---
title: Despliegue en servidor físico Ubuntu
status: active
owner: mantenimiento
last_reviewed: 2026-10-07
---

# Despliegue en servidor físico Ubuntu

## Alcance

Producción ejecuta la API, el panel y PostgreSQL/PostGIS en Docker Compose en
el servidor físico Ubuntu. El archivo `apps/api/.env` contiene la configuración
del servidor y no debe copiarse, imprimirse ni versionarse.

## Preflight

Desde el directorio del proyecto en Ubuntu:

```bash
git status --short
git branch --show-current
docker compose config --quiet
docker compose ps
```

Confirmar antes de seguir:

- se despliega el commit aprobado de la rama `produccion`;
- no hay cambios locales inesperados en el servidor;
- `db` está saludable y el backup previo está disponible si el cambio afecta
  datos;
- las migraciones pendientes y su compatibilidad están revisadas;
- los secretos de `apps/api/.env` siguen fuera de Git.

Si el release cambia datos y no se puede confirmar un backup restaurable, no
ejecutar la migración.

## Despliegue

```bash
docker compose build api admin-web
docker compose up -d db
docker compose run --rm --no-deps api pnpm --filter @agrogest/api migrate
docker compose up -d api admin-web
docker compose ps
docker compose logs --tail=100 api admin-web
```

La migración se ejecuta como paso controlado; el arranque normal de la API no
la aplica automáticamente.

## Comprobaciones

Desde el servidor:

```bash
curl --fail http://127.0.0.1:5177/health
curl --fail http://127.0.0.1:5176/api/health
```

Comprobar `/health/db` con una sesión autorizada: el endpoint exige
autenticación. Luego verificar login, una ruta protegida y el acceso al panel
desde la LAN y desde una red externa autorizada. Confirmar que las llamadas del
navegador usan `/api` bajo el origen del panel.

## Recuperación

El despliegue no revierte datos. Si falla la aplicación, detener nuevos cambios,
revisar los logs y restaurar una versión de código compatible con el esquema
vigente. Si falló una migración, conservar el backup y corregir progresivamente;
restaurar la base solo con aprobación y durante una ventana de mantenimiento.

`docker-compose.yml` no fija etiquetas inmutables de imágenes ni conserva por
sí solo un artefacto de rollback. Antes de cada release, confirmar cómo se
recuperará el commit estable anterior; el rollback de base sigue el runbook de
[backup y restauración](database-backup-restore.md).
