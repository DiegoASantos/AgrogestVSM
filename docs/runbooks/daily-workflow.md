---
title: Flujo diario de mantenimiento con IA
status: active
owner: mantenimiento
last_reviewed: 2026-07-01
---

# Flujo diario de mantenimiento con IA

## Tu rol, su rol

```
TÚ (desarrollador)              LA IA (Codex / OpenCode)
─────────────────────            ──────────────────────────
  Define QUÉ hacer                 Decide CÓMO hacerlo
  Aprueba specs y cambios          Propone alcance y diseño
  Revisa diffs y pruebas           Implementa y verifica
  Decide commits y deploys         Carga skills y agentes
  Prueba funcionalmente            Ejecuta validaciones
```

**Tú conservas la decisión. La IA conserva la ejecución.**

---

## Arranque del día

Abrir una terminal en la raíz del proyecto y verificar que el entorno está sano:

```powershell
pnpm ai:doctor
```

Esto diagnostica Node, pnpm, documentación, OpenGem, OpenCode y Obsidian en un solo comando.

Si algo falla, el doctor indica qué componente necesita atención. La guía de
recuperación está en `docs/runbooks/ai-environment-recovery.md`.

---

## Los tres tipos de trabajo

### Tipo 1 — Fix simple (20 min)

> "Arreglá que el endpoint de productores no valida el email correctamente."

**Qué hace la IA:**

1. Lee `AGENTS.md` y `docs/architecture/coding-standards.md`
2. Carga la skill `agrogest-api-module`
3. Busca el DTO relevante con el explorador
4. Corrige la validación en el DTO
5. Agrega un test unitario
6. Ejecuta `pnpm check`
7. Te muestra el diff

**Tu rol:** revisar el diff, probar el endpoint, hacer commit.

---

### Tipo 2 — Feature mediana (2-4 h)

> "Agregá un campo 'teléfono' al productor. Debe aparecer en la API, en el panel admin y en mobile."

**Qué hace la IA:**

1. Lee `AGENTS.md` y `docs/architecture/coding-standards.md`
2. Determina que es un cambio **API + web + mobile** → requiere spec
3. Crea `docs/specs/005-telefono-productor.md` con el TEMPLATE
4. Te la muestra para aprobación

**Tu rol:** revisar la spec, corregir, cambiar `status: draft` → `approved`.

5. **Implementación** — la IA orquesta:
   - `agrogest-database-change` → migración PostgreSQL (nueva columna)
   - `agrogest-api-module` → DTO, entidad, servicio, controlador
   - `agrogest-mobile-sync` → migración SQLite, outbox handler
   - Actualiza DTOs y validaciones en todos los módulos afectados
   - Agrega pruebas de integración en `http-contract.test.ts`
6. Ejecuta `pnpm check` y `pnpm test:coverage`
7. **Revisión** — ejecutás `pnpm ai:review` con DeepSeek
8. DeepSeek devuelve hallazgos → Codex corrige los válidos
9. Actualiza `docs/index.md` y documentación afectada con `agrogest-documentation`
10. Te muestra el diff final

**Tu rol:** aprobar spec, ejecutar la revisión, validar funcionalmente, commit.

---

### Tipo 3 — Cambio crítico (1-2 días)

> "Implementá sincronización offline para el módulo de campañas."

**Qué hace la IA:**

1. Crea spec completa
2. **ADR** para decisiones arquitectónicas si es necesario
3. Planifica con `agrogest-database-change` + `agrogest-mobile-sync` + `agrogest-api-module`
4. Antes de implementar: `agrogest-security-review` si toca auth o datos sensibles
5. Implementa por etapas (migración → API → mobile sync)
6. Revisión con DeepSeek en cada etapa
7. Antes de release: `agrogest-release-check`
8. Actualiza toda la documentación afectada

**Tu rol:** aprobar cada etapa, validar con datos reales en staging, autorizar release.

---

## El ciclo de revisión

Cuando terminás una implementación y querés una segunda opinión:

```powershell
pnpm ai:review -- -Title "Spec 005" -Handoff "docs/notes/handoff-005.md"
```

DeepSeek (`v4-pro`) analiza el diff y entrega tres listas:
- **Defectos comprobados** (debés corregir)
- **Observaciones** (mejoras opcionales)
- **Falsos positivos** (descartados con justificación)

