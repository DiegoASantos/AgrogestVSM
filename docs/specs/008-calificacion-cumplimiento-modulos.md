---
title: Sistema de Calificación de Cumplimiento por Módulo en Visitas
status: implemented
numero: 008
area: visitas, calificaciones, scoring, api, mobile, admin-web, sync, database
created: 2026-07-03
approved_by: usuario, 2026-07-04
implemented_in: apps/api/src/modules/visita-calificaciones/, apps/api/src/database/migrations/026-visita-calificaciones.ts, apps/mobile/src/modules/visita-calificaciones/, apps/admin-web/src/modules/visitas/, apps/admin-web/src/modules/dashboard/
---

# Spec 008: Sistema de Calificación de Cumplimiento por Módulo en Visitas

## Contexto

Actualmente el ingeniero registra una visita de campo compuesta por 5 pasos
(datos básicos, observaciones sanitarias, evaluación nutricional, riego y
labores culturales) y genera una receta agronómica. Para este cambio, mobile
separa visualmente observaciones sanitarias en dos pasos independientes:
plagas y enfermedades. Ambas se siguen guardando en las tablas actuales; la
separación es solo de experiencia y captura. No existe un mecanismo
para evaluar si el agricultor cumplió con las recomendaciones técnicas de la
visita anterior.

El negocio requiere que, a partir de la segunda visita a una parcela, el
ingeniero califique el cumplimiento del agricultor en 5 módulos (plagas,
enfermedades, nutrición, riego, labores) usando una escala 0-3. Para ello
debe poder consultar la receta de la visita anterior como referencia. Esta
información alimenta un score ponderado por etapa fenológica que se calcula
tanto global como por campaña.

## Alcance

### Incluido

- Nueva tabla `visita_calificaciones` en PostgreSQL y SQLite.
- Nueva entidad TypeORM `VisitaCalificacionEntity`.
- Receta agronómica obligatoria para cerrar cada visita desde mobile, porque
  la visita siguiente depende de esa receta para calificar cumplimiento.
- Matriz de pesos por etapa fenológica hardcodeada en la API.
- Lógica de cálculo de score ponderado (0-100) por visita y score
  independiente (0-100) por módulo, global y por campaña.
- Endpoints API:
  - `POST /visitas-campo/:visitaId/calificaciones` (mobile sync).
  - `GET /visitas-campo/:visitaId/calificaciones` (lectura).
  - `GET /parcelas/:parcelaId/visita-anterior-receta` (receta anterior).
  - `GET /productores/:productorId/calificacion` (score general + campaña).
- Modificar `GET /visitas-campo/:id/detalle-completo` para incluir
  calificaciones y nombre de etapa fenológica.
- Componentes mobile:
  - `ScoreSelector`: selector 0-3 con colores semánticos.
  - `PreviousRecipeCard`: card colapsable con receta anterior.
  - `FirstVisitNotice`: aviso informativo en primera visita.
- Modificar las 5 pantallas del wizard para incluir scoring:
  - Paso 1: fetch de receta anterior al guardar.
  - Paso 2: scoring Plagas con receta fitosanidad filtrada por `objetivo=plaga`.
  - Paso 3: scoring Enfermedades con receta fitosanidad filtrada por
    `objetivo=enfermedad`.
  - Paso 4: scoring Nutrición con receta fertilización.
  - Paso 5: scoring Riego con receta riego (siempre obligatorio).
  - Paso 6: scoring Labores con receta labores.
- Regla de auto-3: si no hay datos registrados en un módulo, se asigna
  puntaje 3 automáticamente (excepto Riego que siempre es obligatorio).
- Sincronización mobile: nueva entidad `visita_calificaciones` en outbox.
- Admin web:
  - Mostrar calificaciones en detalle de visita.
  - Mostrar score general + score por campaña en perfil del productor.
  - KPI de score promedio en dashboard.
- Actualizar documentación de dominio y arquitectura.

### Excluido

- Modificar el flujo de creación de receta agronómica (Paso 6 existente).
- Modificar el formulario existente de los pasos 2-5 (solo se añade sección
  de scoring al final).
- Administración web de la matriz de pesos (se mantiene hardcodeada).
- Calificación retroactiva de visitas existentes (no hay visitas previas).
- Modificar el sistema de autenticación, roles o permisos.
- Notificaciones al productor sobre su calificación.

