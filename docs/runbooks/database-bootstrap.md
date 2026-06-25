---
title: Bootstrap de base de datos PostgreSQL
status: active
owner: mantenimiento
last_reviewed: 2026-06-25
---

# Bootstrap de base de datos PostgreSQL

## Objetivo

Crear el esquema actual de AgroGest VSM sobre un PostgreSQL/PostGIS vacío sin
usar Docker y sin depender de una base preexistente.

## Protección

El comando:

- exige `ALLOW_DATABASE_BOOTSTRAP=true`;
- comprueba que `DB_SCHEMA` no contenga tablas de usuario;
- aborta si encuentra alguna tabla;
- nunca elimina un esquema existente;
- obtiene el modelo inicial desde las entidades TypeORM;
- ejecuta las migraciones versionadas para ajustes y semillas históricas.

No ejecutar contra producción ni contra una base con información.

## Requisitos

- PostgreSQL con permisos para crear extensiones;
- PostGIS disponible en el servidor;
- variables de `apps/api/.env.example`;
- base y esquema vacíos creados previamente.

## Ejecución

Desde `apps/api/.env` o mediante variables de entorno:

```powershell
$env:ALLOW_DATABASE_BOOTSTRAP = "true"
pnpm --filter @agrogest/api bootstrap:database
```

Después:

```powershell
pnpm --filter @agrogest/api migrate
pnpm --filter @agrogest/api seed:auth
```

`migrate` debe informar que no quedan migraciones pendientes.

## Verificación

```powershell
pnpm --filter @agrogest/api build
node apps/api/dist/scripts/migrate-database.js
```

Iniciar la API y comprobar:

- `GET /health`;
- `GET /health/db`;
- login del usuario sembrado;
- lectura de catálogos;
- creación de un registro de prueba únicamente en desarrollo.

## Estado de validación

El procedimiento puede validarse sin Docker usando PostgreSQL/PostGIS instalado
localmente:

```powershell
pnpm db:smoke
```

El script crea dos bases temporales, prueba bootstrap, migraciones, seed,
arranque y health de la API, rate limiting de login, backup y restauración, y
elimina el clúster temporal al terminar.

Validación completada el 25 de junio de 2026:

- API health correcto;
- intentos de login: `401,401,401,401,401,429`;
- 50 tablas restauradas;
- 8 provincias y 65 distritos de Piura;
- sin Docker y sin acceso a producción.