Codex evalúa los hallazgos, corrige los válidos, y justifica los descartados.
Si el diff cambia durante la revisión, DeepSeek debe revisarlo otra vez.

Métricas de cada revisión en `docs/operations/ai-workflow-metrics.md`.

---

## El release

Cuando el cambio está listo para desplegar:

```powershell
# 1. Validación local
pnpm check
pnpm test:coverage
pnpm build

# 2. E2E del panel
pnpm --filter @agrogest/admin-web e2e:ci

# 3. Seguir el checklist
#    docs/runbooks/release-checklist.md
```

La skill `agrogest-release-check` evalúa el release por componente (API Render,
admin Vercel, mobile EAS), confirma migraciones, backup y rollback, y emite uno
de tres veredictos: listo, listo con condiciones, o no listo.

---

## Explorar sin implementar

Cuando necesitás entender algo pero no modificar nada:

```
/explorar ¿cómo funciona el flujo de sincronización de recetas?
```

El explorador (`v4-flash`, solo lectura) busca en el código y la documentación,
devuelve rutas concretas y distingue hechos de inferencias. No gasta tokens del
modelo principal.

---

## Comandos rápidos

| Cuándo | Comando |
|---|---|
| Arrancar el día | `pnpm ai:doctor` |
| Validar todo | `pnpm check` |
| Cobertura | `pnpm test:coverage` |
| Build completo | `pnpm build` |
| E2E panel | `pnpm --filter @agrogest/admin-web e2e:ci` |
| Explorar código | `/explorar <consulta>` |
| Revisar diff | `/revisar-diff` o `pnpm ai:review` |
| Ver agentes | `pnpm ai:agents` |
| Ver modelos | `pnpm ai:models` |
| Ver skills | `pnpm ai:skills` |
| Regenerar grafo | `pnpm docs:graph` |
| Validar docs | `pnpm docs:check` |
| Backup DB | `pnpm db:backup` |
| Restore DB | `pnpm db:restore` |
| Smoke test DB | `pnpm db:smoke` |

---

## La IA como orquestador

Cuando le pedís algo a Codex/OpenCode, internamente ocurre esto:

```
Tu prompt
    │
    ▼
┌──────────────────────────────────────┐
│ Codex / OpenCode (orquestador)       │
│                                      │
│ 1. Lee AGENTS.md + coding-standards  │
│ 2. Determina si requiere spec        │
│ 3. Carga skills relevantes:          │
│    agrogest-api-module               │
│    agrogest-database-change          │
│    agrogest-mobile-sync              │
│    + skills externas si ayudan       │
│ 4. Decide si delega al explorador    │
│    para investigar código existente  │
│ 5. Implementa siguiendo el flujo     │
│    de cada skill                     │
│ 6. Ejecuta pnpm check + build        │
│ 7. Propone revisión con DeepSeek     │
│ 8. Actualiza documentación           │
│ 9. Prepara release si corresponde    │
└──────────────────────────────────────┘
    │
    ▼
Vos revisás el diff, aprobás, commiteás.
```

**No tenés que decirle qué skills cargar.** La IA lee `AGENTS.md`, evalúa el
alcance y carga las skills que corresponden. Vos solo describís el problema o
el cambio que querés.

---

## Lo que nunca hace automático

- Commit o push sin tu autorización
- Conectar a la base de datos de producción
- Borrar datos, tablas o migraciones sin preguntar varias veces
- Cambiar contratos de API sin coordinar consumidores
- Crear documentación nueva sin que se lo pidas
- Introducir dependencias sin verificar `package.json`
- Activar `synchronize` en ejecución normal

---

## Referencias

- [AGENTS.md](../../AGENTS.md) — reglas del repositorio
- [Coding Standards](../architecture/coding-standards.md) — patrones vinculantes
- [Desarrollo asistido por IA](ai-assisted-development.md) — flujo completo
- [Herramientas de IA](ai-tooling.md) — OpenCode, OpenGem, Obsidian
- [Skills del proyecto](project-skills.md) — catálogo y validación
- [Gates de calidad](quality-gates.md) — CI, cobertura, E2E
- [Observabilidad](observability-logs.md) — logs, health, incidentes
- [Checklist de release](release-checklist.md) — antes de desplegar
- [Recuperación del entorno](ai-environment-recovery.md) — si algo falla
- [MCP bajo demanda](mcp-usage.md) — PostgreSQL, GitHub
