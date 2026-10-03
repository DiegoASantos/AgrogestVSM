---
title: Múltiples etapas fenológicas por visita
status: implemented
numero: 089
area: visitas-campo
created: 2026-10-02
approved_by: usuario (Implement the plan)
implemented_in: apps/api/src/modules/visitas-campo; apps/api/src/database/migrations/065-etapas-fenologicas-por-visita.ts; apps/mobile/src/modules/visitas-campo; apps/mobile/src/shared/database/migrations.ts; apps/mobile/src/shared/sync/sync-handlers.ts; apps/admin-web/src/modules/visitas
---

# Spec 089: Múltiples etapas fenológicas por visita

## Contexto

Una visita puede observar más de una etapa en la misma parcela. El único porcentaje actual describe avance dentro de la subetapa; el porcentaje nuevo describe cobertura de la parcela y no debe confundirse con él.

## Alcance

### Incluido

- Captura y edición offline de varias etapas o labores en el paso 1.
- Consulta de todas las entradas en detalles y reportes de visitas.
- Persistencia compatible en SQLite y PostgreSQL, sincronizada con la visita padre.

### Excluido

- Recalcular puntajes y tableros con todas las etapas.
- Aplicar migraciones a las bases del proyecto, push y OTA.

## Requisitos

- RF-001: Cada etapa de tipo `Etapa` exige subetapa y cobertura entera de 1 a 100; las coberturas de la visita suman exactamente 100.
- RF-002: Cada etapa o labor puede aparecer una sola vez por visita. Una labor puede estar sola o acompañar etapas, sin entrar en la suma de cobertura; conserva su avance actual cuando corresponda.
- RF-003: La etapa principal es la de mayor cobertura; los empates se resuelven por orden de captura. Si solo hay labores, la primera es principal.
- RF-004: Una visita con una sola etapa inicia con cobertura 100. Las entradas agregadas son opcionales, pero una entrada agregada incompleta impide guardar.
- RF-005: La subetapa se elige independientemente de la cobertura. Los porcentajes anteriores de avance conservan su significado histórico.
- RNF-001: Guardar filas de etapas y visita en una transacción local; sincronizar como un único payload idempotente del padre.
- RNF-002: Conservar los campos escalares y la compatibilidad de clientes instalados; una escritura antigua no puede borrar entradas adicionales.

## Contratos afectados

`POST/PATCH/GET /visitas-campo` agregan `phenologicalStages: { phenologicalStageId, subEtapaId, coveragePercentage, laborProgressPercentage }[]` en orden. El campo escalar existente identifica la principal; `subEtapaPercentage` conserva el significado de avance antiguo y queda nulo para etapas nuevas. SQLite y PostgreSQL agregan una tabla hija de entradas por visita. El alta antigua crea una entrada con cobertura 100 si es `Etapa`.

## Seguridad y datos

Se aplican los permisos existentes de visitas. La API valida cultivo, pertenencia de subetapa, duplicados, límites y suma. La lista se guarda en la transacción de la visita para impedir estados parciales. No se exponen datos personales nuevos.

## Migración y rollback

La migración es aditiva. Cada visita histórica con `Etapa` recibe una entrada de cobertura 100 y conserva su avance anterior en la columna escalar; una `Labor` recibe cobertura nula. El servidor acepta clientes antiguos y nuevos. El rollback operativo despliega el código anterior, que sigue leyendo la principal escalar, y conserva la tabla hija para no perder datos; en SQLite se usa una migración correctiva hacia adelante. No ejecutar migraciones sobre las bases del proyecto en esta entrega.

## Criterios de aceptación

- [ ] CA-001: Una visita con dos etapas, subetapas y coberturas 60/40 se guarda, reabre y sincroniza sin perder filas.
- [ ] CA-002: La API y el móvil rechazan suma distinta de 100, duplicados, subetapas ajenas y entradas incompletas.
- [ ] CA-003: La principal es la de mayor cobertura y los puntajes e indicadores existentes usan esa principal.
- [ ] CA-004: Las labores conservan sus reglas; una visita de solo labor funciona.
- [ ] CA-005: Detalles móvil/web y PDF/Excel muestran todas las entradas con significado correcto.
- [ ] CA-006: Las visitas anteriores y los clientes antiguos siguen funcionando; un reintento no duplica etapas.

## Pruebas

- Unitarias de validación, principal y compatibilidad.
- Integración de persistencia, borrador y reemplazo transaccional.
- Offline-online con desconexión, reintento y edición.
- Revisión manual de accesibilidad y reportes.

## Impacto documental

- [x] Arquitectura de sincronización móvil.
- [x] Modelo del dominio.
- [x] Riesgos y compatibilidad.

## Estado de entrega

Implementación local sin commit. Las migraciones 065 (PostgreSQL) y 76 (SQLite) quedaron escritas y registradas, sin aplicarse a las bases del proyecto por instrucción del usuario. También quedan pendientes el push y el OTA.
