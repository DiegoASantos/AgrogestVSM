---
name: agrogest-release-check
description: Evaluar preparación de releases, despliegues y entregas de AgroGest VSM para API Render, admin Vercel y mobile Expo/EAS. Usar antes de commit de release, deploy, OTA, APK o rollback; verifica alcance, pruebas, migraciones, secretos, documentación, compatibilidad y recuperación. No despliega ni hace push sin autorización explícita.
---

# Preparación de releases de AgroGest

## Flujo

1. Identificar componentes, commit, entorno y tipo de entrega.
2. Revisar diff, spec o ADR, riesgos y documentación.
3. Clasificar impacto en API, DB, web, mobile nativo, OTA y contratos.
4. Elegir y ejecutar validaciones proporcionales.
5. Confirmar migraciones, backup, compatibilidad y rollback.
6. Validar nombres y contrato de variables mediante `.env.example`,
   `render.yaml`, `eas.json` y runbooks; no leer ni comprobar archivos `.env`.
7. Definir health checks y smoke tests posteriores.
8. Emitir: listo, listo con condiciones o no listo.
9. Listar bloqueos, confirmaciones humanas y criterio de cancelación.

## Inspección segura

Usar comandos simples de solo lectura como `git status --short`, `git diff`,
`git log` y `git ls-files`. Analizar su salida directamente. No envolverlos en
scripts, pipelines o lógica PowerShell solo para filtrar resultados.

## Reglas

- Un build verde no sustituye validación de datos.
- Una OTA no puede introducir dependencias nativas.
- Rollback de código no revierte datos.
- No usar producción para ensayos.
- No hacer commit, push o deploy sin autorización.
- No declarar listo sin backup y rollback para cambios críticos.
- Tratar existencia y valores de secretos como confirmación manual externa.
- No recomendar `git reset`, `git checkout --` ni limpieza destructiva para
  rollback. Preservar cambios locales; preferir `git revert`, commit correctivo
  o redeploy del commit estable según el contexto.

## Salida

Entregar matriz por componente, evidencia, riesgos, pasos y rollback.

Usar [references/checklist.md](references/checklist.md).
