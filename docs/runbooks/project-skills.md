---
title: Skills del proyecto
status: active
owner: mantenimiento
last_reviewed: 2026-06-25
---

# Skills del proyecto

## Ubicación canónica

Las skills propias viven en `.agents/skills/`. Codex y OpenCode reconocen esta
ruta. Cada skill contiene:

- `SKILL.md`: disparadores y procedimiento;
- `agents/openai.yaml`: metadatos de interfaz;
- `references/checklist.md`: comprobaciones cargadas bajo demanda.

No copiar las skills a carpetas específicas de un proveedor. Las colecciones
externas dentro de `.opencode/skills/` son locales y no tienen autoridad sobre
AgroGest.

## Catálogo

| Skill | Responsabilidad |
| ----- | --------------- |
| `agrogest-documentation` | Impacto documental y vault canónico |
| `agrogest-api-module` | Módulos, DTOs, Swagger, permisos y pruebas API |
| `agrogest-mobile-sync` | SQLite, outbox, dependencias y reconciliación |
| `agrogest-database-change` | Migraciones, compatibilidad y rollback |
| `agrogest-security-review` | Auth, roles, secretos y exposición |
| `agrogest-release-check` | Gate de calidad, despliegue y recuperación |

## Composición

Una tarea puede usar varias skills. Ejemplos:

- endpoint con nueva tabla: API + database + documentation;
- nueva entidad offline: mobile-sync + database + API + documentation;
- cambio de login: API + security-review + documentation;
- entrega con migración: database + security-review + release-check.

Las skills no autorizan producción, commits, push ni despliegues.

## Validación

Validador oficial de `skill-creator`:

```powershell
python -m pip install PyYAML
$validator = "$HOME\.codex\skills\.system\skill-creator\scripts\quick_validate.py"
Get-ChildItem .agents\skills -Directory |
  Where-Object Name -Like "agrogest-*" |
  ForEach-Object { python $validator $_.FullName }
```

OpenCode:

```powershell
opencode.cmd debug skill
```

Después de agregar o modificar una skill, reiniciar OpenCode para que una sesión
interactiva existente recargue la configuración.

Validación completada el 25 de junio de 2026:

- las seis skills aprobaron `quick_validate.py`;
- OpenCode descubrió las seis desde `.agents/skills/`;
- una prueba de sync añadió controles para binarios y storage durable;
- una prueba de database reforzó rollback correctivo de SQLite;
- una prueba de release alineó comandos permitidos, secretos y rollback Git no
  destructivo.

Refinamiento del 25 de junio de 2026:

- `agrogest-api-module`: paso 1 ahora referencia la ruta canónica
  `apps/api/src/modules/` y el patrón `application/`, `infrastructure/`,
  `presentation/`.
- `agrogest-mobile-sync`: checklist ahora verifica el ciclo de reintentos del
  sync-engine (máx 5, marca `error` solo al agotarlos), y que auth aborta sin
  actualizar `lastSyncTime`.

## Gobierno

- Mantener `SKILL.md` breve y mover detalle al checklist.
- No duplicar documentación oficial dentro de la skill.
- Validar metadatos y disparadores.
- Probar casos realistas de solo lectura antes de declarar la skill estable.
- Actualizar la skill cuando un uso real revele ambigüedad o un paso faltante.

## Colección externa: claude-code-templates

48 skills externas disponibles en `.opencode/skills/claude-code-templates/`,
distribuidas en 7 categorías. Índice completo en
`.opencode/skills/claude-code-templates/README.md`.

### Ampliación del 26 de junio de 2026

Se instalaron 8 skills complementarias para cubrir diseño, arquitectura,
seguridad y QA:

| Skill | Categoría | Propósito |
|---|---|---|
| `frontend-design` | creative-design | Diseño visual, UX patterns |
| `ui-ux-pro-max` | creative-design | UI/UX avanzado, paletas, tipografía |
| `mobile-design` | creative-design | Navegación mobile, performance, testing |
| `senior-frontend` | development | Next.js, React patterns, bundle |
| `senior-backend` | development | API patterns, optimización DB, load testing |
| `senior-architect` | development | Diagramas, dependencias, decisiones técnicas |
| `senior-security` | development | Pentest, modelado de amenazas, criptografía |
| `senior-qa` | development | E2E, coverage, test automation |

Estas skills son portables: cualquier IA (Codex, OpenCode, DeepSeek, Claude)
puede cargarlas desde `.opencode/skills/claude-code-templates/`. Su autoridad
es menor que las skills propias de AgroGest (`.agents/skills/`) y que
`docs/architecture/coding-standards.md`.

### Instalación bajo demanda

```powershell
npx claude-code-templates@latest --skill <categoria/skill> --yes
```

Luego copiar de `.claude/skills/<skill>/` a
`.opencode/skills/claude-code-templates/<categoria>/<skill>/` para
portabilidad entre IAs.

### Coding Standards vinculantes

`docs/architecture/coding-standards.md` anula cualquier patrón por defecto de
los modelos. Toda IA debe leerlo antes de escribir código. Referenciado desde
`AGENTS.md` como lectura obligatoria.
