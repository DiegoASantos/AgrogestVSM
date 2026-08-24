---
title: Política e índice de especificaciones
status: active
owner: mantenimiento
last_reviewed: 2026-08-21
---

# Especificaciones

## Cuándo son obligatorias

- migraciones o cambios de modelo de datos;
- SQLite, outbox o sincronización;
- autenticación, roles o secretos;
- geodatos;
- cambio de contrato entre API, web y mobile;
- cambios destructivos;
- coordinación entre varias aplicaciones.

Los cambios triviales no necesitan una spec completa.

## Estados

```text
draft → approved → implementing → implemented
                   └────────────→ cancelled
```

## Regla posterior

Una spec implementada conserva la historia del cambio, pero debe actualizar los
documentos activos correspondientes.

## Ubicación y numeración

Las specs viven únicamente en `docs/specs/`. No existe un directorio `specs/`
en la raíz.

1. Revisar este índice.
2. Tomar el siguiente número incremental disponible.
3. Copiar `TEMPLATE.md`.
4. Nombrar el archivo `NNN-titulo-breve.md`.
5. Completar el campo `numero` con el mismo valor.

## Índice

- [Spec 001: Validación geoespacial backend pendiente](001-geodata-validation-backend.md)
- [Spec 002: Restaurar ejecución de la prueba mobile de recetas](002-fix-mobile-recipe-test-runner.md)
- [Spec 003: Fundación de seguridad operativa](003-operational-security-foundation.md)
- [Spec 004: Codigo obligatorio de cultivos](004-cultivo-code-obligatorio.md)
- [Spec 005: Entidad de productores](005-productores-entidad.md)
- [Spec 006: Codigo autogenerado de parcelas](006-parcela-codigo-autogenerado.md)
- [Spec 007: Subsectores como hijo de sectores](007-subsectores.md)
- [Spec 008: Sistema de Calificación de Cumplimiento por Módulo en Visitas](008-calificacion-cumplimiento-modulos.md)
- [Spec 009: Intercambio manual de posiciones en el orden de mezcla de coadyuvantes](009-intercambio-orden-mezcla-coadyuvantes.md)
- [Spec 010: Gestor de sincronización adaptativo con tasa de éxito para redes inestables](010-gestor-sync-adaptativo-tasa-exito.md)
- [Spec 011: Justificación de puntajes bajos, observaciones de paso ampliadas y resumen ejecutivo en receta PDF](011-justificacion-puntajes-bajos-observaciones-paso-resumen-pdf.md)
- [Spec 012: Selector de nombre comercial en receta fitosanitaria](012-nombre-comercial-receta-fitosanitaria.md)
- [Spec 013: Paginación y búsqueda en selector de productor mobile](013-paginacion-selector-productor.md)
- [Spec 014: Exportacion protegida para Cost-Build](014-exportacion-cost-build-api-key.md)
- [Spec 015: Sincronizacion robusta en redes inestables y recuperacion de sesion online](015-sync-robusto-redes-inestables.md)
- [Spec 016: Ajustes UX de formularios y valores iniciales de labores culturales](016-ajustes-ux-formularios-y-labores-culturales.md)
- [Spec 017: Calificacion de cumplimiento solo para modulos recomendados](017-calificacion-solo-modulos-recomendados.md)
- [Spec 018: Score sanitario independiente para Plagas](018-score-sanitario-plagas.md)
- [Spec 019: Scores técnicos independientes por módulo para mango](019-scores-tecnicos-independientes-mango.md)
- [Spec 020: Módulo clima territorial para el panel web](020-modulo-clima-territorial-web.md)
- [Spec 021: Clima general móvil por distrito](021-clima-general-mobile-por-distrito.md)
- [Spec 022: Rol analista web de solo lectura](022-rol-analista-web-solo-lectura.md)
- [Spec 023: Selectores dependientes de receta y etapa fenologica obligatoria](023-selectores-receta-y-etapa-obligatoria.md)
- [Spec 024: Concentraciones y unidades de productos en receta mobile](024-concentraciones-unidades-receta.md)
- [Spec 025: Reparación y recarga de concentraciones en receta mobile](025-reparacion-recarga-concentraciones-receta.md)
- [Spec 026: Alta offline de productores con asociacion completa en mobile](026-alta-offline-productores-mobile.md)
- [Spec 027: Múltiples productos por recomendación y validación de incompatibilidades en receta](027-multiples-productos-receta-validacion-incompatibilidades.md)
- [Spec 028: Compatibilidad de Home con tablas de sync sin updated_at](028-home-sync-tablas-sin-updated-at.md)
- [Spec 029: Mezclas, factor de incidencia y nueva dosificación en receta](029-mezclas-factor-dosificacion-receta.md)
- [Spec 030: Punto interno de referencia de parcela en mobile](030-punto-interno-parcela-mobile.md)
- [Spec 031: Catálogo sanitario global para etapas y labores de mango](031-catalogo-sanitario-global-mango.md)
- [Spec 032: Reservorios en el Entorno Agroclimático](032-reservorios-entorno-agroclimatico.md)
- [Spec 033: Integracion diaria WeatherLink Davis (reemplazada)](033-integracion-diaria-weatherlink-davis.md)
- [Spec 034: Filtros por fuente y estacion WeatherLink](034-filtros-fuente-estacion-weatherlink.md)
- [Spec 035: Brechas de transmision WeatherLink](035-brechas-transmision-weatherlink.md)
- [Spec 036: Detalle de clima móvil y estaciones WeatherLink](036-detalle-clima-mobile-weatherlink.md)
- [Spec 037: Consulta directa WeatherLink por rango](037-consulta-directa-weatherlink.md)
- [Spec 038: Relacion de marcas mobile con ingrediente activo](038-marcas-mobile-ingrediente-activo.md)
- [Spec 039: Hora de fin al finalizar receta mobile](039-hora-fin-receta-mobile.md)
- [Spec 040: Evapotranspiracion y radiacion diaria en clima mobile](040-et-radiacion-clima-mobile.md)
- [Spec 041: Visibilidad y reactivacion de productores y parcelas en mobile](041-visibilidad-reactivacion-productores-parcelas-mobile.md)
- [Spec 042: Recuperacion y baja segura de catalogos creados desde mobile](042-recuperacion-baja-segura-catalogos-mobile.md)
- [Spec 043: Selector de unidad para dosis fitosanitarias y fertilizantes](043-selector-unidad-dosis-receta.md)
- [Spec 044: Recomendaciones reactivas y preventivas](044-recomendaciones-reactivas-preventivas.md)
- [Spec 045: Conectividad hibrida y modo offline controlado en mobile](045-conectividad-hibrida-mobile.md)
- [Spec 046: Concentraciones ampliadas y permiso para eliminar visitas](046-concentraciones-ampliadas-permiso-eliminar-visitas.md)
- [Spec 047: Reconciliacion de catalogos de receta en mobile](047-reconciliacion-catalogos-receta-mobile.md)
- [Spec 048 cancelada: Evaluacion asistida por voz completamente offline](048-evaluacion-asistida-voz-offline.md)
- [Spec 049: Borradores persistentes en visitas mobile](049-borradores-persistentes-visitas-mobile.md)
- [Spec 050: Carga idempotente del catalogo agroquimico desde Excel](050-catalogo-agroquimicos-excel.md)
- [Spec 051: Tutorial visual guiado para el paso 1 de visitas](051-tutorial-guiado-paso-1-visita.md)
- [Spec 052: Busqueda y seleccion bidireccional en recetas mobile](052-busqueda-seleccion-bidireccional-recetas-mobile.md)
- [Spec 053: Fertilizantes por deficiencia nutricional](053-fertilizantes-por-deficiencia-nutricional.md)
- [Spec 054: Ajustes de captura en evaluaciones mobile](054-ajustes-captura-evaluaciones-mobile.md)
- [Spec 055: Acordeones exclusivos en receta mobile](055-acordeones-exclusivos-receta-mobile.md)
- [Spec 056: Acordeones intuitivos en labores y receta mobile](056-acordeones-intuitivos-labores-receta-mobile.md)
- [Spec 057: Receta y mezclas independientes con cierre recuperable](057-receta-y-mezclas-independientes.md)
- [Spec 058: Ajustes UX de receta y mezclas con dosis de coadyuvantes](058-ajustes-ux-receta-mezclas-y-dosis-coadyuvantes.md)
- [Spec 059: Seleccion fitosanitaria simplificada en receta mobile](059-seleccion-fitosanitaria-simplificada.md)
- [Spec 060: Conectividad mobile sin falsos cambios a offline](060-conectividad-mobile-sin-falsos-offline.md)
- [Spec 061: Receta para productor resumida por mezclas](061-receta-productor-resumida-por-mezclas.md)
- [Spec 062: Frecuencia de dosis por mezcla](062-frecuencia-dosis-por-mezcla.md)
- [Spec 063: Desmarcado sanitario coherente con receta mobile](063-desmarcado-sanitario-coherente-receta.md)
- [Spec 064: Fertilización general sin deficiencia nutricional](064-fertilizacion-general-sin-deficiencia.md)
- [Spec 065: Deficiencias nutricionales de Calcio y Fósforo](065-deficiencias-calcio-fosforo.md)
- [Spec 066: Catálogo sanitario Mango y score técnico versionado](066-catalogo-sanitario-mango-score-versionado.md)
- [Spec 067: Catálogo sanitario común por etapa y labor](067-catalogo-sanitario-comun-por-etapa.md)
- [Plantilla](TEMPLATE.md)