## Requisitos

### Funcionales

- RF-001: La calificación se compone de 5 módulos: `plagas`, `enfermedades`,
  `nutricion`, `riego`, `labores`. Cada módulo recibe un puntaje 0-3.
- RF-002: La primera visita a una parcela NO requiere calificación (no existe
  receta anterior para comparar).
- RF-003: En visitas subsiguientes, la calificación es obligatoria para los 5
  módulos.
- RF-004: Si en el Paso 2 no se registró ninguna plaga, se asigna
  automáticamente `puntaje=3` para `plagas` con observación "Sin plagas
  registradas".
- RF-005: Si en el Paso 2 no se registró ninguna enfermedad, se asigna
  automáticamente `puntaje=3` para `enfermedades` con observación "Sin
  enfermedades registradas".
- RF-006: Si en el Paso 3 no se registraron evaluaciones nutricionales, se
  asigna automáticamente `puntaje=3` para `nutricion`.
- RF-007: El Paso 4 (Riego) es siempre obligatorio, por lo tanto la
  calificación de `riego` siempre es manual.
- RF-008: Si en el Paso 5 no se registraron labores culturales, se asigna
  automáticamente `puntaje=3` para `labores`.
- RF-009: El ingeniero debe poder ver la receta de la visita anterior a la
  misma parcela, filtrada por el módulo correspondiente a cada paso, en una
  card colapsable.
- RF-010: El score ponderado de una visita se calcula como:
  `Score = Σ (puntaje[modulo] / 3 × peso[etapa][modulo])`,
  resultando en un valor 0-100. Si la etapa fenológica no está mapeada, el
  score es `null`.
- RF-011: El score del productor tiene dos valores:
  - `scoreGeneral`: promedio de scores de todas sus visitas con score no nulo.
  - `scorePorCampania`: mapa `campaniaId` → `{ scoreGeneral, scorePorModulo }`
    donde cada campaña reporta el promedio de score ponderado y el desglose
    por módulo dentro de esa campaña.
- RF-012: La matriz de pesos (etapa fenológica → pesos por módulo) está
  hardcodeada en la API en el archivo `weight-matrix.ts` y se resuelve por
  nombre de etapa normalizado: minúsculas, sin tildes, sin signos y con
  espacios convertidos a guion bajo.
- RF-013: El endpoint `GET /parcelas/:parcelaId/visita-anterior-receta`
  retorna la receta completa de la visita más reciente a esa parcela,
  excluyendo la visita actual.
- RF-014: La calificación se sincroniza vía outbox como entidad hija de
  `visitas_campo` (espera a que el padre tenga `serverId`).
- RF-015: La API permite UPSERT por `(visita_id, modulo)` para idempotencia
  en la sincronización.
- RF-016: Si existe visita anterior pero no tiene receta, la API retorna que no
  existe receta anterior calificable; desde la aprobación de esta spec, mobile
  debe exigir receta para finalizar cada visita.
- RF-017: La leyenda de evaluación 0-3 debe estar visible para que el ingeniero
  elija el puntaje con criterio técnico.

### No funcionales

- RNF-001: La card de receta anterior debe iniciar **colapsada** y ocupa
  máximo 48px en ese estado.
- RNF-002: La sección de scoring al final de cada paso debe ocupar máximo
  250px (mitad inferior de la pantalla).
- RNF-003: El ScoreSelector debe mostrar color semántico: rojo(0),
  naranja(1), amarillo(2), verde(3).
- RNF-004: La API debe responder en menos de 500ms para los endpoints de
  consulta de scores.
- RNF-005: La migración debe incluir estrategia de rollback completa.
- RNF-006: No se deben introducir secretos, datos reales ni logs con datos
  personales.

## Contratos afectados

### PostgreSQL — Migración 026

```sql
CREATE TABLE visita_calificaciones (
    id BIGSERIAL PRIMARY KEY,
    public_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    visita_id BIGINT NOT NULL REFERENCES visitas_campo(id) ON DELETE CASCADE,
    modulo VARCHAR(50) NOT NULL,
    puntaje SMALLINT NOT NULL,
    observacion TEXT,
    creado_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_visita_modulo UNIQUE(visita_id, modulo),
    CONSTRAINT chk_calificacion_modulo CHECK(modulo IN (
        'plagas','enfermedades','nutricion','riego','labores'
    )),
    CONSTRAINT chk_calificacion_puntaje CHECK(puntaje >= 0 AND puntaje <= 3)
);

CREATE INDEX idx_calificaciones_visita ON visita_calificaciones(visita_id);
```

