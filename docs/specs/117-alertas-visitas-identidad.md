---
title: Alertas separadas de visitas e identidad
status: implemented
numero: 117
area: api, admin-web, database, seguridad
created: 2026-10-21
approved_by: usuario mediante "Implement the plan", 2026-10-21
implemented_in: apps/api (migracion 075 y modulos notificaciones/productores); apps/admin-web (campana y revision de duplicados); docs, 2026-10-21
---

# Spec 117: Alertas separadas de visitas e identidad

## Contexto

La campana mezcla avisos operativos y los casos de identidad no muestran quién
registró cada ficha. La regla de visitas repetidas actual distingue agrónomos,
aunque se necesita detectar dos visitas al mismo productor en el mismo día.

## Alcance

### Incluido

- Secciones independientes en la campana para visitas repetidas, revisión de
  identidad, continuidad del productor y clima, con resumen breve en pantalla.
- Aviso histórico con dos o más visitas activas por productor y fecha de Perú,
  sin distinguir agrónomo ni parcela; lectura individual por usuario.
- Nombre del creador de cada ficha en casos pendientes de identidad, con
  «No registrado» cuando la procedencia histórica sea desconocida.
- Registrar el usuario autenticado en todas las altas futuras de productores.

### Excluido

- Descarga de reportes, cambios mobile y reconstrucción especulativa de autores
  históricos.

## Requisitos

- RF-001: El listado operativo permite consultar cada tipo de aviso con su
  conteo y paginación independientes.
- RF-002: La lectura de un grupo productor-fecha no oculta el aviso a otros
  usuarios y falla si ya no hay al menos dos visitas activas.
- RF-003: Los casos de identidad muestran el creador de ambas fichas sin
  exponer datos sensibles adicionales.
- RNF-001: Los endpoints mantienen JWT y roles ADMIN/ANALISTA; las consultas
  parametrizan entradas y no registran datos personales en logs.

## Contratos afectados

- `GET /notificaciones/operativas` acepta `kind` opcional y devuelve los
  agrónomos participantes en cada grupo de visitas.
- `POST /notificaciones/visitas-duplicadas/lectura` recibe `productorId` y
  `fechaVisita`; durante compatibilidad acepta también el campo anterior
  `agronomoUsuarioId`, que ya no determina el grupo leído.
- `GET /mantenimiento/productores-duplicados` añade `lesserRecordedBy` y
  `greaterRecordedBy` anulables.
- PostgreSQL agrega lecturas por usuario, productor y fecha; no cambia SQLite.

## Seguridad y datos

La identidad del creador proviene de la sesión autenticada al dar de alta la
ficha. Los nombres de autores se devuelven solo a ADMIN y ANALISTA en el
endpoint protegido. No se infieren autores ausentes.

## Migración y rollback

Aplicar la migración aditiva antes de la API nueva. Transferir lecturas antiguas
solo cuando todos los agrónomos del grupo actual ya estaban leídos por el mismo
usuario. Conservar la tabla antigua para una reversión de código; la API antigua
la seguirá usando y la nueva tabla quedará inerte. La API nueva escribe en
ambas tablas para mantener las lecturas durante una reversión. No eliminar
lecturas.

## Criterios de aceptación

- [x] CA-001: Dos agrónomos con una visita cada uno generan un solo aviso.
- [x] CA-002: Una lectura se limita al usuario y grupo productor-fecha.
- [x] CA-003: Las secciones y sus resúmenes se muestran independientemente de
  la paginación y los fallos de las demás fuentes.
- [x] CA-004: Cada ficha de un caso muestra autor o «No registrado».
- [x] CA-005: Las altas futuras guardan al usuario autenticado, sin cambiar la
  regla de acceso de los agrónomos a productores.

## Pruebas

- 27 pruebas unitarias acotadas; SQL de migración, agrupación, lectura y
  autoría ejecutado en PostgreSQL temporal.
- Lint, typecheck y build de API/panel, y `pnpm docs:check` aprobados.
- El smoke global de base se detuvo en migración histórica 025 antes de 075;
  registrado como R-062.

## Impacto documental

- [x] Modelo de dominio.
- [x] Índices de specs.
- [x] Riesgos y seguridad.
