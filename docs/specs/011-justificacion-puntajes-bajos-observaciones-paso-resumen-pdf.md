---
title: Justificación de puntajes bajos, observaciones de paso ampliadas y resumen ejecutivo en receta PDF
status: implemented
numero: "011"
area: visitas, calificaciones, mobile, api, database
created: 2026-07-05
approved_by: usuario, 2026-07-05
implemented_in: working tree, 2026-07-05
---

# Spec 011: Justificación de puntajes bajos, observaciones de paso ampliadas y resumen ejecutivo en receta PDF

## Contexto

### Problema 1 — Calificación sin contexto de causa

Actualmente el ingeniero asigna un puntaje de cumplimiento 0-3 al agricultor en
cada módulo (plagas, enfermedades, nutrición, riego, labores). Un puntaje bajo
(0, 1 o 2) indica que el agricultor no cumplió con las recomendaciones, pero no
distingue si fue por negligencia o por una causa externa justificada.

Ejemplo: el agrónomo recomendó regar, pero el agricultor no lo hizo porque el
reservorio estaba seco. Con el sistema actual, el agricultor recibe puntaje bajo
sin que quede registro de que la causa fue ajena a su voluntad.

### Problema 2 — Observaciones de paso solo en plagas y enfermedades

La tabla `visita_paso_observaciones` permite al ingeniero dejar notas textuales
por cada paso del wizard. Actualmente solo los pasos 2 (plagas) y 3
(enfermedades) guardan datos en esta tabla. Los pasos 4 (nutrición), 5 (riego) y
6 (labores) no tienen campo de observación, perdiendo información cualitativa
valiosa que el ingeniero podría querer registrar.

### Problema 3 — Receta poco accesible para el productor

La receta PDF actual entrega toda la información técnica detallada (dosis,
cálculos, ingredientes activos, concentraciones). Si bien es completa, mucha
información puede abrumar al productor, que necesita ver rápido qué productos
comprar y de qué marcas. Falta un resumen ejecutivo al final del documento.

## Alcance

### Incluido

#### Cambio 1 — Justificación de puntajes bajos

- Nuevas columnas en `visita_calificaciones` (PostgreSQL y SQLite):
  `justificado` (boolean nullable), `categoria_justificacion` (varchar 100),
  `motivo_justificacion` (varchar 200).
- Catálogo hardcodeado de 4 categorías con sus motivos en el módulo mobile de
  calificaciones.
- Regla: si `puntaje = 3`, `justificado = null`. Si `puntaje ∈ {0,1,2}`,
  `justificado ∈ {true, false}`.
- Si `justificado = false`: solo se muestra un campo de observación opcional
  (TextInput). No aparecen dropdowns de categoría ni motivo.
- Si `justificado = true`: se muestran dropdown de categoría → dropdown de
  motivo → campo de observación opcional.
- Modificación del componente `ComplianceScoreCard` para incluir Switch
  "Incumplimiento justificado", modales de selección de categoría y motivo, y
  TextInput de observación.
- Modificación de las 5 pantallas del wizard (plagas, enfermedades, nutrición,
  riego, labores) para gestionar los nuevos estados y pasarlos al upsert de
  calificación.
- Sincronización: el handler de calificaciones envía los nuevos campos a la API.
- API: nuevos campos en `UpsertVisitaCalificacionDto` y en la entidad TypeORM.
- Migraciones PostgreSQL (027) y SQLite (v38).

#### Cambio 2 — Observaciones de paso en nutrición, riego y labores

- Agregar un `TextInput` de observación en las pantallas de nutrición (paso 4),
  riego (paso 5) y labores (paso 6).
- Reutilizar la tabla existente `visita_paso_observaciones` con los
  `step_number` 4, 5 y 6.
- Cargar la nota existente al montar cada pantalla.
- Guardar la nota junto con los demás datos del paso en `handleContinue` /
  `handleSave`.

#### Cambio 3 — Resumen ejecutivo en receta PDF

- Agregar una sección "Resumen para el productor" al final de la receta PDF
  (`visita-receta-pdf-report.service.ts`).
