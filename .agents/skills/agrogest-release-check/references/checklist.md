# Gate de release

- Identificar alcance, commit, entorno y componentes.
- Confirmar spec, documentación, riesgos, `pnpm check` y `pnpm build`.
- Revisar contrato de variables sin abrir ni comprobar `.env`.
- Para DB: migración, backup, restore, compatibilidad y health.
- Para web: URL API y flujos críticos.
- Para mobile: OTA frente a build nativo, runtime, canal y sync.
- Definir commit estable, responsable, criterio de cancelación y rollback.
