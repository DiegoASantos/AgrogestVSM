---
title: Subsectores como hijo de sectores
status: implemented
numero: 007
area: sectores, subsectores, parcelas, visitas, api, admin-web, mobile, mapas, historial, geodatos, reportes, contratos, database
created: 2026-07-01
approved_by: usuario
implemented_in: 2026-07-01
---

# Spec 007: Subsectores como hijo de sectores

## Contexto

Actualmente `parcelas.sector_id` apunta directamente a `sectores.id`. Un
productor puede tener parcelas en varios sectores, y un sector puede tener
parcelas de varios productores. La relacion es indirecta via parcelas.

El negocio requiere una subdivision adicional dentro de cada sector
("subsectores") para agrupar parcelas con mayor granularidad. Existen
subsectores con el mismo nombre en distintos sectores (ej. "Norte" en el Sector
A y "Norte" en el Sector B), por lo que la unicidad es `(sector_id, nombre)`.

La columna `parcelas.sector_id` se reemplaza por `parcelas.subsector_id`.
La relacion entre sectores y parcelas pasa a ser indirecta via subsectores:
`Sector (1) ── Subsector (N) ── Parcela (N)`.

## Aclaraciones aprobadas

- La estrategia de datos es destructiva porque los datos actuales son de prueba.
- El codigo de parcela mantiene formato global `PAR-###`; no se cambia
  `generateNextCode`.
- Las respuestas de parcela devuelven `subsectorId` y `sectorId` derivado para
  compatibilidad temporal.
- Mapas, visitas, historial, geodatos y reportes mobile consumen ese contrato
  compatible mientras migran a `subsectorId`.

## Alcance

### Incluido

- Crear la tabla `subsectores` con FK a `sectores` y unique `(sector_id, nombre)`.
- Migrar `parcelas.sector_id` a `parcelas.subsector_id` con estrategia
  destructiva, descartando datos de prueba incompatibles.
- Implementar CRUD completo de subsectores en API, admin web y contratos.
- Actualizar `parcelas` para que use `subsector_id` en lugar de `sector_id` en
  API, admin web, mobile y contratos.
- Actualizar la cascada de seleccion en mobile: el orden pasa a
  `Productor → Sector → Subsector → Parcela` con auto-seleccion cuando solo
  hay una opcion en cada nivel.
- Actualizar los endpoints existentes que usan `sector_id` en parcelas.
- Agregar los endpoints necesarios para la nueva cascada:
  - `GET /productores/:productorId/sectores/:sectorId/subsectores`
- Migracion PostgreSQL y SQLite con estrategia de compatibilidad y rollback.
- Actualizar la documentacion de dominio afectada.

### Excluido

- Cambiar la relacion `sectores` con `distritos`.
- Cambiar la relacion `productores` con `parcelas`.
- Cambiar la estructura de `visitas_campo` (solo cambia indirectamente via `parcela_id`).
- Cambiar reglas de geodatos mas alla de lo necesario para ajustar el filtro de
  superposicion (de `sector_id` a `subsector_id`).
- Agregar sincronizacion offline para alta local de subsectores (se mantienen
  como catalogo de solo descarga en mobile, igual que sectores).
- Reestructurar pantallas no relacionadas con sectores, subsectores o parcelas.

## Requisitos

### Funcionales

- RF-001: `Subsector` debe pertenecer a un `Sector` mediante FK.
- RF-002: El nombre del subsector debe ser unico dentro de su sector.
- RF-003: `Parcela` debe referenciar a `Subsector` en lugar de `Sector`.
- RF-004: La API debe exponer CRUD de subsectores (crear, listar, obtener,
  actualizar, desactivar).
- RF-005: El endpoint `GET /sectores/:sectorId/subsectores` debe listar los
  subsectores de un sector.
- RF-006: El endpoint `GET /productores/:productorId/sectores` debe seguir
  funcionando con un JOIN a traves de `subsectores → parcelas`.
