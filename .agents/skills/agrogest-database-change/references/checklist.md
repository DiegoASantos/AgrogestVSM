# Checklist de cambio de datos

- Asignar siguiente ID y registrar migración PostgreSQL.
- Alinear constraints, índices, entidades y seeds.
- Validar tipo, SRID y reglas de geodatos.
- Agregar migración SQLite sin perder pendientes.
- Coordinar repositorios, outbox y handlers.
- Definir compatibilidad hacia atrás y adelante.
- Definir backup, consultas de verificación y rollback.
- Preferir corrección hacia adelante para SQLite con datos offline.
- Ejecutar pruebas de migración, `pnpm check`, `pnpm build` y `pnpm db:smoke`
  cuando corresponda.