- Mostrar tabla de productos fitosanitarios: plaga/enfermedad, producto (marca),
  dosis.
- Mostrar tabla de fertilizantes: fertilizante, vía, dosis.
- No incluye labores ni riego en el resumen (el productor necesita principalmente
  saber qué comprar).

### Excluido

- Modificar la receta agronómica en sí (solo se modifica su representación PDF).
- Administración web del catálogo de justificaciones (es hardcodeado).
- Cambios en el cálculo de score ponderado (spec 008).
- Endpoints nuevos en la API (se reutiliza el mismo endpoint de upsert de
  calificaciones).
- Validación de que `justificado` requiera categoría y motivo a nivel de base de
  datos (la validación es a nivel de API y UI).
- Notificaciones al productor sobre su calificación o justificación.

## Requisitos

### Funcionales — Cambio 1 (Justificación)

- RF-001: Si el puntaje asignado es 3, el campo `justificado` debe ser `null`.
- RF-002: Si el puntaje asignado es 0, 1 o 2, el usuario debe poder indicar si
  el incumplimiento es justificado (`justificado = true`) o injustificado
  (`justificado = false`).
- RF-003: Si `justificado = true`, el usuario debe seleccionar una categoría y
  un motivo. Ambos son obligatorios en ese caso.
- RF-004: Si `justificado = false`, no se muestran los dropdowns de categoría ni
  motivo, solo el campo de observación opcional.
- RF-005: El campo de observación es siempre visible y opcional,
  independientemente del valor de `justificado`.
- RF-006: Las categorías disponibles son:
  - A: Factores económicos y financieros (falta capital, costo elevado, falta crédito)
  - B: Disponibilidad de recursos y logística (desabastecimiento, falta mano de obra, falta maquinaria, problemas de agua)
  - C: Factores climáticos y ambientales (clima adverso, condiciones del suelo)
  - D: Aspectos técnicos y de capacitación (complejidad del manejo, desacuerdo técnico, falta de tiempo/olvido)
- RF-007: Al cambiar la categoría, el dropdown de motivo se resetea.
- RF-008: Al seleccionar puntaje 3, los valores de `justificado`,
  `categoria_justificacion` y `motivo_justificacion` se limpian automáticamente.

### Funcionales — Cambio 2 (Observaciones de paso)

- RF-010: El paso 4 (nutrición) debe tener un campo de observación textual
  opcional que se guarda en `visita_paso_observaciones` con `step_number = 4`.
- RF-011: El paso 5 (riego) debe tener un campo de observación textual opcional
  que se guarda en `visita_paso_observaciones` con `step_number = 5`.
- RF-012: El paso 6 (labores) debe tener un campo de observación textual opcional
  que se guarda en `visita_paso_observaciones` con `step_number = 6`.
- RF-013: La observación de cada paso debe cargarse al entrar a la pantalla
  (si existe un registro previo) y persistirse al guardar el paso.
- RF-014: Si el campo de observación está vacío al guardar, se persiste el
  registro del paso con `observacion = null` cuando el usuario lo dejó vacío. No
  se borra el registro; se modifica su valor.

### Funcionales — Cambio 3 (Resumen PDF)

- RF-020: La receta PDF debe incluir una sección final titulada "Resumen para el
  productor".
- RF-021: El resumen debe listar cada aplicación fitosanitaria con:
  plaga/enfermedad objetivo, nombre del producto comercial (marca), y dosis.
- RF-022: El resumen debe listar cada fertilización con: nombre del fertilizante,
  vía de aplicación, y dosis.
- RF-023: El resumen no incluye cálculos de ingrediente activo, concentraciones,
  coadyuvantes ni orden de mezcla (eso queda en las secciones detalladas
  anteriores).

### No funcionales

- RNF-001: El catálogo de categorías y motivos debe estar en un archivo
  TypeScript independiente (`justification-catalog.ts`) para facilitar
  mantenimiento futuro.
- RNF-002: No se introducen nuevas dependencias de terceros.
- RNF-003: Los dropdowns de categoría y motivo deben usar modales nativos de
  React Native, consistentes con el estilo visual del resto de la app.
