---
name: agrogest-api-module
description: Implementar o modificar módulos NestJS de la API AgroGest VSM con DTOs, servicios, entidades, controladores, Swagger, autorización y pruebas coherentes. Usar para endpoints, módulos, catálogos, reglas de negocio o contratos en `apps/api`. Combinar con `agrogest-database-change` si cambia el esquema y con `agrogest-security-review` si afecta auth, roles o datos sensibles.
---

# Módulos API de AgroGest

## Flujo

1. Leer `AGENTS.md`, `docs/index.md` y un módulo vecino comparable en
   `apps/api/src/modules/` (patrón `application/`, `infrastructure/`,
   `presentation/`).
2. Determinar si el cambio exige spec aprobada.
3. Definir contrato, autorización, errores y compatibilidad.
4. Implementar DTOs, servicio, persistencia, controlador y registro del módulo.
5. Mantener guards y roles en la API; nunca depender del frontend.
6. Normalizar respuestas y errores según patrones existentes.
7. Añadir pruebas de reglas, validación, permisos y casos límite.
8. Ejecutar validaciones acotadas y globales proporcionales.
9. Actualizar contratos y documentación afectados.

## Restricciones

- No crear otra arquitectura si un módulo vecino ya define el patrón.
- No introducir secretos ni datos reales.
- No activar `synchronize` en ejecución.
- No cambiar silenciosamente contratos de web o mobile.
- No mezclar refactors amplios con una corrección pequeña.

## Salida

Resumir contrato, permisos, archivos, pruebas, compatibilidad y riesgos.

Usar [references/checklist.md](references/checklist.md) antes de finalizar.
