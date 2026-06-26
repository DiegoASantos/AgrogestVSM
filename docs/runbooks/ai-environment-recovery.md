---
title: Instalación y recuperación del entorno de IA
status: active
owner: mantenimiento
last_reviewed: 2026-06-26
---

# Instalación y recuperación del entorno de IA

## Alcance

Este runbook permite reconstruir o diagnosticar el entorno de IA usado para
mantener AgroGest VSM: Codex, OpenCode, DeepSeek, OpenGem y Obsidian.

No cubre despliegues, secretos productivos ni conexión a bases de datos de
producción.

## Requisitos

- Node.js compatible con `package.json`;
- pnpm compatible con `packageManager`;
- dependencias instaladas con `pnpm install`;
- OpenCode instalado y conectado a DeepSeek mediante `/connect`;
- Obsidian Desktop instalado si se usará el vault visualmente;
- `docs/` registrado como vault de Obsidian.

Las credenciales se configuran fuera del repositorio. No deben aparecer en
`.env`, `opencode.json`, documentación ni scripts versionados.

## Verificación rápida

```powershell
pnpm ai:doctor
```

Si Obsidian está cerrado, el doctor puede emitir una advertencia. Abrir Obsidian
y repetir el comando. Para validar el resto del entorno sin Obsidian:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/ai/doctor.ps1 -SkipObsidian
```

Validaciones específicas:

```powershell
pnpm docs:check
pnpm ai:agents
pnpm ai:models
pnpm ai:skills
pnpm docs:graph
```

`pnpm ai:skills` puede producir mucha salida porque lista skills globales y del
proyecto.

## OpenCode y DeepSeek

1. Ejecutar OpenCode desde la raíz del repositorio.
2. Usar `/connect`.
3. Configurar el proveedor DeepSeek en el almacén global de OpenCode.
4. Verificar modelos:

```powershell
pnpm ai:models
```

Perfiles versionados:

- `.opencode/agents/explorador.md`: exploración de solo lectura con
  `deepseek/deepseek-v4-flash`;
- `.opencode/agents/deepseek-reviewer.md`: revisión independiente con
  `deepseek/deepseek-v4-pro`.

Comandos de proyecto:

- `/explorar`: usa el subagente `explorador`;
- `/revisar-diff`: revisa el diff actual con `deepseek-reviewer`.

## OpenGem y Obsidian

OpenGem opera sobre `docs/`, que es la documentación oficial y el vault de
Obsidian.

Regenerar grafo:

```powershell
pnpm docs:graph
```

Si Obsidian CLI falla con un error de comunicación, normalmente la aplicación
Desktop no está abierta. Abrir Obsidian y validar:

```powershell
obsidian version
obsidian vaults verbose
obsidian vault=docs vault info=path
```

## Recuperación ante configuración corrupta

Si OpenCode falla por configuración local, probar en este orden:

1. ejecutar el doctor sin Obsidian para aislar la aplicación Desktop:
   `powershell -NoProfile -ExecutionPolicy Bypass -File tools/ai/doctor.ps1 -SkipObsidian`;
2. revisar `.opencode/agents/` y `.opencode/commands/`;
3. si el fallo menciona `C:\Users\USUARIO\.config\opencode`, tratarlo como
   estado global de la herramienta y no como defecto del repositorio;
4. ejecutar OpenCode con configuración pura si la herramienta lo soporta:
   `OPENCODE_PURE=1`;
5. desactivar temporalmente skills externas si generan ruido:
   `OPENCODE_DISABLE_EXTERNAL_SKILLS=1`;
6. reconstruir dependencias con `pnpm install`.

No eliminar `.opencode/skills/claude-code-templates/` como medida de
recuperación. Esa carpeta puede permanecer local y no debe subirse mientras el
mantenedor no lo autorice.

## Señales de entorno sano

- `pnpm docs:check` pasa;
- `pnpm ai:models` muestra modelos DeepSeek;
- `pnpm ai:agents` muestra `explorador` y `deepseek-reviewer`;
- OpenGem puede generar el grafo;
- Obsidian puede abrir el vault `docs`;
- no hay secretos nuevos en `git diff`.
