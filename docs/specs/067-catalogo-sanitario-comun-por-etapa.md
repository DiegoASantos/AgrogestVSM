---
title: Catálogo sanitario común por etapa y labor
status: implemented
numero: "067"
area: database, api, mobile, sqlite, sync, ux
created: 2026-08-24
approved_by: usuario mediante instrucción "Implement the plan", 2026-08-24
implemented_in: apps/api/src/database/migrations/058-catalogo-sanitario-comun-por-etapa.ts; apps/mobile/src/modules/observaciones-sanitarias; apps/mobile/src/shared/database/migrations.ts (70)
---

# Spec 067: Catálogo sanitario común por etapa y labor

## Contexto

El catálogo sanitario global de Mango mostraba todas las plagas y enfermedades
en cada etapa o labor. Se requiere priorizar las comunes sin impedir que el
agrónomo registre una ocurrencia excepcional.

## Alcance

### Incluido

- Clasificar `plagas_enfermedades_etapas_niveles.activo` como común u opcional
  para cada objetivo y etapa/labor de Mango.
- Mostrar las relaciones comunes inicialmente y las opcionales mediante un
  control alternable “Ver más” / “Ver menos” en mobile.
- Permitir que una relación opcional se guarde y sincronice con sus niveles
  existentes.
- Invalidar solo la frescura del catálogo SQLite.

### Excluido

- Cambiar tablas, contratos HTTP, scores técnicos u observaciones históricas.
- Eliminar relaciones sanitarias, visitas, borradores u operaciones de outbox.

## Requisitos

- RF-001: Toda combinación no definida como común queda opcional.
- RF-002: Queresas, Cochinilla, Fumagina y Muerte regresiva son comunes en las
  ocho etapas/labores configuradas de Mango.
- RF-003: Las demás combinaciones comunes siguen la matriz aprobada para
  Trips, Chinche, Ácaros, Mosca de la fruta, Mosca blanca, Arañita roja,
  Hormiga arriera, Gusano barrenador, Oidium, Alternaria, Antracnosis,
  Fusariosis y Botritis.
- RF-004: Una opción opcional conserva los grados configurados y puede ser
  registrada offline y sincronizada sin modificar su estado de catálogo.
- RNF-001: La migración valida 17 objetivos, ocho etapas/labores y ocho niveles
  por combinación antes de actualizar; cualquier precondición falla de forma
  atómica.

## Contratos afectados

No cambia el contrato HTTP. El tipo interno mobile `PestDiseaseByStageItem`
agrega `isStageActive` para separar prioridad de interfaz y disponibilidad de
registro.

## Migración y rollback

- PostgreSQL 058 desactiva relaciones Mango y reactiva de forma idempotente la
  matriz aprobada; no borra filas ni sobrescribe descripciones.
- SQLite 70 invalida `catalogs_downloaded_at` y mantiene observaciones,
  borradores y outbox.
- Desplegar PostgreSQL 058 y API compatible antes de publicar la OTA/APK.
- Rollback operativo: conservar datos y aplicar una migración correctiva desde
  el backup validado previo si se requiere otra matriz.

## Criterios de aceptación

- [x] CA-001: La pantalla inicia solo con los objetivos comunes de su etapa o
      labor y presenta el contador correcto de opcionales.
- [x] CA-002: “Ver más” y “Ver menos” alternan las tarjetas opcionales sin
      perder su selección actual.
- [x] CA-003: Una opción opcional se registra offline, persiste tras reinicio y
      sincroniza al recuperar conexión.
- [x] CA-004: La migración es idempotente, preserva las relaciones y marca como
      opcional cualquier combinación no definida.

## Pruebas

- Migración PostgreSQL, servicio API y selector mobile.
- Migración SQLite y recarga de catálogos sin modificar pendientes.
- Flujo offline-online de una observación opcional.

## Impacto documental

- [x] Dominio y arquitectura offline.
- [x] Riesgo de catálogo desactualizado.
- [x] Índices de specs y documentación.
- [ ] ADR, no requerido.

## Resultado de implementación

- PostgreSQL 058 valida 17 objetivos, ocho etapas/labores y 1,088 relaciones
  antes de clasificar la matriz aprobada; las combinaciones no listadas quedan
  opcionales sin eliminar sus niveles.
- SQLite 70 fuerza la recarga del catálogo y conserva observaciones, borradores
  y outbox.
- Las pruebas focalizadas, typecheck y lint de API/mobile, el smoke de base de
  datos y la validación documental aprobaron. El formato global conserva fallos
  preexistentes ajenos al alcance; los archivos modificados fueron verificados.