### SQLite mobile

```sql
CREATE TABLE IF NOT EXISTS visita_calificaciones (
    local_id TEXT PRIMARY KEY NOT NULL,
    server_id TEXT,
    visita_local_id TEXT NOT NULL,
    modulo TEXT NOT NULL CHECK(modulo IN (
        'plagas','enfermedades','nutricion','riego','labores'
    )),
    puntaje INTEGER NOT NULL CHECK(puntaje >= 0 AND puntaje <= 3),
    observacion TEXT,
    sync_status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (visita_local_id) REFERENCES visitas_campo(local_id) ON DELETE CASCADE,
    UNIQUE(visita_local_id, modulo)
);
```

#### Columna adicional en `visitas_campo` (SQLite)

```sql
ALTER TABLE visitas_campo ADD COLUMN receta_anterior_json TEXT;
```

### API — Endpoints

| Método | Path | Body/Query | Respuesta | Propósito |
|--------|------|-----------|-----------|-----------|
| `POST` | `/visitas-campo/:visitaId/calificaciones` | `{ modulo, puntaje, observacion? }` | `{ id, publicId, ... }` | UPSERT calificación (mobile sync) |
| `GET` | `/visitas-campo/:visitaId/calificaciones` | — | `CalificacionDto[]` | Listar calificaciones de una visita |
| `GET` | `/parcelas/:parcelaId/visita-anterior-receta` | `?excluirVisitaId=` | `{ existe, visitaId, fechaVisita, fitosanidad[], fertilizacion[], riego, labores[] }` o `{ existe: false }` | Receta anterior para referencia |
| `GET` | `/productores/:productorId/calificacion` | `?campania_id=` | `{ scoreGeneral, scorePorModulo, scorePorCampania, totalVisitas, totalVisitasCalificadas }` | Score del productor |

### API — Modificar `getFullDetail`

- Añadir `calificaciones: CalificacionDto[]` a la respuesta.
- Añadir `etapaFenologicaNombre: string | null` al objeto `visita`.

### Mobile — Nueva entidad de sincronización

- `entity_type: 'visita_calificaciones'` en `sync_outbox`.
- Handler: `handleCalificacion()`.
- Dependencia padre: espera a que `visitas_campo` tenga `serverId`.

### Admin web — Tipos nuevos

```typescript
// tipos existentes modificados
VisitaCampoFull['calificaciones']: CalificacionDto[]
VisitaCampoFull['visita']['etapaFenologicaNombre']: string | null

// tipos nuevos
CalificacionDto = {
  id: string;
  publicId: string;
  visitaId: string;
  modulo: 'plagas' | 'enfermedades' | 'nutricion' | 'riego' | 'labores';
  puntaje: number;
  observacion: string | null;
};

ProductorScoreDto = {
  productorId: string;
  scoreGeneral: number | null;
  scorePorCampania: Record<string, {
    scoreGeneral: number | null;
    scorePorModulo: Record<'plagas' | 'enfermedades' | 'nutricion' | 'riego' | 'labores', number | null>;
  }>;
  totalVisitas: number;
  totalVisitasCalificadas: number;
};

RecetaAnteriorDto = {
  existe: boolean;
  visitaId?: string;
  fechaVisita?: string;
  etapaFenologicaNombre?: string;
  fitosanidad?: { producto: string; dosis: string; objetivo: string; plagaEnfermedadNombre: string }[];
  fertilizacion?: { producto: string; dosis: string }[];
  riego?: { tipoRecomendacion: string } | null;
  labores?: { labor: string }[];
};

ScoreSelectorProps = {
  label: string;
  value: number | undefined;
  onChange: (value: number) => void;
  disabled?: boolean;
};

PreviousRecipeCardProps = {
  recetaAnterior: RecetaAnteriorDto;
  modulo: 'fitosanidad' | 'fertilizacion' | 'riego' | 'labores';
};
```

### Matriz de pesos hardcodeada

