---
name: agrogest-mobile-sync
description: Diseñar, implementar o revisar cambios offline-first de AgroGest mobile en SQLite, outbox, handlers, reconciliación y API. Usar cuando una entidad se guarda sin red, cambia `sync_outbox`, se agrega un tipo sincronizable, se modifica orden padre-hijos, reintentos, conflictos o estado `pending/synced/error`. Requiere spec aprobada.
---

# Sincronización mobile de AgroGest

## Flujo obligatorio

1. Leer `docs/architecture/mobile-offline-sync.md` y la spec aprobada.
2. Trazar formulario → SQLite → outbox → tipo de sync → handler → API →
   reconciliación.
3. Identificar padre, hijos, IDs locales/públicos/server y operaciones.
4. Diseñar desconexión, reintento, conflicto, error y reinicio de la app.
5. Modificar migración SQLite, repositorio, outbox, handler y API como unidad.
6. Preservar orden padre-hijos e idempotencia.
7. No marcar `synced` antes de la confirmación válida de API.
8. Para fotos o binarios, definir almacenamiento durable del servidor, límites,
   lifecycle local, reanudación y limpieza; no asumir disco efímero de Render.
9. Probar éxito, desconexión, reintento, padre fallido y conflicto.
10. Actualizar arquitectura, spec y riesgos.

## Restricciones

- No borrar pendientes para ocultar errores.
- No duplicar operaciones equivalentes en outbox.
- No sincronizar hijos sin identidad remota válida del padre.
- No asumir que una ejecución completa el ciclo.
- No cambiar payload API sin coordinar consumidores.
- No guardar binarios grandes dentro de SQLite ni exponer URLs públicas sin
  autorización explícita.

## Salida

Entregar mapa, invariantes, pruebas, recuperación y decisiones de storage.

Usar [references/checklist.md](references/checklist.md).
