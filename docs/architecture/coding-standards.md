---
title: Coding Standards de AgroGest VSM
status: active
owner: mantenimiento
last_reviewed: 2026-06-25
mandatory: true
target_audience: Codex, OpenCode, DeepSeek, Claude y cualquier IA que escriba
  código en este repositorio.
---

# Coding Standards de AgroGest VSM

## Preámbulo

AgroGest VSM se construye con múltiples asistentes de IA (Codex, OpenCode,
DeepSeek, Claude). Cada modelo tiene sus propios patrones por defecto. **Este
documento anula esos patrones.** Es la única fuente de convenciones de código
del proyecto.

**Regla de oro**: seguir el módulo vecino más cercano. Si un patrón existe en un
archivo adyacente, copiarlo en vez de reinventarlo.

Todo asistente DEBE leer este documento antes de escribir, modificar o revisar
código. También DEBE leer `AGENTS.md`.

---

## 1. Arquitectura general

AgroGest es un monorepo pnpm con cuatro componentes:

| Componente | Stack | Directorio |
|---|---|---|
| API | NestJS + Fastify + TypeORM + PostgreSQL/PostGIS | `apps/api` |
| Mobile | Expo/React Native + SQLite + outbox | `apps/mobile` |
| Admin web | Next.js App Router | `apps/admin-web` |
| Shared | TypeScript + Zod | `packages/` |

**Por qué monorepo**: un solo repo mantiene coherencia entre contratos,
validaciones y migraciones. Evita divergencia silenciosa entre apps.

---

## 2. NestJS — Estructura de módulo (API)

### 2.1 Layout obligatorio

```
apps/api/src/modules/<modulo>/
  <modulo>.module.ts           # NestJS Module, siempre en la raíz
  application/
    <modulo>.service.ts        # Lógica de negocio
    <modulo>.service.test.ts   # Tests co-ubicados con el servicio
  infrastructure/
    persistence/
      entities/
        <entidad>.entity.ts    # TypeORM @Entity()
  presentation/
    <modulo>.controller.ts     # Endpoints REST
    dto/
      create-<entidad>.dto.ts
      update-<entidad>.dto.ts
      find-<entidad>-query.dto.ts
    guards/                    # Solo si el módulo define guards propios
```

**Por qué**:
- `application/` aísla la lógica de negocio sin dependencias HTTP ni DB, lo que
  permite probar reglas sin levantar el servidor.
- `infrastructure/` contiene todo lo acoplado a librerías externas (TypeORM,
  bcrypt, JWT). Cambiar una librería solo afecta a esta capa.
- `presentation/` maneja HTTP, validación de entrada y Swagger. Un controlador
  nunca contiene lógica de negocio.
- Tests co-ubicados (`*.test.ts` junto a `*.ts`) eliminan directorios `__tests__/`
  redundantes y facilitan encontrar la prueba desde el código.

### 2.2 Registro del módulo

Todo módulo nuevo debe registrarse en `apps/api/src/app.module.ts` bajo la
sección `imports`. No crear imports dinámicos ni carga lazy sin justificación.

### 2.3 No crear `.gitkeep`

Las carpetas vacías heredadas tienen `.gitkeep`. No crear nuevas — si una capa
está vacía, no crearla aún.

### 2.4 Módulo agregado vs módulos separados

Seguir el patrón existente: `visitas-campo` agrupa etapas fenológicas,
sub-etapas y observaciones porque comparten el ciclo de vida de una visita.
Otras entidades como `visita-evaluaciones` o `visita-recetas` son módulos
independientes. **No cambiar modularidad sin spec aprobada.**

---

## 3. TypeORM — Entidades y migraciones

### 3.1 Convención de nombres

| Concepto | Convención | Ejemplo |
|---|---|---|
| Archivo | kebab-case, sufijo `.entity.ts` | `productor.entity.ts` |
| Clase | PascalCase, sufijo `Entity` | `ProductorEntity` |
| Tabla DB | snake_case, español, plural | `productores` |
| Columna DB | snake_case, español | `nro_documento`, `tipo_documento_id` |
| Propiedad JS | camelCase | `documentNumber`, `documentTypeId` |
| Decorador columna | atributo `name` explícito | `@Column({ name: "nro_documento" })` |

**Por qué snake_case español en DB pero camelCase en JS**: la base de datos es
gestionada por un DBA que habla español; el código es TypeScript estándar. El
decorador `@Column({ name: ... })` hace de puente y mantiene la trazabilidad.

### 3.2 Llave primaria dual

Toda entidad nueva lleva:

