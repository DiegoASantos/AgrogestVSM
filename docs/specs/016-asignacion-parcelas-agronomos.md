---
title: Asignacion de parcelas a agronomos y filtro de productores
status: draft
numero: 016
area: productores, parcelas, visitas-campo
created: 2026-07-13
approved_by:
implemented_in:
---

# Spec 016: Asignacion de parcelas a agronomos y filtro de productores

## Contexto

Actualmente en AgroGest VSM no existe relacion entre usuarios con rol agronomo y
las parcelas o productores que gestionan. Cuando un agronomo inicia el registro
de una visita desde la app mobile, el selector de productores muestra **todos**
los productores del sistema sin filtrar por asignacion. Esto no refleja la
realidad del negocio.

### Regla de negocio identificada

- Un **productor** puede tener multiples **parcelas** y puede trabajar con
  varios agronomos, pero **cada parcela es gestionada por un solo agronomo**.
- **Solo los productores activos** aparecen en la app mobile (se conserva el
  comportamiento existente).
- El administrador (`ADMIN`) sigue viendo todos los productores y parcelas.
- El usuario con rol `AGRONOMO` solo ve los productores y parcelas que tiene
  asignados.

### Ejemplo concreto

- Productor "Juan Perez" tiene 2 parcelas: "Lote Norte" y "Lote Sur".
- Agronomo 1 (Carlos) trabaja solo con "Lote Norte".
- Agronomo 2 (Maria) trabaja solo con "Lote Sur".
- Ambos agronomos deben **ver a "Juan Perez"** en su lista de productores, pero
  cada uno solo ve su parcela asignada al crear una visita.

### Estado actual del modelo

| Entidad | Relacion con User |
|---|---|
| `productores` | Ninguna — no hay FK ni tabla puente |
| `parcelas` | Ninguna — no hay FK ni campo de usuario |
| `visitas_campo` | Via `agronomo_usuario_id` — pero es posterior a la seleccion de parcela |

No existe filtro por usuario en `GET /productores` ni en `GET /parcelas`. La
app mobile descarga el catalogo completo sin distincion de roles.

## Alcance

### Incluido

- Agregar campo `agronomo_usuario_id` (FK nullable → `usuarios`) en la tabla
  `parcelas` como fuente unica de verdad para la asignacion parcela↔agronomo.
- Derivar la visibilidad de productores para el agronomo desde las parcelas
  asignadas (sin tabla puente adicional).
- Endpoint `PATCH /parcelas/:id/agronomo` para asignar o desasignar un agronomo
  a una parcela.
- Modificar `GET /productores` para filtrar implícitamente por el usuario
  autenticado cuando este tiene rol `AGRONOMO` (sin `ADMIN`).
- Modificar `GET /parcelas` con el mismo criterio de filtro por rol.
- Integrar la asignacion en el CRUD de parcelas existente dentro del panel
  admin-web (Mantenimiento → Productores → [id]): agregar un campo "Agrónomo"
  en el formulario de crear/editar parcela con un selector de usuarios con rol
  `AGRONOMO`, y una columna en la tabla de parcelas que muestre el agronomo
  asignado.

### Excluido

- Tabla puente `usuario_productores`: no es necesaria porque la visibilidad del
  productor se deriva de `parcelas.agronomo_usuario_id` (el agronomo ve un
  productor si tiene al menos una parcela asignada).
- Modificacion en la app mobile: `GET /productores` y `GET /parcelas` ya son
  los endpoints que consume la app; al filtrar en el backend, la descarga de
  catalogos obtendra automaticamente solo los datos asignados.
- Re-descarga de catalogos en mobile al cambiar de usuario: fuera del alcance
  de esta spec (se abordara en una spec futura si es necesario).
- Asignacion multiple de una misma parcela a varios agronomos: no contemplado
  en el requerimiento.
- Migracion de datos existentes: las parcelas sin agronomo asignado solo seran
  visibles para ADMIN.

## Requisitos

