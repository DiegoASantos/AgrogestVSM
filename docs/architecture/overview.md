---
title: Arquitectura general
status: active
owner: mantenimiento
last_reviewed: 2026-09-04
related_code:
  - apps/api
  - apps/mobile
  - apps/admin-web
  - packages
---

# Arquitectura general

## Contexto

AgroGest VSM es un monorepo TypeScript administrado con pnpm workspaces.

```text
Admin web ───────┐
                 ├── API NestJS/Fastify ─── PostgreSQL/PostGIS
Mobile online ───┘
      │
      └── SQLite local + outbox cuando trabaja offline
```

## Backend

`apps/api` es un monolito modular NestJS:

- Fastify como adaptador HTTP;
- TypeORM para persistencia;
- PostgreSQL/PostGIS;
- validación global y respuestas de error normalizadas;
- JWT de acceso y refresh sessions;
- guards globales de autenticación y roles;
- endpoint de integración externa Cost-Build protegido por API key dedicada;
- adaptador WeatherLink v2 para observaciones Davis historicas consultadas bajo
  demanda en rangos cerrados de hasta siete dias, con cache efimera y
  credenciales aisladas del navegador y del dispositivo movil;
- rate limiting de login por IP;
- Swagger solo en desarrollo.

Los módulos se organizan por dominio con capas de aplicación, persistencia y
presentación.

## Mobile

`apps/mobile` usa Expo Router y React Native. Está diseñada para registrar
visitas aun sin conexión:

- SQLite local;
- catálogos descargados desde la API;
- identificadores locales y referencias a IDs del servidor;
- outbox para create/update/delete;
- reintentos y estados `pending`, `synced`, `error`;
- sesión local limitada y refresh al recuperar conexión.

Detalle: [Sincronización mobile offline](mobile-offline-sync.md).

## Admin web

`apps/admin-web` usa Next.js App Router:

- dashboard y métricas filtrables de visitas por agrónomo y parcelas por etapa
  fenológica;
- ruta principal `/reportes`, reservada para `ADMIN` y `ANALISTA`, con un
  reporte de visitas filtrable por ingeniero, productor y rango de fechas;
- gestión de visitas;
- mantenimiento de catálogos;
- usuarios y roles;
- mapas Leaflet;
- edición y validación inicial de geodatos.

`ANALISTA` comparte con `ADMIN` el CRUD de Mantenimiento, incluidos los
geodatos y la asignación de agrónomos en parcelas. Seguridad continúa exclusiva
de `ADMIN`.

El panel controla visibilidad por rol, pero la API conserva la autorización
definitiva.

El reporte de visitas consulta agregados diarios desde la API: cantidad de
visitas, días distintos de trabajo y promedio por ingeniero, junto con
hectáreas observadas por fecha. El mapa reutiliza los geodatos de las parcelas
activas y refleja su asignación actual; por diseño, el rango histórico no altera
esa asignación.

## Paquetes

- `packages/utils`: funciones puras compartidas;
- `packages/validation`: esquemas Zod compartidos;
- `packages/contracts`: contratos iniciales, actualmente con adopción limitada.

## Despliegue actual

- API: Render;
- base de datos: PostgreSQL de Supabase;
- web: Vercel;
- mobile Android: Expo EAS y actualizaciones OTA compatibles.

Los procedimientos se encuentran en `docs/runbooks/`.

Una base vacía puede prepararse mediante el bootstrap protegido y validarse con
`pnpm db:smoke`, que usa PostgreSQL/PostGIS local sin Docker.

## Limitaciones conocidas

- Staging todavía no está provisionado.
- La conexión del pooler cifra tráfico pero no valida aún la CA.
- El rate limiting actual es local a una instancia.
- Existen hotspots grandes en visitas, migraciones SQLite, sync y CSS.

Seguimiento: [Registro de riesgos](../operations/risk-register.md).
