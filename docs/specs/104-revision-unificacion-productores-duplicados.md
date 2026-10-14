---
title: Revisión y unificación de personas productoras duplicadas
status: implemented
numero: 104
area: api, admin-web, database, mobile-sync, seguridad
created: 2026-10-13
approved_by: usuario mediante instrucción "Implement the plan", 2026-10-13
implemented_in: apps/api (migración 070 y módulos productores, parcelas, visitas y comercial); apps/admin-web (revisión y campana); apps/mobile (ocultar alias sincronizados en catálogo); docs (modelo, sincronización, runbook y riesgos)
---

# Spec 104: Revisión y unificación de personas productoras duplicadas

## Contexto

Una misma persona puede registrarse con variantes de nombres y quedar asociada
a parcelas y datos comerciales distintos. El documento es opcional y la API
solo rechaza la repetición exacta de tipo y número de documento. Mobile debe
seguir funcionando sin avisos al agrónomo.

## Alcance

### Incluido

- Candidatos de duplicidad entre personas al crear o actualizar y revisión de
  fichas existentes, con aviso para ADMIN y ANALISTA en web.
- Descartar un candidato o elegir manualmente ficha principal y resolver
  conflictos antes de unificar.
- Conservar parcelas, visitas, datos comerciales, fotos y auditoría; mantener
  alias de las identidades secundarias para sincronización pendiente.
- Comparar posibles parcelas repetidas y exigir elección de la parcela principal.

### Excluido

- Fundos, cooperativas y unificación automática basada en nombres.
- Avisos o decisiones de duplicidad en mobile.
- Ejecutar una unificación de datos en producción como parte del despliegue.

## Requisitos

- RF-001: La comparación ignora mayúsculas, tildes, puntuación y espacios. Un
  solo token común no constituye por sí mismo un candidato; otros indicios
  pueden incluir documento, contacto y parcela. Se permite proponer un par
  manualmente en web.
- RF-002: El aviso se crea al recibir una ficha en API y una revisión inicial
  idempotente considera las existentes. Solo ADMIN y ANALISTA ven y resuelven.
- RF-003: La vista previa presenta relaciones, contradicciones y posibles
  parcelas repetidas. No se confirma con documentos diferentes, datos
  comerciales incompatibles ni duplicados de parcelas o acreedores sin resolver.
- RF-004: La operación confirmada es transaccional, auditable e idempotente.
  Conserva la ficha principal elegida y la secundaria como alias no
  seleccionable. Historial, fotos y datos comerciales permanecen accesibles.
- RF-005: Solicitudes móviles pendientes con identificadores antiguos resuelven
  el alias al escribir; ningún pendiente se descarta ni se marca sincronizado
  antes de una confirmación válida de API.
- RF-006: Una invitación comercial pendiente de la ficha secundaria se revoca
  durante la unificación y debe reemitirse desde la ficha principal. Los
  acreedores con misma identidad, banco, cuenta y estado requieren confirmación
  de correspondencia; sus referencias se mueven y el perfil antiguo queda como
  alias. Diferencias de cuenta o estado bloquean la operación.
- RNF-001: La API valida roles, datos y estado en servidor. La UI no sustituye
  autorización. No registrar datos personales o bancarios en logs.
- RNF-002: No trasladar datos automáticamente si cambia la vista previa, si
  existen escrituras concurrentes o si hay conflictos de unicidad.

## Contratos afectados

Nuevas rutas autenticadas de revisión de productores y resultado de
previsualización/unificación. Nuevas tablas de candidatos y auditoría; columnas
de alias en productores, parcelas y acreedores. El listado de productores añade
`mergedAliasPublicIds` para que mobile oculte fichas secundarias ya sincronizadas.
Los contratos móviles de creación existentes
permanecen; la API resuelve identidades secundarias al recibir hijos pendientes.

## Seguridad y datos

Restringir detalle y mutaciones a ADMIN/ANALISTA. La notificación muestra solo
resumen; los datos bancarios se consultan en pantallas protegidas y no se
copian al aviso. El respaldo y la auditoría operativa son obligatorios antes
de ejecutar unificaciones reales.

## Migración y rollback

Migración aditiva y revisión inicial sin unificaciones automáticas. Desplegar
API compatible antes de usar la interfaz web. Para volver atrás, retirar la
interfaz y el servicio de unificación manteniendo alias y auditoría; cualquier
reversión de relaciones tras una operación confirmada requiere respaldos,
manifiesto y verificación de cambios posteriores.

## Criterios de aceptación

- [x] CA-001: Detecta variantes reales y evita aviso por un token común.
- [x] CA-002: Solo ADMIN/ANALISTA revisan, descartan y confirman.
- [x] CA-003: Conflictos impiden unificación hasta su resolución explícita.
- [x] CA-004: Se preservan parcelas, visitas, relaciones comerciales y fotos.
- [x] CA-005: Mobile sincroniza hijos pendientes con alias antiguos sin pérdida.
- [x] CA-006: Revisión inicial y reintentos son idempotentes.

## Pruebas

- Comparación de nombres, documentos y evidencia territorial.
- Vista previa, permisos, transacción, rollback e idempotencia.
- Conflictos de parcela y acreedor, registros comerciales y fotos.
- Sincronización de productor, parcela, visita y foto pendientes.
- Lint, tipos, pruebas, build y documentación.

## Impacto documental

- [x] Arquitectura de sincronización.
- [x] Modelo de dominio.
- [x] Runbook de datos y recuperación.
- [x] Registro de riesgos.
