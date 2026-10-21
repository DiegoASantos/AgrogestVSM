---
title: Precios semanales por jaba y Tesorero Pagos
status: implemented
numero: 115
area: estimaciones, seguridad, pagos
created: 2026-10-21
approved_by: mantenedor, instrucción «Implement the plan» del 2026-10-21
implemented_in: "working tree del 2026-10-21; migración 074; sin commit ni despliegue"
---

# Spec 115: Precios semanales por jaba y Tesorero Pagos

## Contexto

Se necesita guardar una referencia semanal del precio por jaba en soles y ofrecer
un perfil operativo limitado a productores, parcelas, acreedores y pagos.
El mantenedor aprobó el plan en la conversación antes de iniciar implementación.

## Alcance

### Incluido

- Panel web y API: pestañas Visitas y Precios por jaba en Estimaciones.
- Un rango general por semana de lunes a domingo, consultable y editable por
  ADMIN y ANALISTA, independiente de las metas por agrónomo.
- Rol TESORERO_PAGOS con gestión completa de productores, parcelas (incluyendo
  asignación y geodatos), acreedores de cosecha y pagos. Incluye bajas,
  reactivaciones, aprobación y exportaciones propias de estos módulos.
- Consultas auxiliares de catálogos y agrónomos necesarias en formularios.
- Restricción efectiva de rutas web y API, incluso consultas sin @Roles.

### Excluido

- Cambios mobile, cálculos o controles de precio en pagos, otros reportes,
  asignaciones automáticas de roles, commits y despliegues.
- Gestión de catálogos auxiliares, visitas e historiales agronómicos, Comercial,
  seguridad, clima y dashboard para el rol nuevo por sí solo.

## Requisitos

- RF-001: Precio mínimo y máximo no negativos, hasta dos decimales,
  mínimo <= máximo y límite 9 999 999 999.99 (numeric(12,2)). Ambos requeridos;
  ambos null retiran lógicamente el rango. Sin registro se muestra Sin estimación.
- RF-002: Selector semanal compartido; conservar borradores al alternar pestañas
  y advertir antes de descartarlos al cambiar de semana.
- RF-003: Registrar auditoría de creación y última edición, incluso retiro.
- RF-004: TESORERO_PAGOS ingresa a Pagos, tiene perfil y cierre de sesión.
  Otros roles suman sus permisos actuales. Ocultar enlaces y notificaciones ajenos.
- RNF-001: Rechazar operaciones ajenas en servidor, con permisos explícitos por
  operación; no dar acceso a todo Comercial o Seguridad por dependencias.

## Contratos afectados

- GET /estimaciones/semanas/:fecha/precios devuelve startDate, endDate y
  priceRange nullable (precioMinimo, precioMaximo, publicId y auditoría).
- PUT de la misma ruta recibe precioMinimo y precioMaximo numéricos o ambos null,
  normaliza fecha al lunes y devuelve la semana actualizada en el envelope vigente.
- Tabla estimaciones_precios: ID bigint, UUID público, semana única, fechas,
  numeric(12,2), activo, usuarios de auditoría y timestamps.
- Nuevo código de rol TESORERO_PAGOS, asignable desde Seguridad por ADMIN.
- Se conservan contratos de visitas y clientes mobile existentes.

## Seguridad y datos

Permisos aditivos. Los permisos explícitos de otros roles no se restringen al
sumar TESORERO_PAGOS. En ausencia de otra autorización, denegar rutas ajenas
incluyendo endpoints autenticados sin roles. Solo consultas auxiliares necesarias;
no se permite escribir catálogos. No registrar importes ni PII en logs.

## Migración y rollback

Migración aditiva 074, compatible con la aplicación anterior: tabla independiente
y alta idempotente del rol, sin asignar usuarios. Mantener synchronize false.
Actualizar entidades para bootstrap y registro de migraciones. Verificar esquema
vacío y esquema previo. Rollback de aplicación conserva tabla y datos; antes de
volver a una API sin protección del nuevo rol, retirar sus asignaciones y revocar
sus sesiones. Borrar tabla/rol solo con respaldo y autorización explícita;
preferir corrección hacia adelante.

## Criterios de aceptación

- [x] CA-001: Crear, editar y retirar rangos; semanas independientes incluso entre
  años; funciona sin agrónomos; visita y precio no se sobrescriben.
- [x] CA-002: Rechazar fechas, importes y rangos inválidos en API y UI.
- [x] CA-003: Tesorero gestiona los cuatro módulos con sus selectores y no accede
  a módulos ajenos por URL ni llamadas directas; roles combinados suman permisos.
- [x] CA-004: ADMIN, ANALISTA y AGRONOMO conservan sus accesos previos.

## Pruebas

Unitarias de validación, servicio, guard y autorización web; integración de
migración/constraints en PostgreSQL temporal si está disponible; pruebas de
componentes para pestañas, errores y descarte; tipos, lint, builds y docs:check.
No se modifica sincronización offline-online. No probar contra producción.

### Evidencia de implementación

- 444 pruebas de servicios, validadores, controladores, guard y autorización web
  de los módulos afectados aprobadas.
- 17 pruebas HTTP con Fastify, ValidationPipe y RolesGuard reales; autenticación
  del actor y persistencia simuladas. Cubren envelope, permisos, fechas, validación,
  autor del contexto y retiro del rango.
- 4 pruebas PostgreSQL 18 en clúster efímero propio: migración repetible,
  conservación de datos previos y ausencia de asignaciones, guardado/edición/retiro/
  reactivación con auditoría, concurrencia y constraints. Nunca leen `.env`.
- Pruebas Playwright del panel con API simulada: pestañas y borradores, validación,
  error recuperable, guardado independiente, recarga, retiro, descarte al cambiar
  semana, ingreso/permisos del tesorero y precios sin agrónomos activos.
- Lint, tipos y builds de API/panel y validación documental ejecutados.
- `pnpm db:smoke` se detiene en la migración histórica 025 por el índice
  `uq_subsectores_sector_nombre` (R-043). El paso de creación desde entidades
  completó; no se declara validado el bootstrap/restore completo. La migración
  074 se verificó por separado en PostgreSQL temporal. No se modificó la 025.
- Sin acceso a producción, asignaciones reales, commits ni despliegues.

## Impacto documental

- Dominio: almacenamiento y semántica de precios semanales.
- Seguridad: permisos y combinación del rol nuevo.
- Índices de documentación/specs y referencia de implementación al terminar.
- Sin ADR: se conserva arquitectura actual.