```typescript
// apps/api/src/modules/visita-calificaciones/domain/weight-matrix.ts

export const STAGE_WEIGHTS: Record<string, Record<string, number>> = {
  poda:              { plagas: 15, enfermedades: 20, nutricion: 25, riego: 15, labores: 25 },
  brotamiento:       { plagas: 25, enfermedades: 20, nutricion: 15, riego: 25, labores: 15 },
  maduracion_del_brote: { plagas: 25, enfermedades: 20, nutricion: 15, riego: 25, labores: 15 },
  induccion_floral:  { plagas: 25, enfermedades: 20, nutricion: 15, riego: 25, labores: 15 },
  floracion:         { plagas: 25, enfermedades: 20, nutricion: 15, riego: 25, labores: 15 },
  amarre_y_cuajado:  { plagas: 25, enfermedades: 15, nutricion: 25, riego: 20, labores: 15 },
  desarrollo_de_fruto: { plagas: 20, enfermedades: 25, nutricion: 15, riego: 25, labores: 15 },
  cosecha:           { plagas: 20, enfermedades: 25, nutricion: 15, riego: 25, labores: 15 },
};
```

### Leyenda de evaluación

- `0`: incumplimiento crítico. El agricultor no aplicó ninguna recomendación
  técnica prescrita.
- `1`: cumplimiento deficiente. La labor fue incompleta, extemporánea o con
  dosis, áreas o moléculas distintas a lo indicado.
- `2`: cumplimiento parcial. Existe disposición, pero hubo fallas en precisión,
  calendario, dosis, sectores o moléculas.
- `3`: cumplimiento óptimo. Cumplimiento estricto y oportuno de dosis,
  moléculas y plazos.

## Seguridad y datos

- No se agregan nuevos roles ni permisos. Los existentes (ADMIN, AGRONOMO)
  aplican a calificaciones con la misma lógica que visitas.
- Las calificaciones no contienen datos personales directamente. El
  `observacion` puede contener notas del ingeniero; debe limitarse a
  observaciones técnicas sin datos personales.
- El score del productor es un agregado numérico sin datos sensibles.
- Los logs no deben registrar puntajes individuales ni observaciones.
- Las calificaciones se heredan de la productor vía las visitas; no hay
  endpoint público que exponga datos sin autenticación.

## Migración y rollback

### PostgreSQL (026-visita-calificaciones)

**Up:**
1. `CREATE TABLE visita_calificaciones (...)` como se especifica en contratos.
2. `CREATE INDEX idx_calificaciones_visita ON visita_calificaciones(visita_id)`.

**Rollback:**
1. `DROP TABLE IF EXISTS visita_calificaciones CASCADE`.

**Compatibilidad:**
- La migración es aditiva (no modifica tablas existentes). No requiere
  cambios en datos existentes.
- Los clientes antiguos ignoran la nueva tabla sin errores.
- La carga de datos nuevos es progresiva (solo nuevas visitas tendrán
  calificaciones).

### SQLite mobile

**Up:**
1. `CREATE TABLE IF NOT EXISTS visita_calificaciones (...)`.
2. `ALTER TABLE visitas_campo ADD COLUMN receta_anterior_json TEXT`.
   (usar `IF NOT EXISTS` o capturar error de columna duplicada)

**Rollback:**
1. `DROP TABLE IF EXISTS visita_calificaciones`.
2. No se revierte la columna `receta_anterior_json` (es aditiva y no causa
   problemas).

**Compatibilidad:**
- La tabla nueva no afecta consultas existentes.
- `ALTER TABLE ADD COLUMN` es seguro en SQLite si se maneja el error de
  columna ya existente.

## Criterios de aceptación

- [ ] CA-001: La migración PostgreSQL 026 crea `visita_calificaciones` con
  todos los constraints e índices especificados.
- [ ] CA-002: La API permite crear una calificación vía
  `POST /visitas-campo/:id/calificaciones` y valida módulo, puntaje y
  unicidad.
- [ ] CA-003: La API devuelve `CalificacionDto[]` en
  `GET /visitas-campo/:id/calificaciones`.
- [ ] CA-004: La API devuelve `CalificacionDto[]` dentro de
  `GET /visitas-campo/:id/detalle-completo`.
- [ ] CA-005: `detalle-completo` incluye `visita.etapaFenologicaNombre`.
- [ ] CA-006: `GET /parcelas/:id/visita-anterior-receta` retorna la receta
  completa de la última visita (cuando existe) o `{ existe: false }`.
