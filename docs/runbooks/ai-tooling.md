---
title: Herramientas de IA, OpenCode y OpenGem
status: active
owner: mantenimiento
last_reviewed: 2026-06-25
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
- el subagente `explorador`;
- el agente primario `deepseek-reviewer`;
- el proveedor DeepSeek y los modelos `deepseek-v4-flash` y
  `deepseek-v4-pro`.

En entornos aislados puede ser necesario redirigir temporalmente los
directorios XDG para permitir que OpenCode escriba logs y datos de diagnóstico.

## Explorador

`.opencode/agents/explorador.md` define un subagente de solo lectura. Puede usar
búsqueda y comandos explícitamente permitidos, pero no editar, delegar ni
ejecutar comandos arbitrarios.

Validación:

```powershell
opencode agent list
```

Debe aparecer `explorador (subagent)`.

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

Proceso completo:
`docs/runbooks/ai-assisted-development.md`.

## Skills del proyecto

Codex y OpenCode descubren las skills canónicas desde `.agents/skills/`.
La colección local `.opencode/skills/claude-code-templates/` no es fuente de
verdad del proyecto y no sustituye las skills AgroGest.

Catálogo, reglas y validación:
`docs/runbooks/project-skills.md`.

## Skills portables (claude-code-templates)

### CLI global

```powershell
npm install -g claude-code-templates
```

### Skills instaladas en el proyecto

40 skills del repositorio
[claude-code-templates](https://github.com/davila7/claude-code-templates)
están disponibles en `.opencode/skills/claude-code-templates/`. Cada skill es
un directorio con `SKILL.md` compatible con OpenCode, Claude Code y Codex.

Índice: `.opencode/skills/claude-code-templates/README.md`.

Categorías:

| Categoría | Cantidad | Destacadas |
|---|---|---|
| `database/` | 6 | database-migration, postgresql, postgresql-optimization |
| `development/` | 17 | nestjs-expert, typescript-pro, monorepo-architect, react-best-practices |
| `security/` | 4 | api-security-best-practices, security-audit |
| `testing/` | 4 | testing-patterns, e2e-testing-patterns, code-reviewer |
| `git/` | 2 | commit-smart, git-context-controller |
| `web-development/` | 4 | shadcn, tailwind-design-system, expo-deployment |
| `productivity/` | 3 | skill-creator, debugger, code-review-excellence |

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
