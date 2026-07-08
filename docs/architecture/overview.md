---
title: Arquitectura general
status: active
owner: mantenimiento
last_reviewed: 2026-07-08
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

- dashboard y reportes;
- gestión de visitas;
- mantenimiento de catálogos;
- usuarios y roles;
- mapas Leaflet;
- edición y validación inicial de geodatos.

El panel controla visibilidad por rol, pero la API conserva la autorización
definitiva.

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
