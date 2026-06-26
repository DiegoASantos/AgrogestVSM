---
name: agrogest-documentation
description: Mantener la documentación canónica de AgroGest VSM y evaluar impacto documental. Usar al crear o modificar arquitectura, dominio, ADR, specs, runbooks, entornos, riesgos, índices o notas; también al cerrar cambios de código que puedan desactualizar `docs/`. No usar para crear una wiki o fuente de verdad paralela.
---

# Documentación de AgroGest

## Flujo

1. Leer `AGENTS.md`, `docs/index.md` y
   `docs/governance/documentation-policy.md`.
2. Inspeccionar el diff o alcance antes de editar documentación.
3. Clasificar cada dato por autoridad: arquitectura, dominio, ADR, spec,
   runbook, operación o nota temporal.
4. Actualizar el documento vigente; no duplicarlo.
5. Crear ADR solo para una decisión arquitectónica y spec solo para un cambio
   crítico planificado.
6. Enlazar todo documento permanente desde `docs/index.md` y su categoría.
7. Mantener metadatos, estado y `last_reviewed`.
8. Verificar rutas, enlaces, comandos, variables y fuentes ejecutables.

## Reglas

- Tratar `docs/` como único vault y documentación oficial.
- Tratar código, pruebas, migraciones, OpenAPI, `package.json` y
  `.env.example` como autoridades ejecutables.
- Conservar historia en ADR y specs.
- Promover una nota temporal solo después de revisión explícita.
- Registrar deuda o contradicciones en vez de ocultarlas.

## Salida

Indicar documentos modificados, autoridad, evidencia, contradicciones resueltas
y documentación pendiente.

Usar [references/checklist.md](references/checklist.md) para la revisión final.
