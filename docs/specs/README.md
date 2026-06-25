---
title: Política e índice de especificaciones
status: active
owner: mantenimiento
last_reviewed: 2026-06-25
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
- [Plantilla](TEMPLATE.md)
