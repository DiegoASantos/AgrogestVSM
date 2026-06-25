---
title: Política de documentación
status: active
owner: mantenimiento
last_reviewed: 2026-06-25
---

# Política de documentación

## Fuente única

`docs/` es el vault de Obsidian y la documentación oficial versionada. OpenGem y
cualquier IA deben operar sobre esta carpeta. No se permite una segunda
arquitectura, wiki o vault canónico.

## Autoridad por tipo

- arquitectura actual: `docs/architecture/`;
- conceptos y reglas: `docs/domain/`;
- decisiones: `docs/adr/`;
- cambios críticos: `docs/specs/`;
- procedimientos: `docs/runbooks/`;
- operación y riesgos: `docs/operations/`;
- notas temporales: `docs/notes/`.

El código, las migraciones, OpenAPI, pruebas, `package.json` y `.env.example`
siguen siendo las autoridades ejecutables. La documentación debe enlazarlos y
explicarlos, no copiar detalles que se desactualicen fácilmente.

## Metadatos mínimos

Los documentos activos deben declarar:

```yaml
---
title: Nombre
status: active
owner: mantenimiento
last_reviewed: YYYY-MM-DD
---
```

Estados admitidos: `draft`, `active`, `accepted`, `implemented`, `superseded`,
`cancelled` y `archived`.

## Actualización

Todo cambio debe responder si afecta:

- arquitectura;
- modelo o reglas del dominio;
- contrato API;
- datos o migraciones;
- sincronización;
- seguridad;
- variables, despliegue o rollback;
- operación y soporte.

Si afecta uno de estos puntos, el documento oficial se actualiza en el mismo
conjunto de cambios.

## ADR y specs

Un ADR registra por qué se tomó una decisión. No se reescribe para ocultar el
historial: se reemplaza mediante otro ADR.

Una spec registra un cambio crítico antes de implementarlo. Cuando termina,
debe actualizar arquitectura, runbooks o dominio. La spec no se convierte en la
descripción permanente del sistema.

## Notas y OpenGem

OpenGem puede:

- buscar documentación existente;
- agregar notas de sesión;
- actualizar documentos oficiales con alcance explícito;
- proponer promover una nota a ADR, spec o runbook;
- mantener índices.

No puede:

- crear una fuente de verdad paralela;
- promover una conversación automáticamente;
- cambiar una decisión aceptada sin un nuevo ADR;
- duplicar documentos sin comprobar el índice.

## Revisión

Semanalmente o antes de una entrega:

1. revisar cambios de código sin actualización documental;
2. buscar documentos no enlazados desde `docs/index.md`;
3. detectar páginas activas duplicadas;
4. comprobar comandos, rutas y variables;
5. revisar specs implementadas;
6. marcar documentos reemplazados.
