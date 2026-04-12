# agrogest-vsm

Base inicial del monorepo para AgroGest VSM usando `pnpm workspaces`.

## Estructura

```text
agrogest-vsm/
  apps/
    mobile/       # Expo + React Native + TypeScript + Expo Router
    api/          # NestJS + Fastify + TypeScript
    admin-web/    # Next.js + TypeScript + App Router
  packages/
    contracts/    # Tipos y contratos compartidos
    validation/   # Esquemas compartidos
    utils/        # Utilidades puras compartidas
```

## Scripts raíz

- `pnpm dev`: ejecuta los tres workspaces de aplicación en paralelo.
- `pnpm build`: ejecuta el build de todos los workspaces.
- `pnpm lint`: ejecuta ESLint en todos los workspaces.
- `pnpm typecheck`: ejecuta validación de tipos en todos los workspaces.

## Alcance de esta base

Incluye:

- estructura inicial del monorepo
- configuración compartida de TypeScript
- apps y paquetes internos con manifests mínimos
- placeholders técnicos para levantar cada workspace

No incluye todavía:

- lógica de negocio
- módulos funcionales
- conexión a base de datos
- microservicios
- Docker
- CI/CD
- pantallas finales

## Primeros pasos

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm build
```

Para desarrollo por app:

```bash
pnpm --filter @agrogest/mobile dev
pnpm --filter @agrogest/api dev
pnpm --filter @agrogest/admin-web dev
```
