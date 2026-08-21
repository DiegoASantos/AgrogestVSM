---
title: Índice de documentación
status: active
owner: mantenimiento
last_reviewed: 2026-08-21
---

# Documentación de AgroGest VSM

Este directorio es simultáneamente la documentación oficial del repositorio y
el vault de Obsidian. Git conserva su historial. No existe otro vault canónico.

## Inicio

- [Plan de implementación](PLAN_IMPLEMENTACION.md)
- [Plan módulo clima](plan_modulo_clima_agrogest_vsm.md)
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
- [ADR-004: conectividad efectiva y modo offline controlado en mobile (reemplazado)](adr/004-conectividad-efectiva-mobile.md)
- [ADR-005: calidad de conectividad por alcance HTTP e historial reciente](adr/005-calidad-conectividad-por-alcance-http.md)
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
- [Spec 016: Asignación de parcelas a agrónomos (reemplazada por 041)](specs/016-asignacion-parcelas-agronomos.md)
- [Spec 017: Calificacion de cumplimiento solo para modulos recomendados](specs/017-calificacion-solo-modulos-recomendados.md)
- [Spec 018: Score sanitario independiente para Plagas](specs/018-score-sanitario-plagas.md)
- [Spec 019: Scores técnicos independientes por módulo para mango](specs/019-scores-tecnicos-independientes-mango.md)
- [Spec 020: Módulo clima territorial para el panel web](specs/020-modulo-clima-territorial-web.md)

## Spec 021

- [Clima general móvil por distrito](specs/021-clima-general-mobile-por-distrito.md)
- [Rol analista web de solo lectura](specs/022-rol-analista-web-solo-lectura.md)
- [Selectores dependientes de receta y etapa fenologica obligatoria](specs/023-selectores-receta-y-etapa-obligatoria.md)
- [Concentraciones y unidades de productos en receta mobile](specs/024-concentraciones-unidades-receta.md)
- [Reparación y recarga de concentraciones en receta mobile](specs/025-reparacion-recarga-concentraciones-receta.md)
- [Alta offline de productores con asociación completa en mobile](specs/026-alta-offline-productores-mobile.md)
- [Múltiples productos por recomendación y validación de incompatibilidades en receta](specs/027-multiples-productos-receta-validacion-incompatibilidades.md)
- [Compatibilidad de Home con tablas de sync sin updated_at](specs/028-home-sync-tablas-sin-updated-at.md)
- [Mezclas, factor de incidencia y nueva dosificación en receta](specs/029-mezclas-factor-dosificacion-receta.md)
- [Punto interno de referencia de parcela en mobile](specs/030-punto-interno-parcela-mobile.md)
- [Catálogo sanitario global para etapas y labores de mango](specs/031-catalogo-sanitario-global-mango.md)
- [Reservorios en el Entorno Agroclimático](specs/032-reservorios-entorno-agroclimatico.md)
- [Integracion diaria WeatherLink Davis (reemplazada)](specs/033-integracion-diaria-weatherlink-davis.md)
- [Filtros por fuente y estacion WeatherLink](specs/034-filtros-fuente-estacion-weatherlink.md)
- [Brechas de transmision WeatherLink](specs/035-brechas-transmision-weatherlink.md)
- [Detalle de clima móvil y estaciones WeatherLink](specs/036-detalle-clima-mobile-weatherlink.md)
- [Consulta directa WeatherLink por rango](specs/037-consulta-directa-weatherlink.md)
- [Relacion de marcas mobile con ingrediente activo](specs/038-marcas-mobile-ingrediente-activo.md)
- [Hora de fin al finalizar receta mobile](specs/039-hora-fin-receta-mobile.md)
- [Evapotranspiracion y radiacion diaria en clima mobile](specs/040-et-radiacion-clima-mobile.md)
- [Visibilidad y reactivacion de productores y parcelas en mobile](specs/041-visibilidad-reactivacion-productores-parcelas-mobile.md)

- [Recuperacion y baja segura de catalogos creados desde mobile](specs/042-recuperacion-baja-segura-catalogos-mobile.md)
- [Selector de unidad para dosis fitosanitarias y fertilizantes](specs/043-selector-unidad-dosis-receta.md)
- [Recomendaciones reactivas y preventivas](specs/044-recomendaciones-reactivas-preventivas.md)
- [Conectividad hibrida y modo offline controlado en mobile](specs/045-conectividad-hibrida-mobile.md)
- [Concentraciones ampliadas y permiso para eliminar visitas](specs/046-concentraciones-ampliadas-permiso-eliminar-visitas.md)
- [Reconciliacion de catalogos de receta en mobile](specs/047-reconciliacion-catalogos-receta-mobile.md)
- [Spec 048 cancelada: evaluacion asistida por voz completamente offline](specs/048-evaluacion-asistida-voz-offline.md)
- [Borradores persistentes en visitas mobile](specs/049-borradores-persistentes-visitas-mobile.md)
- [Carga idempotente del catalogo agroquimico desde Excel](specs/050-catalogo-agroquimicos-excel.md)
- [Tutorial visual guiado para el paso 1 de visitas](specs/051-tutorial-guiado-paso-1-visita.md)
- [Busqueda y seleccion bidireccional en recetas mobile](specs/052-busqueda-seleccion-bidireccional-recetas-mobile.md)
- [Fertilizantes por deficiencia nutricional](specs/053-fertilizantes-por-deficiencia-nutricional.md)
- [Ajustes de captura en evaluaciones mobile](specs/054-ajustes-captura-evaluaciones-mobile.md)
- [Acordeones exclusivos en receta mobile](specs/055-acordeones-exclusivos-receta-mobile.md)
- [Acordeones intuitivos en labores y receta mobile](specs/056-acordeones-intuitivos-labores-receta-mobile.md)
- [Receta y mezclas independientes con cierre recuperable](specs/057-receta-y-mezclas-independientes.md)
- [Ajustes UX de receta y mezclas con dosis de coadyuvantes](specs/058-ajustes-ux-receta-mezclas-y-dosis-coadyuvantes.md)
- [Seleccion fitosanitaria simplificada en receta mobile](specs/059-seleccion-fitosanitaria-simplificada.md)
- [Conectividad mobile sin falsos cambios a offline](specs/060-conectividad-mobile-sin-falsos-offline.md)
- [Receta para productor resumida por mezclas](specs/061-receta-productor-resumida-por-mezclas.md)
- [Frecuencia de dosis por mezcla](specs/062-frecuencia-dosis-por-mezcla.md)
- [Desmarcado sanitario coherente con receta mobile](specs/063-desmarcado-sanitario-coherente-receta.md)
- [Fertilización general sin deficiencia nutricional](specs/064-fertilizacion-general-sin-deficiencia.md)
- [Deficiencias nutricionales de Calcio y Fósforo](specs/065-deficiencias-calcio-fosforo.md)

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
