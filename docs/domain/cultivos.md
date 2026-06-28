---
title: Cultivos
status: active
owner: mantenimiento
last_reviewed: 2026-06-28
---

# Cultivos

## Propósito

Un cultivo es el catálogo base que contextualiza la producción agrícola y las
visitas de campo. En AgroGest VSM no se usa como dato aislado: seleccionarlo
determina qué variedades, campañas, etapas fenológicas y nutrientes quedan
disponibles para el trabajo agronómico.

Esta página documenta el comportamiento vigente. No reemplaza las entidades,
migraciones, pruebas ni contratos ejecutables.

## Datos principales

El cultivo se persiste en la tabla `cultivos` de PostgreSQL y se replica como
catálogo local en SQLite mobile.

Campos conceptuales vigentes:

- `id`: identificador interno numérico del backend; mobile lo almacena como
  texto para referenciar catálogos y visitas.
- `code`: código corto visible, obligatorio y no nulo del cultivo. La API lo
  normaliza en mayúsculas cuando se envía.
- `name`: nombre visible y obligatorio del cultivo.
- `isActive`: estado lógico. Por defecto se crea activo.

Restricciones y comportamiento actual:

- `name` es obligatorio y tiene longitud máxima de 100 caracteres.
- `code` es obligatorio, no puede quedar vacío y tiene longitud máxima de 20
  caracteres.
- `code` y `name` son únicos según las restricciones de base usadas por el
  servicio de cultivos.
- eliminar un cultivo desde la API lo desactiva; no hace borrado físico.
- el listado del backend se ordena por `name` ascendente y usa paginación.

## Relaciones de dominio

```text
Cultivo
  -> Variedades
  -> Campañas
  -> Etapas fenológicas
       -> Subetapas
  -> Nutrientes
       -> Detalle de nutrientes
  -> Visitas de campo
```

Reglas relevantes:

- una variedad pertenece a un cultivo;
- una campaña pertenece a un cultivo;
- una etapa fenológica pertenece a un cultivo;
- un nutriente pertenece a un cultivo;
- una visita de campo registra `cropId` y debe usar variedad, campaña y etapa
  fenológica compatibles con ese mismo cultivo;
- una subetapa solo puede usarse cuando pertenece a la etapa fenológica
  seleccionada.

Estas reglas se validan en el servicio de visitas de campo antes de persistir
una visita.

## API

El módulo de cultivos expone el catálogo en `apps/api/src/modules/cultivos`.

Superficie principal:

- `GET /cultivos`: lista cultivos paginados.
- `GET /cultivos/:id`: obtiene un cultivo por id.
- `POST /cultivos`: crea un cultivo; requiere rol `ADMIN`.
- `PATCH /cultivos/:id`: actualiza parcialmente un cultivo; requiere rol
  `ADMIN`.
- `DELETE /cultivos/:id`: desactiva lógicamente un cultivo; requiere rol
  `ADMIN`.

También existe el endpoint `GET /cultivos/:cultivoId/variedades`, implementado
por el módulo de variedades, para resolver variedades dependientes del cultivo.

## Admin web

El panel administra cultivos en `/mantenimiento/cultivos`. La pantalla permite:

- listar cultivos;
- buscar por nombre o código;
- filtrar por estado;
- crear y editar nombre, código y estado;
- desactivar cultivos.

La visibilidad de la pantalla no sustituye la autorización del backend: las
mutaciones dependen del rol `ADMIN` en la API.

## Mobile offline

Mobile trata cultivos como catálogo descargado desde backend, no como entidad
creada offline.

Flujo actual:

- `downloadAllCatalogs()` descarga primero cultivos desde `/cultivos`.
- para cada cultivo descarga variedades, campañas activas y etapas
  fenológicas asociadas;
- almacena los catálogos en SQLite con `INSERT OR REPLACE`;
- una visita local guarda `crop_id` y lo usa para consultar catálogos
  dependientes;
- al sincronizar visitas, el payload envía `cropId` al backend.

Los catálogos se refrescan cuando la descarga local supera 24 horas o cuando se
fuerza manualmente el refresco.

## Compatibilidad de datos

El contrato vigente exige `code` no nulo en API, PostgreSQL y SQLite mobile.
La migración `022-cultivo-code-required` aborta si existen filas históricas con
`codigo NULL` o vacío; esos casos requieren definir códigos funcionales antes
de aplicar la contracción.

## Fuentes ejecutables

- `apps/api/src/modules/cultivos`
- `apps/api/src/modules/variedades`
- `apps/api/src/modules/campanias`
- `apps/api/src/modules/visitas-campo`
- `apps/api/src/modules/nutricion`
- `apps/mobile/src/shared/database/schema.ts`
- `apps/mobile/src/shared/database/seed-catalogs.ts`
- `apps/mobile/src/modules/visitas-campo/repositories/visitas-campo.repository.ts`
- `apps/admin-web/src/modules/mantenimiento/presentation/cultivos-management-screen.tsx`
