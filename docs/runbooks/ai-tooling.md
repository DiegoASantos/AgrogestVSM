---
title: Herramientas de IA, OpenCode y OpenGem
status: active
owner: mantenimiento
last_reviewed: 2026-06-26
---

# Herramientas de IA, OpenCode y OpenGem

## Configuración versionada

- `AGENTS.md`: instrucciones portables;
- `.agents/skills/`: skills canónicas compartidas;
- `opencode.json`: plugins del proyecto;
- `.opencode/agents/`: subagentes del proyecto;
- `.opengemignore`: exclusiones del grafo;
- `docs/`: vault canónico.

## OpenGem

Versión fijada como dependencia de desarrollo:

```text
@cubocompany/opengem 0.7.5
```

El plugin de OpenCode usa:

```json
{
  "defaultVault": "docs"
}
```

El grafo puede regenerarse con:

```powershell
.\node_modules\.bin\opengem.CMD graph .
```

Los artefactos `.opengem/` y `opengem-out/` son locales y están ignorados por
Git.

## Obsidian CLI

Requisitos:

- Obsidian Desktop 1.12.7 o superior;
- aplicación abierta;
- `docs/` registrado como vault con nombre `docs`;
- activar en Obsidian: `Settings > General > Command line interface`;
- seguir el diálogo para registrar el comando.

Validación:

```powershell
obsidian version
obsidian vaults verbose
obsidian vault=docs vault info=path
obsidian vault=docs read file=index.md
```

Validación completada el 25 de junio de 2026:

- Obsidian CLI `1.12.7`, instalador `1.12.7`;
- vault `docs` registrado con la ruta correcta;
- lectura de `docs/index.md` mediante CLI confirmada.

Obsidian debe permanecer abierto para que el CLI y las herramientas
`obsidian_*` puedan comunicarse con la aplicación.

## OpenCode en este equipo

La instalación validada es OpenCode `1.17.11`.

La configuración del proyecto fue analizada correctamente y reconoce:

- el plugin `@cubocompany/opengem`;
- `defaultVault: "docs"`;
- el subagente `explorador` con `deepseek/deepseek-v4-flash`;
- el reviewer `deepseek-reviewer` con `deepseek/deepseek-v4-pro`;
- el proveedor DeepSeek y los modelos disponibles para el proyecto.

En entornos aislados puede ser necesario redirigir temporalmente los
directorios XDG para permitir que OpenCode escriba logs y datos de diagnóstico.

Perfiles:

| Perfil | Herramienta | Modelo | Permisos |
|---|---|---|---|
| Orquestador e implementador | Codex | Sesión actual | Escritura dentro del alcance aprobado |
| Explorador | OpenCode | `deepseek/deepseek-v4-flash` | Solo lectura |
| Reviewer independiente | OpenCode | `deepseek/deepseek-v4-pro` | Solo lectura |
| Claude futuro | Pendiente | No configurado | Se definirá si aporta valor medido |

Comandos portables:

```powershell
pnpm ai:doctor
pnpm ai:agents
pnpm ai:models
pnpm ai:skills
pnpm docs:graph
```

Recuperación del entorno:
`docs/runbooks/ai-environment-recovery.md`.

## Explorador

`.opencode/agents/explorador.md` define un subagente de solo lectura. Puede usar
búsqueda y comandos explícitamente permitidos, pero no editar, delegar ni
ejecutar comandos arbitrarios.

Validación:

```powershell
opencode agent list
```

Debe aparecer `explorador (subagent)`.

También puede invocarse desde OpenCode con el comando de proyecto:

```text
/explorar <consulta>
```

## DeepSeek Reviewer

`.opencode/agents/deepseek-reviewer.md` fija
`deepseek/deepseek-v4-pro` y niega edición, delegación, skills, red, rutas
externas y comandos que no sean de inspección.

La credencial se guarda mediante `/connect` en el almacén global de OpenCode.
Nunca se incorpora a `opencode.json`, `.env` ni documentación.

Uso:

```powershell
pnpm ai:review -- -Title "Spec NNN" -Handoff "docs/notes/handoff-NNN.md"
```

Para una revisión rápida desde OpenCode:

```text
/revisar-diff <contexto opcional>
```

Proceso completo:
`docs/runbooks/ai-assisted-development.md`.

## Skills del proyecto

Codex y OpenCode descubren las skills canónicas desde `.agents/skills/`.
La colección local `.opencode/skills/claude-code-templates/` no es fuente de
verdad del proyecto y no sustituye las skills AgroGest.

Catálogo, reglas y validación:
`docs/runbooks/project-skills.md`.

## MCP

MCP se activa únicamente por tarea. PostgreSQL MCP se permite inicialmente solo
en lectura, contra local o staging, y nunca contra producción. GitHub MCP se
evalúa por coste de contexto y se evita cuando `git`, GitHub CLI o los runbooks
entregan el mismo resultado con menos ruido.

Política completa:
`docs/runbooks/mcp-usage.md`.

## Skills portables (claude-code-templates)

### CLI global

```powershell
npm install -g claude-code-templates
```

### Skills instaladas en el proyecto

48 skills del repositorio
[claude-code-templates](https://github.com/davila7/claude-code-templates)
están disponibles en `.opencode/skills/claude-code-templates/`. Cada skill es
un directorio con `SKILL.md` compatible con OpenCode, Claude Code y Codex.

Índice: `.opencode/skills/claude-code-templates/README.md`.

Categorías:

| Categoría | Cantidad | Destacadas |
|---|---|---|
| `creative-design/` | 3 | frontend-design, ui-ux-pro-max, mobile-design |
| `database/` | 6 | database-migration, postgresql, postgresql-optimization |
| `development/` | 28 | nestjs-expert, typescript-pro, monorepo-architect, react-best-practices, senior-backend, senior-architect, senior-security, senior-qa |
| `git/` | 2 | commit-smart, git-context-controller |
| `security/` | 4 | api-security-best-practices, security-audit |
| `productivity/` | 3 | skill-creator, debugger, code-review-excellence |
| `web-development/` | 2 | shadcn, tailwind-design-system |

### Instalar más skills bajo demanda

```powershell
npx claude-code-templates@latest --skill <categoria/nombre> --yes
```

Ejemplo:

```powershell
npx claude-code-templates@latest --skill development\docker-expert --yes
npx claude-code-templates@latest --skill security\sql-injection-testing --yes
```

### Portabilidad

Los archivos `SKILL.md` usan YAML frontmatter y markdown estándar. Cualquier IA
que soporte skills puede cargarlos:

- **OpenCode**: se cargan con el tool `skill` o mencionando el nombre
- **Claude Code**: formato nativo de `.claude/skills/`
- **Codex**: compatible con el formato de skills de opencode
- **DeepSeek**: legible como prompt estructurado vía handoff
