---
title: Mezclas, factor de incidencia y nueva dosificación en receta
status: implemented
numero: 029
area: receta, fitosanidad, fertilizacion
created: 2026-08-04
approved_by: usuario, 2026-08-04
implemented_in: apps/api, apps/mobile y docs, 2026-08-04
---

# Spec 029: Mezclas, factor de incidencia y nueva dosificación en receta

## Contexto

Hoy `coadyuvantes_ids` y `orden_mezcla` se almacenan en cada fila de
`visita_receta_fitosanidad` (tabla de producto/ingrediente). Si una aplicación
contra una misma plaga/enfermedad tiene 3 productos, esos campos se duplican en
las 3 filas. Esto es incorrecto porque la mezcla es una sola: los coadyuvantes y
el orden pertenecen al tanque de preparación, no a cada producto individual.

Además, la fórmula de dosificación actual (`dosisIa × volumenAplicacion ×
areaHectares` → `totalIa`, luego `/ concentracionProducto` → `totalProducto`)
tiene problemas prácticos:

- El técnico debe conocer la concentración de cada marca para calcular;
- Dos campos (`dosisIa`, `cantidadTotalIa`) son pasos intermedios que
  no usan directamente en campo;
- No existe ajuste según la severidad del problema detectado.

También el orden de mezcla muestra el placeholder genérico "Producto
agroquimico" en vez de los nombres comerciales reales.

Esta spec reemplaza el modelo actual por mezclas explícitas, una fórmula
unificada basada en dosis de producto comercial y un factor derivado de la
incidencia, y un orden de mezcla que nombra cada producto por su marca.

## Alcance

### Incluido

- Tabla `visita_receta_mezcla` (cabecera de cada tanque de preparación).
- Migración de `visita_receta_fitosanidad`: FK hacia mezcla, eliminar
  `coadyuvantes_ids`, `orden_mezcla`, `volumen_aplicacion`, `dosis_ia`,
  `cantidad_total_ia`; renombrar `dosis_ia` como `dosis_producto`.
- Extracción de `coadyuvantes_ids`, `orden_mezcla` y `volumen_aplicacion`
  desde los productos hacia la mezcla.
- Adición de `factor` (derivado de incidencia) a cada mezcla fitosanitaria y
  a cada registro de fertilización.
- Fórmula unificada para fitosanidad y fertilización:
  `cantidadTotal = dosis × volumenAplicacion × factor`.
- UI mobile para declarar cuántas mezclas, asignar productos a cada mezcla,
  seleccionar coadyuvantes y definir orden con nombres comerciales de
  productos.
- El orden de mezcla muestra el nombre comercial real de cada producto en vez
  de "Producto agroquimico".
- Factor editable manualmente solo para grado de incidencia 3.
- Mapping porcentaje→grado→factor usando las funciones de dominio ya
  existentes (`disease-incidence.ts`, `nutrition-incidence.ts`).
- Sync: payload de mezcla anidado en el handler de receta, con skipSync en
  los detalles.
- PDF report con la nueva estructura.
- Validación de incompatibilidades por mezcla (productos que comparten tanque).

### Excluido

- Cambios en los puntajes de calificación de cumplimiento (usan la receta
  anterior, no la actual).
- Cambios en receta de riego y labores (sin modificación).
- Catálogos de coadyuvantes, ingredientes activos, marcas o fertilizantes
  (permanecen igual).
- Consolidación de hallazgos (el endpoint existente no cambia).
- Panel admin-web (si muestra recetas, se actualiza en spec separada).
- Cálculo de área de parcela (sigue usando `areaHectares` donde aplique).

## Requisitos

### RF-001: Tabla `visita_receta_mezcla` (SQLite)

La tabla agrupa los atributos compartidos de cada tanque de preparación
fitosanitaria.