- **RF-001**: El sistema debe permitir asignar un usuario con rol `AGRONOMO` a
  una parcela mediante `PATCH /parcelas/:id/agronomo`.
- **RF-002**: El sistema debe permitir desasignar un agronomo de una parcela
  enviando `usuarioId: null` en el mismo endpoint.
- **RF-003**: `GET /productores`, cuando es invocado por un usuario con rol
  `AGRONOMO` (y sin `ADMIN`), debe devolver exclusivamente los productores que
  tienen al menos una parcela con `agronomo_usuario_id = :userId`.
- **RF-004**: `GET /parcelas`, bajo el mismo criterio de rol, debe devolver
  exclusivamente las parcelas con `agronomo_usuario_id = :userId`.
- **RF-005**: Los usuarios con rol `ADMIN` deben seguir viendo todos los
  productores y parcelas sin filtro.
- **RF-006**: El formulario de crear/editar parcela en el panel admin-web debe
  incluir un campo opcional "Agrónomo" con un selector desplegable de usuarios
  con rol `AGRONOMO`. La tabla de listado de parcelas debe incluir una columna
  "Agrónomo" mostrando el nombre del agronomo asignado.
- **RF-007**: El endpoint de asignacion debe validar que el `usuarioId`
  proporcionado corresponda a un usuario existente y activo con rol `AGRONOMO`.
- **RNF-001**: El filtro por rol no debe romper la paginacion ni los filtros
  existentes (`search`, `activo`) en `GET /productores` ni `GET /parcelas`.
- **RNF-002**: La migracion debe ser idempotente (`ADD COLUMN IF NOT EXISTS`).

## Contratos afectados

### API (REST)

| Metodo | Ruta | Cambio |
|---|---|---|
| `GET` | `/productores` | Modificado: acepta `@CurrentAuthUser()` y filtra por rol |
| `GET` | `/parcelas` | Modificado: acepta `@CurrentAuthUser()` y filtra por rol |
| `PATCH` | `/parcelas/:id/agronomo` | **Nuevo**: asigna/desasigna agronomo a parcela |

### Entidades TypeORM

| Entidad | Cambio |
|---|---|
| `ParcelaEntity` | Agregar `agronomoUsuarioId` (columna) + `@ManyToOne` a `UserEntity` |
| `UserEntity` | Agregar `@OneToMany` → `parcelasAsignadas` (relacion inversa) |

### PostgreSQL

| Tabla | Cambio |
|---|---|
| `parcelas` | Agregar columna `agronomo_usuario_id bigint NULL REFERENCES usuarios(id)` |
| `parcelas` | Agregar indice `idx_parcelas_agronomo` sobre `agronomo_usuario_id` |

### Admin web (Next.js)

| Archivo | Cambio |
|---|---|
| `parcelas/services/parcelas.service.ts` | Agregar `updateParcelaAgronomo()` |
| `parcelas/types/parcelas.types.ts` | Agregar `agronomoUsuarioId` y `agronomoUsuario` opcionales a los tipos de parcela |
| `parcelas/presentation/parcela-form-modal.tsx` | Agregar select "Agrónomo" con lista de usuarios AGRONOMO |
| Tabla/listado de parcelas (screen existente) | Agregar columna "Agrónomo" mostrando el nombre del agronomo asignado |

### Mobile (Expo)

Sin cambios. `GET /productores` y la descarga de catalogos (`seed-catalogs.ts`)
usan los mismos endpoints que ahora filtran por el token del usuario
autenticado.

## Seguridad y datos

- **Autorizacion**: El filtro por rol se aplica en el servicio usando
  `AccessTokenPayload.roles` del `@CurrentAuthUser()`. No se depende del
  frontend para la restriccion.
- **Validacion**: `PATCH /parcelas/:id/agronomo` verifica que el `usuarioId`
  corresponda a un usuario activo con rol `AGRONOMO`. Si es `null` se
  desasigna.
