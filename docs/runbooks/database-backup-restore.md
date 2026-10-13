---
title: Backup y restauración PostgreSQL
status: active
owner: mantenimiento
last_reviewed: 2026-10-13
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
`DB_SCHEMA` para acceder a PostgreSQL/PostGIS del servidor Ubuntu por la red
privada autorizada. No copiar la contraseña a la línea de comandos ni a logs.

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

## Fotos comerciales de productores (spec 103)

El dump de PostgreSQL **no contiene los archivos** de `agrogest_commercial_photos`.
Un respaldo recuperable reúne tres piezas de la misma ventana: dump de la base,
archivo del volumen y `COMERCIAL_PHOTOS_KEY_V1`. La clave se guarda por separado,
con acceso restringido; nunca dentro del tar, del dump ni de Git. Registrar su
versión (actualmente 1). Sin esa clave no se pueden leer las fotos restauradas.

En el servidor Ubuntu, durante una ventana autorizada, detener temporalmente
las cargas a la API, obtener el dump con el procedimiento anterior y localizar
el volumen real con `docker volume inspect agrogest_commercial_photos` (el nombre
puede llevar prefijo del proyecto Compose). Crear un tar del directorio `_data`
del volumen con permisos restringidos. Registrar un manifiesto SHA-256 del dump
y del tar con `sha256sum`, los conteos de filas/archivos, fecha y resultado.
Cifrar conjuntamente dump y tar antes de la copia externa; el destino, agenda,
alertas y retención de nube los opera el mantenedor. Comprobar espacio libre y
resultado de cada ejecución, y volver a habilitar la API.

Ejemplo orientativo con rutas y nombre de volumen sustituidos por los del
entorno, ejecutado solo en una ventana autorizada:

```bash
docker volume inspect --format '{{ .Mountpoint }}' <nombre-real-del-volumen>
sudo tar -C <mountpoint> -cpf photos.tar .
sha256sum <dump-postgresql> photos.tar > manifest.sha256
sha256sum -c manifest.sha256
```

El tar debe cifrarse antes de enviarlo fuera del servidor. No incluir la clave
en ese archivo ni imprimirla en la terminal de verificación. En la restauración
aislada, extraer el tar en el volumen vacío **antes** de iniciar la API.

La restauración se ensaya con **datos sintéticos** en un entorno aislado:
restaurar PostgreSQL, el contenido del volumen y la clave de versión 1; iniciar
la API y comprobar que una foto de prueba se abre para ADMIN/ANALISTA. Comparar
los UUID/`storage_key` de la tabla con los archivos `.enc`, contar faltantes y
huérfanos, y verificar los hashes `sha256_archivo`. El número de filas, archivos
y el manifiesto deben coincidir. Conservar temporalmente huérfanos para
investigación; no borrarlos automáticamente. Tras una caída, revisar también
los `.tmp` antiguos y retirarlos solo después de confirmar que no hay cargas
activas y de conservar el manifiesto. Probar este conjunto antes de
aceptar fotos reales y repetir la restauración de forma periódica.

## Frecuencia recomendada

- backup diario de producción con copia fuera del servidor;
- backup manual antes de migraciones o releases con cambios de datos;
- retención mínima inicial: 7 diarios, 4 semanales y 3 mensuales;
- revisión trimestral de restauración.

La ejecución, copia fuera del servidor, retención y restauración de los backups
de producción deben confirmarse en el servidor Ubuntu. Este repositorio no
automatiza ni acredita que exista una tarea programada de backup.
