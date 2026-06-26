---
name: agrogest-database-change
description: Planificar, implementar o revisar cambios de PostgreSQL/PostGIS o SQLite en AgroGest VSM, incluyendo migraciones, constraints, índices, datos semilla, compatibilidad, rollback, bootstrap y restore. Usar ante cambios de esquema, entidades TypeORM, geodatos, migraciones mobile o datos estructurales. Requiere spec aprobada y nunca autoriza operar producción.
---

# Cambios de base de datos de AgroGest

## Flujo obligatorio

1. Leer spec, modelo de datos y runbooks de base y rollback.
2. Identificar motores y consumidores afectados.
3. Inventariar esquema desde migraciones y código, no solo entidades.
4. Diseñar expansión → código compatible → datos → contracción posterior.
5. Definir migración, verificación, recuperación y rollback operativo.
6. Registrar orden y mantener idempotencia cuando sea viable.
7. Alinear entidades, constraints, queries, DTOs y seeds.
8. Probar esquema vacío y versión anterior representativa.
9. Ejecutar backup/restore smoke según riesgo.
10. Actualizar documentación y riesgos.

## Reglas

- Mantener `synchronize: false` en ejecución normal.
- Usar bootstrap con synchronize solo en esquema vacío y protegido.
- No hacer cambios irreversibles sin estrategia aprobada.
- No ejecutar contra producción.
- No asumir rollback SQL automático para datos empresariales.
- Para SQLite con datos offline, preferir migración correctiva hacia adelante;
  no recrear o borrar tablas con pendientes como rollback rutinario.
- Mantener compatibilidad con versiones mobile instaladas.

## Salida

Describir precondiciones, secuencia, compatibilidad, verificación y rollback.

Usar [references/checklist.md](references/checklist.md).
