---
title: Despliegue en servidor físico Ubuntu
status: active
owner: mantenimiento
last_reviewed: 2026-10-21
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

## Preparación de fotos comerciales (spec 103)

Antes de habilitar cargas reales, asignar `COMERCIAL_PHOTOS_KEY_V1` en
`apps/api/.env` con 32 bytes aleatorios en hexadecimal (64 caracteres) y
conservar una copia protegida fuera del servidor. Compose monta
`agrogest_commercial_photos` únicamente en API y fija
`COMERCIAL_PHOTOS_DIR=/var/lib/agrogest/commercial-photos`. Comprobar permisos,
espacio libre, migración 069 y el respaldo/restauración conjuntos descritos en
el [runbook de backup](database-backup-restore.md). Sin la clave, los endpoints
de fotos responden indisponibilidad y el resto de la API puede seguir activo.

La app incorpora `expo-image-picker` y `expo-image-manipulator`, por lo que esta
versión requiere un APK nuevo (versión 0.2.3, código Android 14), no solo OTA.
Probar cámara, galería, texto pequeño, captura sin red, reintento y consulta web
con datos sintéticos antes de distribuirlo. El tráfico público continúa por
HTTP según la decisión registrada en R-048.

## Despliegue

Para la spec 118, aplicar primero las migraciones PostgreSQL 076 a 078 y
publicar la API antes de distribuir mobile o actualizar el panel. Confirmar
que una visita anterior sin `productor_id` sigue consultable, que una visita
nueva admite `COOPERATIVA` y que un acreedor `INCOMPLETE` no se puede aprobar
ni asignar a pagos. Verificar conjuntamente el respaldo de la base, el volumen
cifrado de fotos comerciales y la clave custodiada antes de habilitar fotos de
visita o acreedor. Mobile aplica SQLite 79 a 81 al abrir; comprobar una base
existente con outbox pendiente y una instalaciÃ³n vacÃ­a. Ante reversiÃ³n del
cliente, conservar columnas, imÃ¡genes y operaciones pendientes y corregir
hacia adelante. Probar cÃ¡mara, galerÃ­a y reconexiÃ³n en dispositivos fÃ­sicos
antes de distribuir la build.

Si el listado de visitas comerciales responde 500 tras actualizar la API,
consultar primero el log de `api` y comprobar en PostgreSQL que
`schema_migrations` contiene `076-visitas-comerciales-productores` y que
`visitas_comerciales.productor_id` existe. El lector conserva compatibilidad
con visitas antiguas cuando falta solo esa columna, pero el alta de visitas
vinculadas y las fotos requieren las migraciones 076 a 078. Aplicar el comando
de migración de este runbook solo después del preflight y el respaldo.
Una respuesta 401 indica una sesión ausente o vencida: iniciar sesión en el
panel y repetir la consulta autenticada antes de diagnosticar un error de DB.

Para habilitar la precarga de recepciones en Pagos, configurar
`RECEPCION_API_URL` y `SYSTRACE_API_KEY` solo en el entorno privado de la API.
No colocar la clave en el panel ni en Git. Comprobar conectividad desde el
contenedor de API con una consulta que informe solo estado y conteo, sin
imprimir la respuesta ni los encabezados. Aplicar la migración 071 antes de
publicar la web; el endpoint de calibrado no se usa en esta entrega. Si
Systrace no responde, el formulario manual continúa disponible. La conexión
actual al proveedor usa HTTP y se registra en R-050.

Para los cálculos y el control de jabas de la spec 106, aplicar la migración
072 antes de levantar la nueva API y la web. Verificar que
`detalle_pago_productores.fecha_pago` existe, que sus precios y `sub_total`
aceptan seis decimales y que el índice de identidad de recepción se creó.
Antes del corte, revisar en una copia los lotes con suma de jabas no anuladas
superior a la recepción y los detalles históricos con porcentaje cero, precios
incoherentes o estado `PAGADO` sin fecha. No inventar fechas ni alterar importes
durante la migración. Después de publicar, ensayar con datos sintéticos dos
pagos parciales de un mismo lote y comprobar que se rechaza una asignación que
excede el saldo. Si hay que retirar la versión nueva, conservar la columna y
la precisión ampliada; no reducir escala ni borrar pagos, según la estrategia
de rollback de la spec 106.

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