```typescript
@PrimaryGeneratedColumn({ name: "id", type: "bigint" })
id!: string;

@Column({ name: "public_id", type: "uuid", default: () => "gen_random_uuid()" })
publicId!: string;
```

**Por qué**: el `id` numérico es eficiente para joins internos; el `public_id`
UUID se expone en la API impidiendo enumeración de recursos (Insecure Direct
Object Reference).

### 3.3 Columnas de auditoría

```typescript
@Column({ name: "creado_at", type: "timestamptz", default: () => "now()" })
createdAt!: Date;

@Column({ name: "actualizado_at", type: "timestamptz", default: () => "now()" })
updatedAt!: Date;
```

**Por qué**: trazabilidad obligatoria para auditoría y resolución de incidentes.
Usar `timestamptz` (no `timestamp`) para evitar ambigüedad de zona horaria.

### 3.4 `synchronize: false`

**Nunca activar `synchronize: true` en ejecución normal.** Solo se permite en el
script de bootstrap protegido (`tools/database/bootstrap-postgres.ps1`) y
únicamente sobre esquema vacío.

**Por qué**: `synchronize` puede borrar columnas sin previo aviso y no registra
historial de cambios. Las migraciones son la única fuente de verdad de la
evolución del esquema.

### 3.5 Migraciones

- Usar TypeORM CLI para generar migraciones automáticas desde entidades.
- Revisar manualmente el SQL generado antes de aplicar.
- Nombrar con timestamp: `Timestamp-NombreDescribiendoCambio.ts`.
- Toda migración debe incluir la migración inversa comentada en el archivo
  (estrategia de rollback documentada).
- Ver `docs/runbooks/database-bootstrap.md` y la skill
  `agrogest-database-change`.

---

## 4. DTOs y validación (API)

### 4.1 class-validator + Swagger

```typescript
import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty, MaxLength } from "class-validator";

export class CreateProductorDto {
  @ApiProperty({ example: "12345678", description: "Número de documento del productor." })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  documentNumber!: string;
}
```

**Por qué class-validator en API**: NestJS lo integra nativamente con pipes de
validación global. Las validaciones se ejecutan antes de que el request llegue
al controlador, protegiendo la capa de negocio.

### 4.2 Descripciones en español

`@ApiProperty()` siempre lleva `description` en español. `example` debe reflejar
un valor realista.

**Por qué**: el panel Swagger es consultado por desarrolladores hispanohablantes.
Las descripciones en español facilitan la lectura de la documentación generada.

### 4.3 Trim de strings

Usar transformers para limpiar strings de entrada:

```typescript
@Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
```

**Por qué**: espacios al inicio/final por copy-paste o autocompletado generan
errores silenciosos y datos sucios.

### 4.4 Zod en `packages/validation`

Los esquemas compartidos (mobile ↔ API) usan Zod v4 en `@agrogest/validation`:

```typescript
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Ingresa un correo válido."),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
});

export type LoginInput = z.infer<typeof loginSchema>;
```

**Por qué dos sistemas de validación**: `class-validator` es la integración
nativa de NestJS con Swagger; Zod es portable a mobile y no depende de
decoradores experimentales. La API expone los contratos Zod desde `packages/`
para que mobile consuma las mismas reglas de validación.

---

## 5. Manejo de errores

### 5.1 API — Excepciones HTTP

```typescript
import { NotFoundException, BadRequestException } from "@nestjs/common";

throw new NotFoundException("Productor no encontrado.");
throw new BadRequestException("El email ya está registrado.");
```

**Por qué**: NestJS mapea automáticamente excepciones a códigos HTTP. El mensaje
debe ser descriptivo y en español. Nunca exponer `error.message` crudo ni
stack traces al cliente.

### 5.2 Mobile — Errores clasificados

Seguir `apps/mobile/src/shared/sync/sync-errors.ts`:

```typescript
export type SyncErrorKind = "auth" | "conflict" | "transient" | "permanent";
```

**Por qué**: el sync engine decide reintentar, resolver conflicto o abortar
según la clasificación del error. No reintentar errores de autenticación evita
bloquear la cuenta.

---

## 6. Next.js — Admin web

### 6.1 App Router con route groups

```
apps/admin-web/src/app/
  (app)/
    layout.tsx        # RootLayout con AuthSessionProvider
    page.tsx          # redirect / → /login
    login/
      page.tsx        # público, sin auth
    (admin)/
      layout.tsx      # AdminGroupLayout protegido
      dashboard/
        page.tsx
      mantenimiento/  # catálogos CRUD
      visitas/        # gestión de visitas
        [id]/         # detalle dinámico
```

**Por qué**: los route groups `(admin)` encapsulan el layout protegido sin
afectar la URL. `/login` queda fuera del grupo y no requiere autenticación.