| Columna | Tipo | Descripción |
|---|---|---|
| `local_id` | TEXT PK | Generado con `generateLocalId()` |
| `server_id` | TEXT NULL | Identificador remoto post-sync |
| `receta_local_id` | TEXT NOT NULL | FK a `visita_recetas(local_id)` ON DELETE CASCADE |
| `numero` | INTEGER NOT NULL | 1, 2, 3... |
| `coadyuvantes_ids` | TEXT NULL | JSON string `["1","4"]` |
| `orden_mezcla` | TEXT NULL | JSON string con nombres de coadyuvantes y nombres comerciales de productos |
| `volumen_aplicacion` | TEXT NULL | cilindros/ha (numérico) |
| `factor` | TEXT NOT NULL DEFAULT '1' | numérico |
| `factor_editable` | INTEGER NOT NULL DEFAULT 0 | 1 = usuario puede editar |
| `sync_status` | TEXT NOT NULL DEFAULT 'pending' CHECK(pending\|synced\|error) | |
| `created_at` | TEXT NOT NULL | |
| `updated_at` | TEXT NOT NULL | |

### RF-002: Modificación de `visita_receta_fitosanidad`

| Campo | Acción |
|---|---|
| `mezcla_local_id` | **NUEVO** TEXT NOT NULL FK a `visita_receta_mezcla(local_id)` ON DELETE CASCADE |
| `dosis_producto` | **NUEVO** TEXT NULL (mg o mL de producto comercial por cilindro) |
| `coadyuvantes_ids` | **ELIMINAR** — movido a mezcla |
| `orden_mezcla` | **ELIMINAR** — movido a mezcla |
| `volumen_aplicacion` | **ELIMINAR** — movido a mezcla |
| `dosis_ia` | **ELIMINAR** — reemplazado por `dosis_producto` |
| `cantidad_total_ia` | **ELIMINAR** — ya no se calcula |
| `cantidad_total_producto` | **MANTENER** — recalculado con nueva fórmula |
| `concentracion_producto` | **MANTENER** — informativo, no interviene en cálculo |

Resto de campos (`numero`, `objetivo`, `objetivo_nombre`, `tipo_control_id`,
`tipo_producto_id`, `disolvente`, `modo_accion_id`,
`ingrediente_activo_nombre`, `marca_producto_nombre`, `concentracion_producto`,
`sync_status`, `created_at`, `updated_at`) se conservan sin cambios.

### RF-003: Modificación de `visita_receta_fertilizacion`

| Campo | Acción |
|---|---|
| `factor` | **NUEVO** TEXT NOT NULL DEFAULT '1' |
| `cantidad_total_fertilizante` | **MANTENER** — recalculado con nueva fórmula |

### RF-004: Tabla `visita_receta_mezcla` (PostgreSQL)

Migración espejo con tipos nativos:

| Columna | Tipo PostgreSQL |
|---|---|
| `id` | `bigserial PRIMARY KEY` |
| `receta_id` | `bigint NOT NULL REFERENCES visita_recetas(id) ON DELETE CASCADE` |
| `numero` | `integer NOT NULL` |
| `coadyuvantes_ids` | `text` |
| `orden_mezcla` | `text` |
| `volumen_aplicacion` | `numeric(12,4)` |
| `factor` | `numeric(6,3) NOT NULL DEFAULT 1` |
| `factor_editable` | `boolean NOT NULL DEFAULT false` |
| `creado_at` | `timestamptz NOT NULL DEFAULT now()` |
| `actualizado_at` | `timestamptz NOT NULL DEFAULT now()` |

### RF-005: Nueva fórmula de dosificación

```
cantidadTotal = dosis × volumenAplicacion × factor
```

- **Fitosanidad**: `dosis` = `dosis_producto` (mg o mL de producto comercial
  por cilindro), `volumenAplicacion` = cilindros/ha, resultado en **mg o mL
  por hectárea**.
- **Fertilización**: `dosis` = cantidad por planta o por cilindro,
  `volumenAplicacion` = `cantidadTotalPlantas` (edáfica) o
  `volumenAplicacion` (foliar), resultado en Kg o L.
- El resultado se muestra siempre con la aclaración de unidad.

### RF-006: Factor de incidencia

El factor se deriva del grado de incidencia (0–3) de la plaga, enfermedad o
deficiencia nutricional:

| Grado | Factor | Editable por usuario |
|---|---|---|
| 0 | 1.0 | No |
| 1 | 1.0 | No |
| 2 | 1.2 | No |
| 3 | 1.5 | Sí |

- **Fitosanidad**: si una mezcla contiene productos para varias
  plagas/enfermedades, se usa el **mayor factor** (grado más alto).
- **Fertilización**: cada registro de fertilización usa el factor derivado
  de la incidencia de su deficiencia nutricional correspondiente. Si no hay
  hallazgo vinculado, factor = 1.0.
- El grado se obtiene de las funciones de dominio existentes:
  - Plagas: `incidenceLevelId → incidence_levels.grade`.
  - Enfermedades / Nutrición: `incidencePercentage → resolveDiseaseIncidenceGrade()`
    / `resolveNutritionIncidence()` con mapping 0%→0, 1–5%→1, 6–20%→2, 21–100%→3.
- Solo cuando grado=3, `factor_editable = true` y el usuario puede modificar
  el factor manualmente. La UI muestra el factor en un campo numérico
  editable con el valor precalculado como default.

### RF-007: Flujo de mezclas en UI mobile

1. Usuario registra observaciones sanitarias y evaluaciones (igual que hoy).
2. Usuario agrega productos en la sección fitosanidad (igual que hoy).
3. Al terminar de agregar productos, el sistema muestra un prompt:
   "¿Cuántas mezclas va a preparar?" con selector numérico (mínimo 1).
4. El sistema genera N tarjetas de mezcla (numeradas 1..N).
5. Usuario asigna cada producto fitosanitario a una mezcla mediante un
   selector o drag-and-drop.
6. Para cada mezcla, usuario:
   - Ingresa `volumenAplicacion` (cilindros/ha).
   - Selecciona coadyuvantes (chips multiselect, igual que hoy).
   - El sistema genera el orden de mezcla automático incluyendo los nombres
     comerciales de los productos asignados.
   - Verifica y muestra el factor de incidencia derivado.
7. Usuario puede reordenar manualmente los ítems del orden de mezcla,
   incluidos los nombres comerciales de productos (intercambio como en
   Spec 009).
8. La validación de incompatibilidades (Spec 027) se ejecuta por mezcla
   (productos que comparten tanque).

### RF-008: Orden de mezcla con nombres comerciales

- El orden de mezcla generado automáticamente coloca cada producto por su
  `marcaProductoNombre` en vez del placeholder "Producto agroquimico".
- Si una mezcla contiene varios productos, cada uno aparece como ítem
  independiente en el orden.
- El usuario puede intercambiar la posición de cualquier ítem no fijo
  (Agua permanece fijo en posición 1), igual que Spec 009.
- Al cambiar los coadyuvantes o la asignación de productos, el orden se
  regenera perdiendo el orden manual.

### RF-009: Contrato de API

**POST/PUT `/visitas-campo/:id/receta`**:

```json
{
  "etapaFenologica": "Floracion (45%)",
  "mezclas": [
    {
      "numero": 1,
      "coadyuvantesIds": "[1, 4]",
      "ordenMezcla": "[\"Agua\",\"Corrector de pH\",\"Agrimec\",\"Adherente\"]",
      "volumenAplicacion": 2,
      "factor": 1.2,
      "factorEditable": false,
      "productos": [
        {
          "objetivo": "plaga",
          "objetivoNombre": "Thrips",
          "tipoControlId": 1,
          "tipoProductoId": 2,
          "disolvente": "Agua",
          "modoAccionId": 1,
          "ingredienteActivoNombre": "Abamectina",
          "dosisProducto": 250,
          "marcaProductoNombre": "Agrimec",
          "concentracionProducto": 18,
          "cantidadTotalProducto": 600
        }
      ]
    }
  ],
  "fertilizacion": [
    {
      "viaAplicacion": "foliar",
      "fertilizanteNombre": "Nitrato de potasio",
      "tipoProducto": "solido",
      "dosis": 0.5,
      "unidadDosis": "Kg/cilindro",
      "volumenAplicacion": 3,
      "factor": 1.2,
      "cantidadTotalPlantas": null,
      "cantidadTotalFertilizante": 1.8
    }
  ],
  "riego": { "tipoRecomendacion": "riego_pesado" },
  "labores": [{ "labor": "horqueteo" }]
}
```