- RF-007: La cascada mobile debe ser:
  `Productor → Sector → Subsector → Parcela`.
- RF-008: En la cascada mobile, si solo existe una opcion en un nivel, debe
  auto-seleccionarse sin pedir intervencion al usuario.
- RF-009: Si un productor tiene una sola parcela, el selector mobile debe
  resolver automaticamente los 4 niveles y pasar directamente a la visita.
- RF-010: El admin web debe permitir gestionar subsectores dentro de cada
  sector y asociarlos a parcelas.
- RF-011: El codigo de parcela (`PAR-xxx`) mantiene correlativo global y se
  genera con `generateNextCode`; no se cambia a correlativo por subsector.
- RF-012: La validacion de superposicion de geodatos debe considerar parcelas
  vecinas del mismo subsector, no del mismo sector.

### No funcionales

- RNF-001: Los subsectores se descargan como catalogo en mobile (solo lectura).
- RNF-002: Los datos actuales son de prueba y se pueden descartar. La migracion
  puede dropear y recrear tablas sin preservar registros existentes.
- RNF-003: El rollback debe estar documentado y ser verificable.
- RNF-004: No se deben introducir secretos, datos reales ni logs con datos
  personales innecesarios.

## Contratos afectados

### PostgreSQL

```sql
CREATE TABLE subsectores (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sector_id bigint NOT NULL REFERENCES sectores(id) ON DELETE RESTRICT,
  nombre varchar(120) NOT NULL,
  descripcion text,
  activo boolean NOT NULL DEFAULT true,
  creado_at timestamptz NOT NULL DEFAULT now(),
  actualizado_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_subsectores_sector_nombre UNIQUE (sector_id, nombre)
);

CREATE INDEX idx_subsectores_sector_id ON subsectores(sector_id);
```

Migracion de `parcelas`:

1. `ALTER TABLE parcelas ADD COLUMN subsector_id bigint`
2. Crear subsector "General" por cada sector existente
3. `UPDATE parcelas SET subsector_id = (SELECT id FROM subsectores WHERE sector_id = parcelas.sector_id)`
4. `ALTER TABLE parcelas ALTER COLUMN subsector_id SET NOT NULL`
5. `ALTER TABLE parcelas ADD CONSTRAINT fk_parcelas_subsector_id FOREIGN KEY (subsector_id) REFERENCES subsectores(id) ON DELETE RESTRICT`
6. `ALTER TABLE parcelas DROP CONSTRAINT parcelas_productor_id_sector_id_codigo_key`
7. `ALTER TABLE parcelas ADD CONSTRAINT uq_parcelas_productor_subsector_codigo UNIQUE (productor_id, subsector_id, codigo)`
8. `DROP INDEX IF EXISTS idx_parcelas_productor_sector`
9. `CREATE INDEX idx_parcelas_subsector_id ON parcelas(subsector_id)`
10. `CREATE INDEX idx_parcelas_productor_subsector ON parcelas(productor_id, subsector_id)`
11. `ALTER TABLE parcelas DROP COLUMN sector_id`
12. `DROP INDEX IF EXISTS idx_parcelas_productor_id` (redundante con idx_parcelas_productor_subsector)

### API

- Nueva entidad `SubsectorEntity` con relacion `@ManyToOne` a `SectorEntity`.
- `CreateSubsectorDto`: `sectorId` (FK), `name` (required), `description` (opcional),
  `isActive` (opcional, default true).
- `UpdateSubsectorDto`: `PartialType(CreateSubsectorDto)`.
- `SubsectorService`: CRUD + `findBySectorId(sectorId)` +
  `findByProductorAndSector(productorId, sectorId)`.
- `SubsectoresController`: CRUD en `/subsectores`.
- `SectorSubsectoresController`: `GET /sectores/:sectorId/subsectores`.
- `ProductorSectorSubsectoresController`: `GET /productores/:productorId/sectores/:sectorId/subsectores`.
- `ParcelaEntity`: cambiar `sectorId` a `subsectorId`, cambiar relacion a
  `@ManyToOne` con `SubsectorEntity`, actualizar `@Index`.