- RNF-004: La migración PostgreSQL debe ser no destructiva (solo `ALTER TABLE
  ADD COLUMN IF NOT EXISTS`).

## Contratos afectados

### PostgreSQL — Migración 027

```sql
ALTER TABLE visita_calificaciones ADD COLUMN IF NOT EXISTS justificado boolean;
ALTER TABLE visita_calificaciones ADD COLUMN IF NOT EXISTS categoria_justificacion varchar(100);
ALTER TABLE visita_calificaciones ADD COLUMN IF NOT EXISTS motivo_justificacion varchar(200);
ALTER TABLE visita_paso_observaciones DROP CONSTRAINT IF EXISTS visita_paso_observaciones_paso_check;
ALTER TABLE visita_paso_observaciones ADD CONSTRAINT visita_paso_observaciones_paso_check CHECK (paso BETWEEN 1 AND 6);
```

### SQLite mobile — Migración v38

```sql
ALTER TABLE visita_calificaciones ADD COLUMN justificado INTEGER;
ALTER TABLE visita_calificaciones ADD COLUMN categoria_justificacion TEXT;
ALTER TABLE visita_calificaciones ADD COLUMN motivo_justificacion TEXT;
```

Usar `addColumnIfMissing` para idempotencia.

### API — DTO modificado

```typescript
// UpsertVisitaCalificacionDto — nuevos campos opcionales
justificado?: boolean | null;
categoriaJustificacion?: string | null;
motivoJustificacion?: string | null;
```

El endpoint `POST /visitas-campo/:visitaId/calificaciones` acepta los nuevos
campos. La respuesta incluye los nuevos campos en el objeto de calificación.

### API — Entidad TypeORM modificada

```typescript
// VisitaCalificacionEntity — nuevas columnas
@Column({ name: "justificado", type: "boolean", nullable: true })
justificado!: boolean | null;

@Column({ name: "categoria_justificacion", type: "varchar", length: 100, nullable: true })
categoriaJustificacion!: string | null;

@Column({ name: "motivo_justificacion", type: "varchar", length: 200, nullable: true })
motivoJustificacion!: string | null;
```

### Mobile — Tipos modificados

```typescript
// VisitaCalificacion — nuevos campos
justificado: boolean | null;
categoriaJustificacion: string | null;
motivoJustificacion: string | null;

// UpsertCalificacionInput — nuevos campos opcionales
justificado?: boolean | null;
categoriaJustificacion?: string | null;
motivoJustificacion?: string | null;
```

### Mobile — Sync handler modificado

El handler `handleCalificacion` envía `justificado`, `categoriaJustificacion` y
`motivoJustificacion` en el payload del POST a la API.

### Mobile — `ComplianceScoreCard` (contrato de props)

```typescript
type ComplianceScoreCardProps = {
  value: number | null;
  onChange: (value: number) => void;
  justificado: boolean | null;
  onJustificadoChange: (value: boolean) => void;
  categoriaJustificacion: string | null;
  onCategoriaJustificacionChange: (value: string) => void;
  motivoJustificacion: string | null;
  onMotivoJustificacionChange: (value: string) => void;
  observacion: string;
  onObservacionChange: (value: string) => void;
};
```

### Mobile — Pantallas modificadas

Las 5 pantallas del wizard que usan `ComplianceScoreCard` deben:
1. Agregar 5 nuevos estados (`justificado`, `categoriaJustificacion`,
   `motivoJustificacion`, `justificacionObservacion`, `stepObservation`).
2. Pasar los nuevos props a `ComplianceScoreCard`.
3. Enviar los nuevos campos al hacer `visitaCalificacionesService.upsert(...)`.
4. Persistir la observación de paso vía
   `observacionesSanitariasService.upsertStepNote(visitaId, stepNumber, ...)`.

### Catálogo de justificaciones (nuevo archivo)