**GET** devuelve la misma estructura anidada con `mezclas[]` y cada mezcla
con `productos[]`.

### RF-010: Sync mobile

- `visita_receta_mezcla` usa `skipSyncHandler` como los demás detalles de
  receta. Viaja anidada dentro del payload de `visita_recetas`.
- El handler `handleReceta` mapea las mezclas y sus productos al DTO de API
  (RF-009).
- `markSynced` actualiza `sync_status='synced'` en la tabla `visita_receta_mezcla`
  junto con las demás tablas de detalle.

### RF-011: PDF report

- Agrupa los productos por mezcla.
- Muestra para cada mezcla: número, coadyuvantes, orden de mezcla,
  volumen de aplicación, factor.
- Para cada producto: muestra dosis de producto comercial, no de i.a.
- La sección de fertilización muestra el factor por registro.
- Incluye la aclaración de unidad de resultado (mg o mL por hectárea).

### RNF-001: Idempotencia offline

Las mezclas creadas offline deben conservar `public_id` o `local_id` estable
para soportar reintentos de sync sin duplicados.

### RNF-002: Retrocompatibilidad de migración

La migración SQLite debe preservar los datos existentes: para cada receta
anterior, crear una mezcla por grupo `(numero, objetivo, objetivoNombre)` con
`factor = 1.0` y `coadyuvantes_ids` / `orden_mezcla` / `volumen_aplicacion`
copiados de la primera fila del grupo.

### RNF-003: No regresión en validación de incompatibilidades

Las 12 reglas actuales (`validacion-mezclas.ts`) deben seguir funcionando,
ahora aplicadas por mezcla en vez de por receta completa.

## Contratos afectados

- **SQLite**: nueva tabla `visita_receta_mezcla`; ALTER en
  `visita_receta_fitosanidad` y `visita_receta_fertilizacion`.
- **PostgreSQL**: nueva tabla `visita_receta_mezclas`; ALTER en
  `visita_receta_fitosanidad` y `visita_receta_fertilizacion`.
- **API DTO**: nuevo `MezclaDto`, `FitosanidadProductoDto`;
  `FitosanidadDto` legacy reemplazado; `FertilizacionDto` recibe `factor`.
- **Mobile types**: nuevo `RecetaMezcla`; `RecetaFitosanidad` reducido;
  `RecetaFertilizacion` recibe `factor`.
- **Sync outbox**: `handleReceta` construye payload anidado `mezclas[]`.
- **PDF report**: nuevo layout de mezclas.
- **Validación mezclas**: alcance por mezcla en vez de receta completa.

## Seguridad y datos

- Sin cambios en roles ni autenticación.
- El factor es un dato derivado de dominio agronómico; no expone información
  sensible.
- La migración no elimina datos irreversiblemente: columnas obsoletas se
  marcan como deprecated en la migración y se eliminan en una migración
  futura de limpieza.
- El `orden_mezcla` incluye nombres comerciales que ya estaban presentes en
  la tabla de productos; no se agrega nueva información sensible.

## Migración y rollback

### Avance (migración adelante)

1. **SQLite** (nueva migración en `migrations.ts`):
   - Crear `visita_receta_mezcla`.
   - Para cada receta existente, agrupar `visita_receta_fitosanidad` por
     `(numero, objetivo, objetivo_nombre)`, insertar una mezcla por grupo
     copiando `coadyuvantes_ids`, `orden_mezcla`, `volumen_aplicacion` del
     primer producto del grupo, con `factor = '1'`.
   - Agregar `mezcla_local_id` a `visita_receta_fitosanidad`, asignar FK.
   - Agregar `dosis_producto` copiando el valor actual de `dosis_ia`.
   - Agregar `factor` a `visita_receta_fertilizacion` con DEFAULT '1'.