- **Datos sensibles**: No se introducen nuevos datos personales ni secretos.
  La columna `agronomo_usuario_id` es una FK interna (`bigint`).
- **Compatibilidad**: Los endpoints existentes mantienen su contrato. El nuevo
  campo en la respuesta de parcela (`agronomoUsuarioId`) es aditivo y opcional.

## Migracion y rollback

### Avance (migracion 030)

```sql
ALTER TABLE parcelas
  ADD COLUMN IF NOT EXISTS agronomo_usuario_id bigint
  REFERENCES usuarios(id);

CREATE INDEX IF NOT EXISTS idx_parcelas_agronomo
  ON parcelas(agronomo_usuario_id);
```

### Rollback

```sql
DROP INDEX IF EXISTS idx_parcelas_agronomo;
ALTER TABLE parcelas DROP COLUMN IF EXISTS agronomo_usuario_id;
```

### Compatibilidad

- La columna es `NULL` por defecto. Las parcelas existentes no rompen.
- Los endpoints `GET /productores` y `GET /parcelas` sin `@CurrentAuthUser()` (invocados sin token o por ADMIN) mantienen el comportamiento anterior.
- La app mobile no requiere cambios porque consume los mismos endpoints.

## Criterios de aceptacion

- [ ] **CA-001**: `PATCH /parcelas/:id/agronomo` con `{ "usuarioId": "<id>" }`
  asigna el agronomo y responde con la parcela actualizada.
- [ ] **CA-002**: `PATCH /parcelas/:id/agronomo` con `{ "usuarioId": null }`
  desasigna el agronomo.
- [ ] **CA-003**: `PATCH /parcelas/:id/agronomo` con un `usuarioId` que no existe o no tiene rol `AGRONOMO` devuelve `400 Bad Request`.
- [ ] **CA-004**: `GET /productores` autenticado como `AGRONOMO` devuelve solo los productores con al menos una parcela donde
  `agronomo_usuario_id = :userId`.
- [ ] **CA-005**: `GET /productores` autenticado como `ADMIN` devuelve todos los productores (sin cambios de comportamiento).
- [ ] **CA-006**: `GET /parcelas` autenticado como `AGRONOMO` devuelve solo las parcelas con `agronomo_usuario_id = :userId`.
- [ ] **CA-007**: El formulario de crear/editar parcela en admin-web incluye un campo "Agrónomo" que lista solo usuarios activos con rol `AGRONOMO` y permite asignar o dejar sin asignar. La tabla de parcelas muestra el agronomo asignado en una columna.
- [ ] **CA-008**: `pnpm lint`, `pnpm typecheck` y `pnpm build` de `apps/api` pasan sin errores.
- [ ] **CA-009**: `pnpm lint`, `pnpm typecheck` y `pnpm build` de
  `apps/admin-web` pasan sin errores.

## Pruebas

- **unitarias**: Validacion del DTO `UpdateParcelaAgronomoDto`, metodo
  `updateAgronomo` en `ParcelasService`, filtro por rol en
  `ProductoresService.findAll`.
- **integracion**: `PATCH /parcelas/:id/agronomo` con usuario valido, nulo e invalido. `GET /productores` y `GET /parcelas` con token de `AGRONOMO` vs `ADMIN`.
- **manual**: Flujo completo en admin-web: login como ADMIN → ir a
  Mantenimiento → Productores → seleccionar productor → en la tabla de
  parcelas, editar una parcela y asignar un agronomo desde el formulario → verificar que en la app mobile del agronomo solo aparecen sus productores y parcelas asignados.
- **offline-online**: No aplica (sin cambios en mobile/sync).

## Impacto documental

- [x] Arquitectura: se agrega relacion `ParcelaEntity` → `UserEntity`.
- [x] Dominio: se actualiza el modelo de datos de parcelas.
- [ ] Runbook: no requiere cambios.
- [ ] ADR: no requiere decision arquitectonica adicional (el diseno ya esta justificado en esta spec).
- [ ] Variables o despliegue: sin cambios.