### 6.2 Componentes

Usar componentes funcionales con hooks. Para UI reutilizable usar shadcn/ui.
Para estilos usar Tailwind CSS. No introducir nuevas librerías de componentes
sin spec aprobada.

### 6.3 Autorización

La UI controla visibilidad por rol, pero la autorización definitiva está en la
API. Un guard `RolesGuard` en el backend decide el acceso. **Nunca asumir que
ocultar un botón es suficiente.**

---

## 7. Mobile — Offline-first

### 7.1 Plataform fork pattern

```
apps/mobile/src/shared/sync/
  sync-engine.ts         # implementación nativa
  sync-engine.test.ts
  sync-status.ts         # nativo
  sync-status.web.ts     # web
  use-sync.ts            # hook nativo
  use-sync.web.ts        # hook web
  index.ts               # barrel nativo
  index.web.ts           # barrel web
```

**Por qué**: React Native y web tienen APIs incompatibles para SQLite,
almacenamiento y red. El patrón `*.ts` / `*.web.ts` permite que Metro/Webpack
resuelvan la implementación correcta en tiempo de build sin `Platform.OS`
condicionales en runtime.

### 7.2 Outbox y sync

El ciclo de vida de una entidad offline:

1. Usuario completa formulario → se guarda en SQLite local con `sync_status = 'pending'`
2. Se inserta en `sync_outbox` con `entity_type`, `entity_local_id`, `operation`, `payload`
3. `sync-engine.ts::processOutbox()` procesa la cola en orden: padre antes que hijos
4. Handler HTTP envía al endpoint correspondiente de la API
5. Si API responde OK → se borra del outbox, `sync_status = 'synced'`
6. Si error de auth → se detiene la cola sin perder pendientes (no actualiza `lastSyncTime`)
7. Si error transitorio → reintento hasta 5 veces, luego `sync_status = 'error'`
8. Si conflicto → reconcilia usando el ID del servidor en la respuesta de error

**Por qué**: este flujo garantiza idempotencia, orden padre-hijos y recuperación
tras desconexión sin pérdida de datos. Ver
`docs/architecture/mobile-offline-sync.md` y la skill `agrogest-mobile-sync`.

### 7.3 SQLite convenciones

- Tablas: snake_case, español, plural.
- Columna de sync: `sync_status TEXT` (pending / synced / error).
- IDs: `local_id` (UUID local) + `server_id` (bigint del servidor, nullable hasta sync).
- Binarios (fotos): almacenar en filesystem, SQLite solo guarda la ruta. No
  guardar blobs en la base de datos.

---

## 8. Pruebas

### 8.1 Framework y ubicación

| App | Framework | Ubicación |
|---|---|---|
| API | Vitest | `apps/api/src/modules/<modulo>/**/<archivo>.test.ts` |
| Mobile | Vitest | `apps/mobile/src/**/<archivo>.test.ts` |
| Admin web | Vitest (cuando se agregue) | Co-ubicado junto al componente |

**Por qué Vitest y no Jest**: Vitest es compatible con la configuración de Jest
pero más rápido, con mejor integración ESM y tipado nativo. Es el estándar
elegido por el ecosistema Vite/Next.js moderno.

### 8.2 Estructura de test

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("ProductorService", () => {
  describe("create", () => {
    it("crea un productor con datos válidos", async () => {
      // Arrange
      const service = buildService();
      // Act
      const result = await service.create(validDto);
      // Assert
      expect(result).toMatchObject({ documentNumber: "12345678" });
    });

    it("rechaza documento duplicado", async () => {
      // ...
    });
  });
});
```

**Por qué Arrange-Act-Assert**: estructura predecible que toda IA puede replicar.
Una aserción semántica por test; si falla, sabes exactamente qué rompió.

### 8.3 Mocks y factories

Usar funciones factory que devuelvan instancias limpias. No usar mocks globales
ni `beforeAll` con estado compartido:

```typescript
function makeUser(overrides: Partial<User> = {}): User {
  return { id: "1", email: "test@test.com", ...overrides };
}

