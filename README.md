# AgroGest VSM

AgroGest VSM es un monorepo orientado a la gestion agricola de visitas de campo,
productores, sectores y parcelas, con soporte web, mobile, backend API,
georreferenciacion y trabajo offline.

## Estado actual

El proyecto ya no es una base inicial. Actualmente incluye:

- backend API funcional con NestJS + Fastify
- app mobile con Expo + React Native
- modo offline local con SQLite
- sincronizacion mediante outbox
- panel administrativo web con Next.js
- georreferenciacion de parcelas y visitas
- seguridad basica con JWT y roles
- paquetes internos compartidos para validacion y utilidades

En su estado actual, el sistema esta bien encaminado para tesis y demo funcional.
Todavia requiere endurecimiento adicional para un piloto controlado serio y no se
presenta como una version lista para produccion.

## Arquitectura general

```text
agrogest-vsm/
  apps/
    api/          API backend (NestJS + Fastify + TypeORM + PostgreSQL/PostGIS)
    mobile/       App mobile (Expo + React Native + Expo Router + SQLite)
    admin-web/    Panel administrativo (Next.js + App Router + Leaflet)
  packages/
    contracts/    Tipos y contratos compartidos
    validation/   Esquemas y validaciones compartidas
    utils/        Utilidades puras compartidas
```

## Modulos principales

El dominio actual del proyecto cubre, entre otros:

- autenticacion y sesion
- usuarios, roles y relacion usuario-rol
- productores
- sectores
- parcelas
- visitas de campo
- evaluaciones de visita
- observaciones sanitarias
- recomendaciones
- productos recomendados
- catalogos de apoyo
- mapas, historial y visualizacion geografica

## Stack tecnico

### Backend

- NestJS
- Fastify
- TypeORM
- PostgreSQL + PostGIS
- class-validator / class-transformer
- Swagger en entorno de desarrollo

### Mobile

- Expo
- React Native
- Expo Router
- Expo SQLite
- Expo Location
- React Native Maps

### Admin web

- Next.js 14
- React
- Leaflet / React Leaflet
- Recharts

### Tooling

- pnpm workspaces
- TypeScript
- ESLint
- Prettier
- Vitest

## Requisitos

- Node.js 20 o superior
- pnpm 9 o superior
- PostgreSQL con extension PostGIS disponible
- un entorno Expo para pruebas mobile

## Variables de entorno

### API

Copiar `apps/api/.env.example` a un archivo `.env` en `apps/api/` y completar los
valores reales.

Variables principales:

- `APP_HOST`
- `APP_PORT`
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `DB_SCHEMA`
- `DB_SSL`
- `JWT_ACCESS_SECRET`
- `JWT_ACCESS_EXPIRES_IN`
- `CORS_ALLOWED_ORIGINS`

### Admin web

El panel usa:

- `NEXT_PUBLIC_API_URL`

Si no se define, toma `http://127.0.0.1:3001` por defecto.

### Mobile

La app mobile usa:

- `EXPO_PUBLIC_API_URL`

Si no se define, toma `http://127.0.0.1:3001` por defecto. Para pruebas en un
dispositivo fisico conviene usar la IP LAN del equipo donde corre el backend.

## Instalacion

```bash
pnpm install
```

## Scripts raiz

- `pnpm dev`: levanta mobile, api y admin-web en paralelo
- `pnpm build`: build de todos los workspaces
- `pnpm lint`: lint de todos los workspaces
- `pnpm typecheck`: chequeo de tipos de todos los workspaces
- `pnpm test`: ejecuta tests disponibles
- `pnpm check`: lint + typecheck + test

## Ejecucion por workspace

### API

```bash
pnpm --filter @agrogest/api build
pnpm --filter @agrogest/api seed:auth
pnpm --filter @agrogest/api dev
```

Notas:

- Swagger se expone solo en desarrollo en `/docs`
- el seed de auth prepara datos base de acceso para el sistema

### Admin web

```bash
pnpm --filter @agrogest/admin-web dev
```

### Mobile

```bash
pnpm --filter @agrogest/mobile dev
```

Tambien se puede iniciar con:

```bash
pnpm --filter @agrogest/mobile android
pnpm --filter @agrogest/mobile ios
pnpm --filter @agrogest/mobile web
```

## Calidad tecnica actual

El repositorio ya cuenta con:

- validacion y manejo de errores en backend
- documentacion Swagger en desarrollo
- persistencia local mobile con SQLite
- sincronizacion con outbox
- sesiones y auth basica en web y mobile
- pruebas unitarias parciales en utilidades, validaciones y piezas criticas

## Alcance academico y estado del proyecto

AgroGest VSM se encuentra en una etapa funcional avanzada. Su estado actual es coherente con un proyecto de tesis con implementacion real y cobertura integral
de capas:

- backend
- mobile
- offline/sync
- admin web
- georreferenciacion

Esto no implica que el proyecto este listo para produccion. Aun quedan tareas de
endurecimiento tecnico, especialmente en:

- sincronizacion y reconciliacion
- permisos finos y seguridad operativa
- migraciones y despliegue reproducible
- reduccion de hotspots de complejidad en algunos modulos

## Estructura de trabajo recomendada

Para continuar el cierre del proyecto conviene priorizar:

1. estabilizacion tecnica
2. pruebas y validacion funcional
3. documentacion academica y tecnica
4. ajustes finales de UX y consistencia

## Licencia y uso

Repositorio de trabajo academico para el proyecto AgroGest VSM.