2. **PostgreSQL** (nueva migración en `apps/api/src/database/migrations/`):
   - Crear `visita_receta_mezclas`.
   - Migrar datos existentes con la misma lógica de agrupación.
   - Agregar columnas nuevas y FKs.
   - Crear índices.

3. **Código**: desplegar API, mobile y admin-web con las nuevas entidades y
   lógica.

### Rollback

- Las columnas obsoletas en `visita_receta_fitosanidad` y
  `visita_receta_fertilizacion` no se eliminan físicamente en la migración
  inicial; solo se agregan las nuevas.
- Rollback de BD: eliminar tabla `visita_receta_mezcla` y columnas nuevas;
  revertir código a versión anterior.
- Rollback de app mobile: publicar versión anterior; los datos nuevos no se
  leerán pero las columnas legacy preservan la info anterior.

## Criterios de aceptación

- [x] CA-001: El usuario puede declarar N mezclas y asignar cada producto
  fitosanitario a una mezcla.
- [x] CA-002: Cada mezcla tiene sus propios coadyuvantes y orden de mezcla,
  que se guardan una sola vez sin duplicarse por producto.
- [x] CA-003: El orden de mezcla muestra los nombres comerciales de los
  productos asignados, y el usuario puede reordenarlos.
- [x] CA-004: La dosis se ingresa como mg o mL de producto comercial por
  cilindro, no como ingrediente activo.
- [x] CA-005: `cantidadTotalProducto = dosis × volumenAplicacion × factor`,
  con resultado en mg o mL por hectárea para fitosanidad.
- [x] CA-006: `cantidadTotalFertilizante = dosis × factorAplicacion × factor`,
  con resultado en Kg o L.
- [x] CA-007: Factor se deriva automáticamente del grado de incidencia;
  solo editable si grado = 3.
- [x] CA-008: Para fertilizantes sin deficiencia nutricional vinculada,
  factor = 1.0.
- [x] CA-009: La validación de incompatibilidades se ejecuta por mezcla.
- [x] CA-010: Sync envía y recibe la estructura anidada `mezclas[] →
  productos[]`.
- [x] CA-011: El PDF agrupa productos por mezcla y muestra factor por
  registro.
- [x] CA-012: Datos anteriores a la migración se conservan con factor = 1.0
  y mezclas reconstruidas por grupo.
- [x] CA-013: Recetas previas a la migración se siguen visualizando
  correctamente.

## Pruebas

- **Unitarias**:
  - `visita-receta-multiple-products.test.ts`: nueva lógica de mezclas,
    asignación de productos, cálculo con factor.
  - `visita-receta-order.test.ts`: orden con nombres comerciales.
  - `validacion-mezclas.test.ts`: validación por mezcla.
  - `visita-recetas.service.test.ts`: build para save con mezclas.
  - Funciones de derivación de factor desde grado.
- **Integración**:
  - Repositorio: CRUD de mezclas, asociación productos→mezcla.
  - PDF: nueva estructura agrupada.
  - Sync: payload con mezclas anidadas.
- **Offline-online**:
  - Crear receta con mezclas sin red, sincronizar al recuperar conexión.
  - Verificar idempotencia (reintentos no duplican mezclas).
- **Migración**:
  - Ejecutar migración SQLite sobre BD con recetas anteriores.
  - Verificar que mezclas se reconstruyen correctamente.
  - Verificar que `factor` queda en '1' para datos históricos.

## Impacto documental

- [x] `docs/domain/data-model.md`: actualizar sección de receta con nueva
  tabla `visita_receta_mezcla` y columnas modificadas.
- [x] `docs/architecture/coding-standards.md`: sin cambios.
- [x] `docs/index.md`: se agregó el enlace exigido por el validador documental.
- [x] `docs/specs/README.md`: registrar Spec 029.
- [x] `docs/specs/009-intercambio-orden-mezcla-coadyuvantes.md`: anotar
  que la spec fue extendida en 029 (nombres comerciales en orden).
- [x] `docs/specs/027-multiples-productos-receta-validacion-incompatibilidades.md`:
  anotar que la validación ahora es por mezcla.
- [x] `docs/notes/`: nota temporal de implementación y handoff.
