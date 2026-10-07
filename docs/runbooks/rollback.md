---
title: Rollback de despliegues
status: active
owner: mantenimiento
last_reviewed: 2026-10-07
---

# Rollback de despliegues

## Regla general

No desplegar un cambio crítico sin:

- commit o tag identificable;
- backup cuando afecta datos;
- compatibilidad hacia atrás;
- criterios de éxito y cancelación;
- responsable de decidir rollback.

## API y panel en servidor Ubuntu

1. Identificar la imagen o el commit estable que se desplegó antes del cambio.
2. Revisar si se ejecutaron migraciones y qué datos afectaron.
3. Si el cambio fue solo de aplicación, volver a desplegar la imagen o el commit
   estable con Docker Compose.
4. Si hubo cambios de datos, mantener la API compatible y preparar una
   migración correctiva; no bajar el esquema automáticamente.
5. Restaurar la base PostgreSQL/PostGIS desde un backup solo cuando la
   corrección progresiva no sea viable y exista aprobación para la ventana.
6. Verificar `/health`, `/health/db`, login y endpoints críticos desde el
   servidor y desde una red autorizada.

El repositorio no versiona imágenes estables ni automatiza este rollback. Antes
de cada release, el responsable debe confirmar que puede recuperar el código
anterior y el backup correspondiente.

Las migraciones nuevas deben preferir expansión y contracción:

1. agregar estructuras compatibles;
2. desplegar código compatible;
3. migrar datos;
4. retirar estructuras antiguas en otro release.

## Panel web

Si falla el proxy `/api/*`, restaurar la imagen web estable anterior y sus
argumentos de compilación. Verificar `/health` en la API, login desde LAN y
red externa, y que Network apunta a `/api` bajo el origen del panel. El rollback
web por sí solo no corrige incompatibilidades introducidas en la API.

## Mobile

Una OTA solo puede revertir JavaScript y assets compatibles con el mismo
runtime.

- Publicar una actualización correctiva en el canal correspondiente.
- Si cambió código nativo, distribuir un nuevo APK.
- No publicar JavaScript que requiera módulos nativos ausentes.
- Mantener la API compatible con versiones móviles anteriores durante la
  ventana acordada.

## Datos

No escribir migraciones destructivas con rollback automático basado únicamente
en `DROP`. Para datos empresariales se prefiere una migración correctiva
auditada o una restauración aprobada.

En cargas aditivas de catalogos, no borrar automaticamente las filas insertadas:
pueden estar referenciadas por recetas o por dispositivos offline. Ante una
carga incorrecta, respaldar primero, identificar por nombre y tipo las filas
afectadas y aplicar una correccion hacia adelante o una baja logica aprobada.