```typescript
// apps/mobile/src/modules/visita-calificaciones/types/justification-catalog.ts

export const JUSTIFICACION_CATEGORIAS = [
  {
    id: "economicos",
    label: "Factores económicos y financieros",
    motivos: [
      { id: "falta_capital", label: "Falta de capital de trabajo" },
      { id: "costo_elevado", label: "Costo elevado del insumo" },
      { id: "falta_credito", label: "Falta de acceso a crédito" },
    ],
  },
  {
    id: "recursos",
    label: "Disponibilidad de recursos y logística",
    motivos: [
      { id: "desabastecimiento", label: "Desabastecimiento en el mercado" },
      { id: "falta_mano_obra", label: "Falta de mano de obra" },
      { id: "falta_maquinaria", label: "Falta de maquinaria/herramientas" },
      { id: "problemas_agua", label: "Problemas de agua" },
    ],
  },
  {
    id: "climaticos",
    label: "Factores climáticos y ambientales",
    motivos: [
      { id: "clima_adverso", label: "Clima adverso" },
      { id: "condiciones_suelo", label: "Condiciones del suelo/campo" },
    ],
  },
  {
    id: "tecnicos",
    label: "Aspectos técnicos y de capacitación",
    motivos: [
      { id: "complejidad_manejo", label: "Complejidad del manejo" },
      { id: "desacuerdo_tecnico", label: "Desacuerdo técnico" },
      { id: "falta_tiempo", label: "Falta de tiempo / Olvido" },
    ],
  },
];
```

### Mobile — Receta PDF (resumen ejecutivo)

Nueva función `renderResumenEjecutivo(receta)` en `visita-receta-pdf-report.service.ts`
que se invoca después de `renderLabores` y antes del footer. Renderiza dos tablas
simples con los datos esenciales para el productor.

## Seguridad y datos

- Las nuevas columnas no contienen datos personales. Son valores de catálogo
  predefinidos (IDs de categoría y motivo).
- El campo `observacion` existente ya estaba contemplado en spec 008 como campo
  técnico sin datos personales. Las nuevas observaciones de paso siguen la misma
  política.
- No se agregan nuevos roles ni permisos.
- Los logs no deben registrar los valores de justificación ni observaciones.

## Migración y rollback

### PostgreSQL (027-visita-calificaciones-justificacion)

**Up:**
```sql
ALTER TABLE visita_calificaciones ADD COLUMN IF NOT EXISTS justificado boolean;
ALTER TABLE visita_calificaciones ADD COLUMN IF NOT EXISTS categoria_justificacion varchar(100);
ALTER TABLE visita_calificaciones ADD COLUMN IF NOT EXISTS motivo_justificacion varchar(200);
ALTER TABLE visita_paso_observaciones DROP CONSTRAINT IF EXISTS visita_paso_observaciones_paso_check;
ALTER TABLE visita_paso_observaciones ADD CONSTRAINT visita_paso_observaciones_paso_check CHECK (paso BETWEEN 1 AND 6);
```

**Rollback:**
```sql
ALTER TABLE visita_calificaciones DROP COLUMN IF EXISTS motivo_justificacion;
ALTER TABLE visita_calificaciones DROP COLUMN IF EXISTS categoria_justificacion;
ALTER TABLE visita_calificaciones DROP COLUMN IF EXISTS justificado;
ALTER TABLE visita_paso_observaciones DROP CONSTRAINT IF EXISTS visita_paso_observaciones_paso_check;
ALTER TABLE visita_paso_observaciones ADD CONSTRAINT visita_paso_observaciones_paso_check CHECK (paso BETWEEN 1 AND 5);
```

**Compatibilidad:**
- Las columnas son nullable, por lo que registros existentes quedan con `NULL`.
- La API acepta los nuevos campos como opcionales; clientes antiguos que no los
  envíen no reciben error.
- La migración reemplaza el constraint de pasos `1..5` por `1..6` para permitir
  observaciones del paso de labores.

### SQLite mobile (v38)

**Up:**
```typescript
addColumnIfMissing(db, "visita_calificaciones", "justificado", "INTEGER");
addColumnIfMissing(db, "visita_calificaciones", "categoria_justificacion", "TEXT");
addColumnIfMissing(db, "visita_calificaciones", "motivo_justificacion", "TEXT");
```