- [ ] CA-007: `GET /productores/:id/calificacion` retorna `scoreGeneral`,
  `scorePorModulo`, `scorePorCampania`, `totalVisitas`,
  `totalVisitasCalificadas`.
- [ ] CA-008: El score ponderado usa correctamente la matriz de pesos según
  la etapa fenológica de la visita.
- [ ] CA-009: Una visita sin etapa fenológica mapeada retorna `score = null`.
- [ ] CA-010: El score general es el promedio de scores de todas las visitas.
- [ ] CA-011: El score por campaña es el promedio de scores de visitas de esa
  campaña.
- [ ] CA-012: El SQLite mobile crea `visita_calificaciones` correctamente.
- [ ] CA-013: El componente `ScoreSelector` muestra 4 opciones (0-3) con
  colores semánticos.
- [ ] CA-014: `PreviousRecipeCard` inicia colapsada mostrando solo resumen de
  1 línea.
- [ ] CA-015: Al expandir `PreviousRecipeCard`, se muestra el detalle del
  módulo correspondiente al paso.
- [ ] CA-016: Si no existe receta anterior clasificable, `PreviousRecipeCard`
  muestra el aviso correspondiente y no se muestra selector de scoring.
- [ ] CA-017: En Paso 2, si no hay plagas registradas, se asigna
  automáticamente `plagas=3` al guardar.
- [ ] CA-018: En Paso 3, si no hay enfermedades registradas, se asigna
  automáticamente `enfermedades=3`.
- [ ] CA-019: En Paso 4, si no hay evaluaciones, se asigna automáticamente
  `nutricion=3`.
- [ ] CA-020: En Paso 6, si no hay labores, se asigna automáticamente
  `labores=3`.
- [ ] CA-021: Paso 5 (Riego) siempre requiere calificación manual.
- [ ] CA-022: El outbox sincroniza `visita_calificaciones` después de
  `visitas_campo`.
- [ ] CA-023: La API permite UPSERT por `(visita_id, modulo)` para
  idempotencia en sync.
- [ ] CA-024: El admin web muestra las 5 calificaciones en el detalle de la
  visita.
- [ ] CA-025: El admin web muestra score general + score por campaña en la
  página del productor.
- [ ] CA-026: El dashboard muestra KPI de score promedio.
- [ ] CA-027: `pnpm lint` pasa sin errores.
- [ ] CA-028: `pnpm typecheck` pasa sin errores.
- [ ] CA-029: `pnpm test` pasa con las nuevas pruebas.

## Pruebas

### API

- Test de migración 022 (forward y rollback).
- Test de creación de calificación (éxito, validación de módulo inválido,
  validación de puntaje fuera de rango, duplicado).
- Test de consulta de calificaciones por visita.
- Test de `getFullDetail` incluye calificaciones y etapa fenológica nombre.
- Test de `visita-anterior-receta` (con y sin visita previa).
- Test de `getProductorCalificacion` (score general, score por campaña,
  visita sin pesos, productor sin visitas).
- Test de `resolveStageWeights` (todos los patrones, caso sin match).
- Test de `calcularScoreVisita` (cálculo correcto, módulos parciales).

### Mobile

- Test de creación y lectura de calificaciones en SQLite.
- Test de auto-3 en ausencia de datos.
- Test de `ScoreSelector` (render, selección, colores).
- Test de `PreviousRecipeCard` (colapsado/expandido, módulos).
- Test de sync handler (`handleCalificacion`, dependencia padre).
- Test de outbox para `visita_calificaciones`.

### Admin web

- Test de render de calificaciones en detalle de visita.
- Test de render de scores en perfil de productor.
- Test de KPI de dashboard.

### Validación global

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

## Impacto documental

- [x] Arquitectura: actualizar `docs/domain/data-model.md` con nueva entidad
  `visita_calificaciones` y sus relaciones.
- [x] Dominio: documentar el proceso de calificación de cumplimiento, la
  matriz de pesos y la fórmula de score.
- [ ] Runbook: no se espera actualización.
- [ ] ADR: no se requiere ADR (cambio aditivo sin decisión arquitectónica
  significativa).
- [ ] Variables o despliegue: no aplica.
