---
title: Rollback de despliegues
status: active
owner: mantenimiento
last_reviewed: 2026-06-25
---

# Rollback de despliegues

## Regla general

No desplegar un cambio crítico sin:

- commit o tag identificable;
- backup cuando afecta datos;
- compatibilidad hacia atrás;
- criterios de éxito y cancelación;
- responsable de decidir rollback.

## API en Render

1. Identificar el último deploy estable.
2. Revisar si el nuevo deploy ejecutó migraciones.
3. Si no cambió datos, redeploy del commit estable.
4. Si cambió datos, evaluar compatibilidad antes de bajar código.
5. Restaurar backup solo cuando una migración no pueda corregirse de forma
   progresiva.
6. Verificar `/health`, `/health/db`, login y endpoints críticos.

Las migraciones nuevas deben preferir expansión y contracción:

1. agregar estructuras compatibles;
2. desplegar código compatible;
3. migrar datos;
4. retirar estructuras antiguas en otro release.

## Admin web en Vercel

1. Promover el deployment estable anterior.
2. Confirmar `NEXT_PUBLIC_API_URL`.
3. Probar login, dashboard, parcelas y visitas.

El rollback web no corrige incompatibilidades introducidas en la API.

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
