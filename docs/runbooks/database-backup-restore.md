---
title: Backup y restauración PostgreSQL
status: active
owner: mantenimiento
last_reviewed: 2026-06-25
---

# Backup y restauración PostgreSQL

## Principios

- Un backup no se considera válido hasta que `pg_restore --list` lo reconoce.
- Los archivos no se versionan en Git.
- Las contraseñas se entregan por variables de entorno.
- Toda restauración se prueba primero en desarrollo o staging.
- Una restauración de producción requiere aprobación y ventana de mantenimiento.

## Crear backup

Configurar `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` y
`DB_SCHEMA`.

```powershell
pnpm db:backup -- -Label "pre-release"
```

El script genera:

- archivo custom de `pg_dump`;
- validación mediante `pg_restore --list`;
- hash SHA-256 para comprobar integridad.

Guardar fuera del equipo de desarrollo una copia cifrada. No enviar backups por
canales informales.

## Restaurar

La restauración usa `--clean --if-exists`, por lo que reemplaza objetos del
esquema objetivo. Antes de restaurar, el script asegura que `pgcrypto` y
`postgis` estén instaladas en la base objetivo.

```powershell
$env:ALLOW_DATABASE_RESTORE = "true"
pnpm db:restore -- -BackupFile ".\backups\archivo.dump"
```

Producción requiere además:

```powershell
$env:ALLOW_PRODUCTION_DATABASE_RESTORE = "true"
```

## Simulacro obligatorio

Antes de considerar operativa una política de backup:

1. crear una base PostgreSQL/PostGIS de desarrollo vacía;
2. restaurar el backup;
3. ejecutar migraciones;
4. iniciar la API;
5. comprobar health, login, catálogos, parcelas y visitas;
6. registrar fecha, duración, tamaño y resultado.

Para el simulacro local aislado sin Docker:

```powershell
pnpm db:smoke
```

## Frecuencia recomendada

- backup gestionado diario de producción;
- backup manual antes de migraciones o releases con cambios de datos;
- retención mínima inicial: 7 diarios, 4 semanales y 3 mensuales;
- revisión trimestral de restauración.

La configuración del proveedor debe verificarse directamente en Supabase; este
repositorio no puede confirmar por sí solo que los backups remotos estén
habilitados.