function buildService(overrides = {}) {
  return new ProductorService(
    overrides.repo ?? mockRepo,
    overrides.validator ?? mockValidator
  );
}
```

**Por qué**: cada test recibe su propio estado limpio. Sin acoplamiento entre
tests. Sin falsos positivos/negativos por shared state.

---

## 9. TypeScript — Convenciones generales

### 9.1 Nombres

| Elemento | Convención | Ejemplo |
|---|---|---|
| Archivo | kebab-case | `create-productor.dto.ts` |
| Clase | PascalCase | `ProductorService` |
| Interfaz | PascalCase, sin prefijo `I` | `LoginInput` |
| Tipo | PascalCase | `SyncErrorKind` |
| Función | camelCase | `findByDocument()` |
| Variable | camelCase | `documentNumber` |
| Constante | UPPER_SNAKE_CASE | `MAX_RETRIES` |
| Enum nativo | PascalCase | `VisitStatus` |
| Enum como union | camelCase + `as const` | `["pendiente", "en_progreso"] as const` |

**Por qué PascalCase sin prefijo `I`**: el prefijo `I` es una convención de C#
que TypeScript no adoptó. La comunidad TypeScript y el estándar de Google
prefieren interfaces sin prefijo.

### 9.2 Imports

```typescript
// 1. Node modules
import { Injectable } from "@nestjs/common";
import { Repository } from "typeorm";

// 2. Paquetes del monorepo
import { loginSchema } from "@agrogest/validation";

// 3. Módulos internos (rutas absolutas desde apps/api/src/)
import { ProductorEntity } from "../productores/infrastructure/persistence/entities/productor.entity";
```

**Nota sobre rutas**: el proyecto actual usa rutas relativas (`../../`). No
cambiar a path aliases sin spec aprobada. Para módulos nuevos, usar la menor
profundidad relativa posible.

**Por qué este orden**: externos primero ayuda al IDE a detectar dependencias
no declaradas. Paquetes del monorepo en segundo lugar. Internos al final.

### 9.3 Strings de usuario

- Identificadores de código y nombres de variables: **inglés**.
- Mensajes de validación, Swagger y UI: **español**.
- Nombres de tablas y columnas de BD: **español** (snake_case).

**Por qué separar idiomas**: el código es inglés estándar (portable y compatible
con el ecosistema TypeScript). La interfaz de usuario y los mensajes de error
son en español porque los usuarios y el mantenedor son hispanohablantes.

---

## 10. Lo que NUNCA debe hacer una IA

1. **Crear arquitectura paralela**: si un módulo vecino ya define cómo se
   organizan las carpetas, copiar ese patrón. No inventar una estructura nueva.

2. **Introducir dependencias sin verificar**: revisar `package.json` antes de
   hacer `import` o `pnpm add`. Usar solo librerías ya presentes en el
   repositorio, a menos que una spec aprobada autorice una nueva.

3. **Cambiar contratos de API silenciosamente**: renombrar un campo del DTO
   rompe mobile y admin web. Coordinar cambios de contrato con una spec.

4. **Mezclar refactors con features**: un PR que arregla un bug y además
   reorganiza carpetas es imposible de revisar y peligroso de revertir.

5. **Activar `synchronize` en producción**: es destructivo. Solo bootstrap
   protegido.

6. **Introducir secretos en código, logs o Git**: contraseñas, tokens, keys y
   URLs de conexión van en `.env.example` (formato, no valores) y se configuran
   en Render/Vercel/EAS. Ver `docs/operations/security-baseline.md`.

7. **Hacer commit o push sin autorización humana**: la IA propone; el humano
   decide qué subir.

8. **Ejecutar contra producción**: migraciones, deletes, updates masivos y
   cualquier operación contra la base de producción requieren aprobación
   explícita del mantenedor.

9. **Asumir que ocultar UI es suficiente**: la autorización real está en los
   guards de la API. Un botón invisible no protege el endpoint.

10. **Crear archivos de documentación no solicitados**: no crear READMEs,
    CHANGELOGs ni docs sin aprobación explícita. Actualizar los existentes.

---

## 11. Referencias obligatorias

Antes de escribir código, la IA debe leer:

1. `AGENTS.md` — reglas del repositorio y flujo de IA
2. `docs/architecture/overview.md` — arquitectura vigente
3. `docs/architecture/mobile-offline-sync.md` — si afecta mobile
4. Este documento (`docs/architecture/coding-standards.md`)
5. El módulo vecino más cercano como ejemplo concreto

---

## 12. Cómo cargar skills

Las skills encapsulan procedimientos especializados. Usarlas bajo demanda:

- **AgroGest**: `.agents/skills/agrogest-*/SKILL.md`
- **Externas**: `.opencode/skills/claude-code-templates/*/SKILL.md`

Ejemplo de uso:

> "Carga la skill agrogest-api-module y sigue su flujo para implementar el
>  endpoint de creación de campañas."

Las skills no sustituyen a este documento ni a `AGENTS.md`. En caso de
conflicto, prevalecen `AGENTS.md` y este documento.

---

Este documento es vinculante para toda IA que opere en el repositorio. Cualquier
desviación debe ser justificada en el diff o en la spec correspondiente.
