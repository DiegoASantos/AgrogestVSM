---
title: Índice de documentación
status: active
owner: mantenimiento
last_reviewed: 2026-07-19
---

# Documentación de AgroGest VSM

Este directorio es simultáneamente la documentación oficial del repositorio y
el vault de Obsidian. Git conserva su historial. No existe otro vault canónico.

## Inicio

- [Plan de implementación](PLAN_IMPLEMENTACION.md)
- [Política documental](governance/documentation-policy.md)
- [Plantilla de handoff de IA](governance/ai-handoff-template.md)
- [Plantilla de revisión de IA](governance/ai-review-template.md)
- [Arquitectura general](architecture/overview.md)
- [Riesgos activos](operations/risk-register.md)

## Arquitectura

- [Vista general](architecture/overview.md)
- [Coding Standards](architecture/coding-standards.md) (vinculante para toda IA)
- [Sincronización mobile offline](architecture/mobile-offline-sync.md)

## Dominio

- [Modelo del dominio](domain/data-model.md)
- [Glosario](domain/glossary.md)
- [Cultivos](domain/cultivos.md)

## Decisiones

- [Índice de ADR](adr/README.md)
- [ADR-001: `docs/` como vault canónico](adr/001-docs-vault-canonico.md)
- [ADR-002: equipo inicial de IA reducido](adr/002-equipo-ia-reducido.md)
- [ADR-003: sync adaptativo por tasa de exito](adr/003-sync-adaptativo-por-tasa-exito.md)
- [Plantilla de ADR](adr/TEMPLATE.md)

## Especificaciones

- [Política e índice de specs](specs/README.md)
- [Plantilla de spec](specs/TEMPLATE.md)
- [Spec 001: Validación geoespacial backend pendiente](specs/001-geodata-validation-backend.md)
- [Spec 002: Restaurar prueba mobile de recetas](specs/002-fix-mobile-recipe-test-runner.md)
- [Spec 003: Fundación de seguridad operativa](specs/003-operational-security-foundation.md)
- [Spec 004: Codigo obligatorio de cultivos](specs/004-cultivo-code-obligatorio.md)
- [Spec 005: Entidad de productores](specs/005-productores-entidad.md)
- [Spec 006: Codigo autogenerado de parcelas](specs/006-parcela-codigo-autogenerado.md)
- [Spec 007: Subsectores como hijo de sectores](specs/007-subsectores.md)
- [Spec 008: Sistema de Calificacion de Cumplimiento por Modulo en Visitas](specs/008-calificacion-cumplimiento-modulos.md)
- [Spec 009: Intercambio manual de posiciones en el orden de mezcla de coadyuvantes](specs/009-intercambio-orden-mezcla-coadyuvantes.md)
- [Spec 010: Gestor de sincronizacion adaptativo con tasa de exito para redes inestables](specs/010-gestor-sync-adaptativo-tasa-exito.md)
- [Spec 011: Justificacion de puntajes bajos, observaciones de paso ampliadas y resumen ejecutivo en receta PDF](specs/011-justificacion-puntajes-bajos-observaciones-paso-resumen-pdf.md)
- [Spec 012: Selector de nombre comercial en receta fitosanitaria](specs/012-nombre-comercial-receta-fitosanitaria.md)
- [Spec 013: Paginacion y busqueda de productores en mobile y web](specs/013-paginacion-selector-productor.md)
- [Spec 014: Exportacion protegida para Cost-Build](specs/014-exportacion-cost-build-api-key.md)
- [Spec 015: Sincronizacion robusta en redes inestables y recuperacion de sesion online](specs/015-sync-robusto-redes-inestables.md)
- [Spec 016: Ajustes UX de formularios y valores iniciales de labores culturales](specs/016-ajustes-ux-formularios-y-labores-culturales.md)
- [Spec 017: Calificacion de cumplimiento solo para modulos recomendados](specs/017-calificacion-solo-modulos-recomendados.md)
- [Spec 018: Score sanitario independiente para Plagas](specs/018-score-sanitario-plagas.md)

## Runbooks

- [Flujo diario de mantenimiento con IA](runbooks/daily-workflow.md)
- [Desarrollo local](runbooks/local-development.md)
- [Herramientas de IA, OpenCode y OpenGem](runbooks/ai-tooling.md)
- [Desarrollo asistido por IA](runbooks/ai-assisted-development.md)
- [Skills del proyecto](runbooks/project-skills.md)
- [Gates de calidad y CI](runbooks/quality-gates.md)
- [Checklist de release](runbooks/release-checklist.md)
- [Observabilidad con logs estructurados](runbooks/observability-logs.md)
- [Uso controlado de MCP](runbooks/mcp-usage.md)
- [Instalación y recuperación del entorno de IA](runbooks/ai-environment-recovery.md)
- [Bootstrap de base de datos](runbooks/database-bootstrap.md)
- [Backup y restauración](runbooks/database-backup-restore.md)
- [Rollback](runbooks/rollback.md)
- [Respuesta a incidentes](runbooks/incident-response.md)
- [Deploy de API en Render](runbooks/deploy-api-render.md)
- [Deploy mobile con Expo EAS](runbooks/deploy-mobile-expo.md)

## Operaciones

- [Entornos](operations/environments.md)
- [Línea base de seguridad](operations/security-baseline.md)
- [Registro de riesgos](operations/risk-register.md)
- [Métricas del flujo de IA](operations/ai-workflow-metrics.md)

## Notas

- [Política de notas temporales](notes/README.md)

## Regla de navegación

Antes de crear un documento, comprobar si ya existe una página activa para el
tema. Si existe, actualizarla. Si una página deja de ser vigente, marcarla como
`superseded` o moverla a `archive/`.