**Rollback:**
- Las columnas agregadas con `ALTER TABLE ADD COLUMN` en SQLite no pueden
  eliminarse sin recrear la tabla. Se dejan como columnas huérfanas que no
  afectan el funcionamiento si se revierte el código.
- Para un rollback completo: respaldar la tabla, recrearla sin las columnas
  nuevas, restaurar datos.

## Criterios de aceptación

### Cambio 1 — Justificación

- [ ] CA-001: Al seleccionar puntaje 3, `justificado` se limpia a `null` y no
  se muestra la sección de justificación.
- [ ] CA-002: Al seleccionar puntaje 0, 1 o 2, aparece el switch
  "Incumplimiento justificado".
- [ ] CA-003: Con el switch en "No", solo se muestra el campo de observación
  opcional. Sin dropdowns.
- [ ] CA-004: Al activar el switch a "Sí", aparece el dropdown de categoría.
  Al seleccionar categoría, aparece el dropdown de motivo.
- [ ] CA-005: Al cambiar de categoría, el motivo seleccionado se resetea a vacío.
- [ ] CA-006: La calificación se guarda correctamente con `justificado = null`
  para puntaje 3, y con los valores correspondientes para puntajes 0-2.
- [ ] CA-007: La migración PostgreSQL 027 agrega las 3 columnas y amplía el
  constraint de pasos a `1..6` sin errores.
- [ ] CA-008: La migración SQLite v38 agrega las 3 columnas sin errores.
- [ ] CA-009: El sync envía `justificado`, `categoriaJustificacion` y
  `motivoJustificacion` a la API.

### Cambio 2 — Observaciones de paso

- [ ] CA-010: La pantalla de nutrición muestra un TextInput de observación que
  se guarda en `visita_paso_observaciones` con `step_number = 4`.
- [ ] CA-011: La pantalla de riego muestra un TextInput de observación que se
  guarda con `step_number = 5`.
- [ ] CA-012: La pantalla de labores muestra un TextInput de observación que se
  guarda con `step_number = 6`.
- [ ] CA-013: Al reingresar a una pantalla, la observación previamente guardada
  se carga en el TextInput.

### Cambio 3 — Resumen PDF

- [ ] CA-020: La receta PDF incluye una sección "Resumen para el productor" al
  final del documento.
- [ ] CA-021: El resumen lista cada producto fitosanitario con: plaga/enfermedad,
  marca del producto, y dosis.
- [ ] CA-022: El resumen lista cada fertilizante con: nombre, vía, y dosis.

### Validación global

- [ ] CA-030: `pnpm lint` pasa sin errores.
- [ ] CA-031: `pnpm typecheck` pasa sin errores.
- [ ] CA-032: `pnpm test` pasa.

## Pruebas

### API

- Test de migración 027 (forward).
- Test de creación de calificación con campos de justificación.
- Test de lectura de calificación incluye los nuevos campos.

### Mobile

- Test de `ComplianceScoreCard` con distintos puntajes y estados de
  justificación.
- Test de `visitaCalificacionesRepository` con los nuevos campos en INSERT,
  UPDATE y SELECT.
- Test de sync handler incluye los nuevos campos en el payload.
- Test de `visita_paso_observaciones` para steps 4, 5, 6.

### PDF

- Test de `buildRecetaReportHtml` incluye la nueva sección de resumen.
- Test visual verificando que el HTML generado contiene las tablas de resumen.

### Validación manual

- Flujo completo: guardar calificación con puntaje 0 justificado → verificar en
  SQLite que los campos se guardaron → sincronizar → verificar en PostgreSQL.
- Abrir receta PDF y verificar que el resumen aparece al final.

## Impacto documental

- [ ] Arquitectura: actualizar `docs/domain/data-model.md` con las nuevas
  columnas de `visita_calificaciones`.
- [ ] Dominio: documentar el flujo de justificación de puntajes.
- [ ] Runbook: sin cambios.
- [ ] ADR: sin cambios (cambio aditivo sin decisión arquitectónica significativa).
- [ ] Variables o despliegue: sin cambios.
