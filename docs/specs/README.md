---
title: Política e índice de especificaciones
status: active
owner: mantenimiento
last_reviewed: 2026-07-01
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
- [Plantilla](TEMPLATE.md)