- `ParcelaService`: cambiar todas las referencias de `sector_id` a
  `subsector_id`, actualizar `generateNextCode` para usar `subsector_id`,
  actualizar validacion de superposicion (`findBySubsectorId`).
- `ParcelaDto`: `sectorId` → `subsectorId`.
- `SectorService.findEntitiesByProductorId`: cambiar JOIN de
  `sector ← parcela` a `sector ← subsector ← parcela`.
- `ProductorService.getStructure`: arbol de
  `productor → sectores → subsectores → parcelas`.

### Admin web

- Nuevo tipo `SubsectorListItem` y `SubsectorPayload`.
- Nuevo servicio `subsectoresService` (CRUD HTTP).
- Nueva pantalla de gestion de subsectores con tabla y formulario.
- Boton "Subsectores" en cada fila de la pantalla de sectores.
- `ParcelaListItem` y `ParcelaPayload`: `sectorId` → `subsectorId`.
- Formulario de parcela: selector de subsector filtrado por sector.
- Pantalla `productor-sectores-management`: arbol de 3 niveles con
  sectores → subsectores → parcelas.
- Validacion de superposicion de geodatos: filtrar por subsector.

### Mobile

SQLite:

```sql
CREATE TABLE IF NOT EXISTS subsectores (
  id TEXT PRIMARY KEY NOT NULL,
  sector_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (sector_id) REFERENCES sectores(id)
);
```

Modificar `parcelas`: `sector_id TEXT NOT NULL` → `subsector_id TEXT NOT NULL`.

Migracion mobile (v35): agregar tabla `subsectores`, migrar `parcelas`
(si hay datos, crear subsector "General" por sector y reasignar).

Nuevos archivos:
- `modules/subsectores/types/subsector.types.ts`
- `modules/subsectores/repositories/subsectores.repository.ts`
- `modules/subsectores/services/subsectores.service.ts`
- `modules/subsectores/services/subsectores.remote.ts`

Repositorios modificados:
- `parcelas.repository.ts`: `sectorId` → `subsectorId`, queries actualizadas.
- `productores.repository.ts`: ahora busca productores por subsector_id.
- `sectores.repository.ts`: `getByProductorId` pasa por subsectores.

Cascada mobile (`NewVisitaSelectorScreen`):
- Paso 1: Productor. Si 1 sola parcela → auto todo → FIN.
- Paso 2: Sector. Si 1 solo sector → auto-seleccionar.
- Paso 3: Subsector. Si 1 solo subsector → auto-seleccionar.
- Paso 4: Parcela. Si 1 sola parcela → auto-seleccionar → FIN.

Seed: incluir subsectores en `downloadAllCatalogs()`.

### Contratos compartidos

- Nueva interfaz `Subsector` en `packages/contracts/src/types/entity-types.ts`.
- `Parcela.sectorId` → `Parcela.subsectorId`.

## Seguridad y datos

- No se agregan nuevos roles ni permisos. Los existentes (ADMIN, AGRONOMO)
  aplican a subsectores con la misma logica que sectores.
- Los datos actuales son de prueba y pueden descartarse. La migracion no
  necesita preservar registros existentes en parcelas, sectores ni
  subsectores.
- Los subsectores no contienen datos personales; solo nombres descriptivos.
- Los logs no deben registrar coordenadas ni datos personales de productores
  salvo errores tecnicos ya normalizados.

## Migracion y rollback

### PostgreSQL (025-subsectores)

> Los datos actuales son de prueba y pueden descartarse. No es necesario
> migrar registros existentes.

**Up:**
1. `DROP TABLE IF EXISTS visitas_campo CASCADE`.
2. `DROP TABLE IF EXISTS parcelas CASCADE`.
3. Crear tabla `subsectores`.
4. Recrear tabla `parcelas` con `subsector_id` en lugar de `sector_id`,
   incluyendo todas las columnas existentes, FKs, unique e indices.
