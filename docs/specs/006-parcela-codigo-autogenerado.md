---
title: Codigo autogenerado de parcelas
status: implemented
numero: 006
area: parcelas
created: 2026-07-01
approved_by: usuario
implemented_in: apps/api/src/modules/parcelas; apps/api/src/database/migrations/024-parcela-codigo-sequence.ts; apps/admin-web/src/modules/parcelas; docs/domain/data-model.md
---

# Spec 006: Codigo autogenerado de parcelas

## Contexto

Las parcelas ya tienen un campo `codigo` obligatorio y visible en API, admin web,
mobile, mapas y visitas. Hoy el usuario lo ingresa manualmente al crear una
parcela, lo que obliga a recordar el siguiente correlativo y puede producir
errores o duplicados.

Esta implementacion de parcelas requiere que el codigo se genere automaticamente con
el formato `PAR-001`, `PAR-002`, `PAR-003`, y asi sucesivamente conforme se
registren nuevas parcelas.

## Alcance

### Incluido

- Generar el codigo de parcela en la API al crear una parcela.
- Usar formato fijo `PAR-###` con tres digitos como minimo y crecimiento natural
  cuando el correlativo supere `999` (`PAR-1000`).
- Mantener `codigo` como columna existente; no renombrar ni crear una columna
  nueva.
- Hacer que `CreateParcelaDto.code` sea opcional o deje de formar parte del
  contrato requerido de creacion.
- Evitar que el admin web pida codigo al crear una parcela.
- Mantener el codigo visible en tablas, mapas, selectores y reportes.
- Preservar compatibilidad con mobile como consumidor offline de parcelas ya
  sincronizadas desde la API.
- Agregar pruebas para la generacion, el formato y la concurrencia basica.

### Excluido

- Cambiar el identificador publico `public_id`.
- Permitir edicion manual del codigo generado en el flujo normal de creacion.
- Crear parcelas desde mobile offline.
- Cambiar reglas geoespaciales de parcelas.
- Cambiar relaciones con productores, sectores o visitas.

## Requisitos

- RF-001: `POST /parcelas` debe aceptar un payload sin `code`.
- RF-002: al crear una parcela, la API debe asignar el siguiente codigo
  disponible con prefijo `PAR-`.
- RF-003: el correlativo se calcula de forma global sobre la tabla `parcelas`,
  no por productor ni por sector.
- RF-004: los codigos existentes que no coincidan con `PAR-<numero>` no deben
  romper la generacion; simplemente no participan del calculo del maximo.
- RF-005: si existen `PAR-001` y `PAR-003`, el siguiente codigo debe ser
  `PAR-004`; no se reutilizan huecos.
- RF-006: `PATCH /parcelas/:id` debe conservar el codigo actual si no se envia
  `code`.
- RF-007: el admin web no debe mostrar el campo codigo al crear una parcela.
- RF-008: el admin web puede seguir mostrando el codigo en listados, filtros y
  vistas de detalle.
- RF-009: mobile debe seguir almacenando y mostrando `code` como dato requerido
  recibido desde la API.
- RNF-001: la generacion debe evitar duplicados ante creaciones concurrentes.
- RNF-002: el cambio debe mantener compatibilidad con datos historicos.
- RNF-003: los mensajes de validacion deben estar en espanol cuando sean visibles
  para el usuario.

## Contratos afectados

- API:
  - `POST /parcelas`: `code` deja de ser requerido.
  - Respuesta de parcela: `code` sigue siendo string no nulo.
  - `PATCH /parcelas/:id`: `code` puede mantenerse opcional para compatibilidad,
    pero no forma parte del flujo normal de edicion desde admin.
- PostgreSQL:
  - `parcelas.codigo` se mantiene `NOT NULL`.
  - Se recomienda una secuencia o estrategia transaccional en base de datos para
    evitar codigos duplicados.
- Admin web:
  - formulario de creacion no envia `code`;
  - formulario de edicion no debe forzar capturar codigo.
- Mobile:
  - no cambia SQLite si `code TEXT NOT NULL` se mantiene como dato recibido de la
    API;
  - no cambia outbox porque mobile no crea parcelas offline.
- Contratos compartidos:
  - `Parcela.code` sigue siendo requerido en respuestas y cache local.

## Seguridad y datos

El codigo de parcela no es secreto ni dato sensible, pero forma parte de la
identificacion operativa de la parcela. La API debe ser la fuente de verdad para
evitar manipulacion desde clientes.

La generacion global evita que dos parcelas de distintos sectores compartan el
mismo codigo visible, aunque se mantenga la restriccion historica por productor y
sector mientras no se requiera una migracion adicional.

## Migracion y rollback

No se requiere migracion destructiva si se mantiene la columna `parcelas.codigo`
existente. Si se implementa con una secuencia PostgreSQL, la migracion debe:

1. Crear la secuencia `parcelas_codigo_seq` si no existe.
2. Inicializarla con el mayor correlativo historico encontrado en codigos
   `PAR-<numero>`.
3. Mantener rollback operativo documentado para eliminar la secuencia solo si el
   codigo vuelve a generarse manualmente.

Rollback funcional:

- revertir API/admin al flujo anterior;
- si se creo una secuencia, puede conservarse sin afectar lectura de parcelas;
- no modificar codigos ya generados.

## Criterios de aceptacion

- [x] CA-001: crear una parcela sin `code` devuelve una parcela con `code:
      "PAR-001"` cuando no existen codigos previos compatibles.
- [x] CA-002: con `PAR-001` y `PAR-003`, la siguiente creacion devuelve
      `PAR-004`.
- [x] CA-003: codigos historicos como `P-001` o `LOTE-A` no impiden generar el
      siguiente `PAR-###`.
- [x] CA-004: dos creaciones concurrentes no terminan con el mismo codigo.
- [x] CA-005: admin web permite crear una parcela sin campo de codigo.
- [x] CA-006: listados, mapas y selectores siguen mostrando el codigo generado.
- [x] CA-007: mobile mantiene `code` requerido en SQLite y muestra el codigo
      descargado.
- [x] CA-008: `pnpm lint`, `pnpm typecheck`, `pnpm test` y `pnpm build` pasan o
      se documenta cualquier bloqueo.

## Pruebas

- Unitarias de `ParcelasService` para generacion de codigo.
- Prueba de migracion si se agrega secuencia PostgreSQL.
- Test de admin critical CRUD ajustado para crear parcelas sin `code`.
- Test mobile de migraciones solo si cambia SQLite.
- Validacion manual del formulario admin: crear parcela, listar, filtrar y abrir
  geodatos/historial.

## Impacto documental

- [ ] Arquitectura.
- [x] Dominio: actualizar regla de codigo de parcela.
- [ ] Runbook.
- [ ] ADR.
- [ ] Variables o despliegue.
