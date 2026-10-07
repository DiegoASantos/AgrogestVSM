---
title: Cobertura compartida de etapas y labores en el paso 1
status: implemented
numero: 090
area: visitas-campo, mobile, API
created: 2026-10-05
approved_by: usuario (Implement the plan, 2026-10-05)
implemented_in: apps/mobile/src/modules/visitas-campo; apps/mobile/src/shared/sync/sync-handlers.ts; apps/api/src/modules/visitas-campo; apps/admin-web/src/modules/visitas
---

# Spec 090: Cobertura compartida de etapas y labores en el paso 1

## Contexto

La spec 089 permite varias etapas y labores, pero el paso 1 usa selectores y
filas adicionales. Solo las etapas reciben cobertura de parcela; las labores
guardan avance. La captura debe mostrar todos los elementos juntos y distribuir
la parcela entre todos los seleccionados.

## Alcance

### Incluido

- Lista compacta de casillas para todas las etapas y labores activas del cultivo,
  sin distintivo de tipo.
- Barra y entrada manual de cobertura por cada selección, imágenes de subetapa
  sobre la barra de las etapas y selector de subetapa separado.
- Validación de suma, compatibilidad de clientes instalados, borradores, detalle
  y reportes de visitas.

### Excluido

- Cambios en el catálogo de etapas y subetapas o en labores culturales del paso 6.
- Reinterpretar los avances de labor de visitas anteriores como cobertura.
- Despliegue, OTA o ejecución de migraciones en bases del proyecto.

## Requisitos

- RF-001: Cada etapa o labor seleccionada una sola vez recibe cobertura entera
  entre 1 y 100. Todas las coberturas de una visita nueva suman 100, incluso si
  solo contiene labores.
- RF-002: La primera selección inicia en 100; las agregadas quedan vacías para
  reparto manual. Se muestra el total y se impide guardar una suma distinta de
  100 o una selección incompleta.
- RF-003: Cada etapa conserva subetapa obligatoria. Sus imágenes se ubican sobre
  la barra según los porcentajes del catálogo, como referencia visual; la
  subetapa se elige en el selector independiente.
- RF-004: La principal es la de mayor cobertura, con empate resuelto por orden
  de selección. Las labores nuevas no capturan avance independiente.
- RF-005: Los avances de labor existentes se conservan como dato histórico al
  leer o editar una visita, sin convertirlos en cobertura.
- RNF-001: El guardado local, borrador, outbox y sincronización conservan orden,
  transacción, idempotencia y recuperación offline.
- RNF-002: La API acepta el payload de clientes anteriores que deja sin
  cobertura las labores, pero impide que una edición antigua borre coberturas
  nuevas.

## Contratos afectados

`phenologicalStages[].coveragePercentage` admite la cobertura de `Etapa` y
`Labor`. Las escrituras nuevas incluyen un indicador de distribución compartida
para distinguirlas de clientes anteriores; la API exige suma 100 en ese modo.
`laborProgressPercentage` queda nulo en nuevas visitas y conserva valores
históricos. `phenologicalStageId` y `subEtapaId` escalares siguen identificando
la entrada principal.

## Seguridad y datos

Continúan los permisos de visitas y la validación de pertenencia al cultivo y
subetapa. La API valida duplicados, límites y suma. No se agregan datos
personales ni se modifica la autorización.

## Migración y rollback

Las tablas de la spec 089 ya permiten `coveragePercentage` en labores; no se
requiere una migración nueva. Los registros antiguos mantienen cobertura nula
en labores y su avance previo. Desplegar API compatible antes del cliente
mobile. El rollback operativo vuelve al código anterior y conserva los datos;
el cliente antiguo no debe reemplazar distribuciones nuevas.

## Criterios de aceptación

- [x] CA-001: Una etapa o una labor sola guarda 100%.
- [x] CA-002: Varias etapas y labores guardan, reabren y sincronizan coberturas
  que suman 100; una suma incorrecta no se guarda.
- [ ] CA-003: Las imágenes se muestran sobre cada barra de etapa y el selector
  de subetapa permanece independiente.
- [x] CA-004: Un avance antiguo de labor continúa visible tras editar la visita.
- [x] CA-005: Un cliente anterior puede crear visitas, pero no borrar una
  cobertura nueva al editarla.
- [x] CA-006: Detalles y reportes distinguen cobertura y avance histórico.

## Pruebas

- Validación de API, principal, compatibilidad y conflictos.
- Captura móvil, borrador, edición, persistencia local y sincronización.
- Revisión manual de lista, casillas, barra, teclado, imágenes y tutorial.

## Impacto documental

- [x] Modelo del dominio.
- [x] Arquitectura de sincronización móvil.
- [x] Índices de documentación.
- [x] Registro de riesgos si queda deuda: la validación visual Android pendiente
  se registra en esta spec; no hay cambios de esquema ni datos pendientes.

## Estado de entrega

Implementación en código; la publicación OTA queda pendiente. La comprobación visual de
casillas, imágenes, barra y teclado en Android queda pendiente porque no hay un
dispositivo conectado. CA-003 se mantiene abierta hasta esa comprobación.