5. Crear indices nuevos.

**Rollback:**
1. Dropear tabla `subsectores`.
2. Dropear y recrear `parcelas` con `sector_id` en lugar de `subsector_id`.
3. Recrear `visitas_campo` si aplica.

### SQLite mobile (v35)

> Los datos locales tambien pueden descartarse. Se simplifica la migracion.

**Up:**
1. `DROP TABLE IF EXISTS parcelas`.
2. `DROP TABLE IF EXISTS subsectores`.
3. Crear `subsectores` desde `SQL_SCHEMA`.
4. Crear `parcelas` desde `SQL_SCHEMA` actualizado (con `subsector_id`).
5. Los catalogos se descargan de nuevo via `downloadAllCatalogs()`.

**Rollback:**
- Dropear `parcelas` y `subsectores`.
- Recrear `parcelas` con `sector_id` desde `SQL_SCHEMA` anterior.

### Compatibilidad

- Los clientes antiguos que solo usan `sector_id` dejaran de funcionar al
  migrar. Esta migracion requiere actualizar API, admin y mobile de forma
  coordinada.
- Los catalogos mobile se descargan completamente, por lo que un cliente
  actualizado obtendra los subsectores automaticamente.

## Criterios de aceptacion

- [ ] CA-001: La migracion PostgreSQL crea `subsectores`, dropea y recrea
  `parcelas` con `subsector_id` y deja todo funcional.
- [ ] CA-002: La API permite crear, listar, obtener, actualizar y desactivar
  subsectores.
- [ ] CA-003: No se puede crear un subsector con el mismo nombre dentro del
  mismo sector.
- [ ] CA-004: La API permite crear una parcela con `subsectorId`.
- [ ] CA-005: `GET /productores/:id/sectores` retorna sectores correctamente
  a traves del JOIN con subsectores.
- [ ] CA-006: `GET /productores/:id/sectores/:sectorId/subsectores` retorna
  subsectores filtrados por productor y sector.
- [ ] CA-007: `GET /productores/:id/estructura` retorna arbol de 3 niveles.
- [ ] CA-008: La validacion de superposicion de geodatos usa el subsector.
- [ ] CA-009: El admin web permite gestionar subsectores y crea parcelas
  con `subsectorId`.
- [ ] CA-010: El mobile migra SQLite dropeando y recreando las tablas
  `parcelas` y `subsectores` sin errores.
- [ ] CA-011: La cascada mobile Productor→Sector→Subsector→Parcela funciona
  con auto-seleccion en niveles con opcion unica.
- [ ] CA-012: El seed mobile descarga subsectores como catalogo.
- [ ] CA-013: `packages/contracts` incluye `Subsector` y modifica `Parcela`.

## Pruebas

- API:
  - test de migracion PostgreSQL (forward y rollback documentado);
  - tests de CRUD de subsectores;
  - test de unicidad de nombre por sector;
  - test de endpoint `GET /productores/:id/sectores` con doble JOIN;
  - test de endpoint `GET /productores/:id/sectores/:sectorId/subsectores`;
  - test de servicio de parcelas con `subsectorId`;
  - test de validacion de superposicion de geodatos por subsector.
- Admin web:
  - test CRUD de subsectores;
  - test de creacion de parcela con subsector.
- Mobile:
  - test de migracion SQLite;
  - test de repositorio y seed de subsectores;
  - test de cascada inteligente en selector de visita.
- Validacion final:
  - `pnpm lint`;
  - `pnpm typecheck`;
  - `pnpm test`;
  - `pnpm build`.

## Impacto documental

- [ ] Arquitectura: actualizar diagrama de entidades en `docs/domain/data-model.md`.
- [ ] Dominio: documentar que Sector se subdivide en Subsector y que Parcela
  ahora pertenece a un Subsector.
- [ ] Runbook: no se espera actualizacion.
- [ ] ADR: no se requiere ADR.
- [ ] Variables o despliegue: no aplica.
