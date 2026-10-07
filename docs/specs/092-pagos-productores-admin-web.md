---
title: Pagos de productores en admin web
status: implemented
numero: 092
area: admin-web, api, database, seguridad, comercial
created: 2026-10-06
approved_by: usuario (2026-10-06)
implemented_in: migración 066, API Comercial, admin-web /pagos y /mantenimiento/acreedores-cosecha
---

# Spec 092: Pagos de productores en admin web

## Contexto

Se necesita registrar manualmente las liquidaciones de productores y sus
detalles por acreedor desde el panel web. El módulo tendrá cuatro pestañas,
pero esta primera entrega habilita únicamente el CRUD de Productores. El
catálogo existente `acreedores_cosecha` se reutilizará; no se creará una tabla
paralela `acreedores_productores`.

## Alcance

### Incluido

- Agregar Pagos a la navegación principal del panel web con las pestañas
  Resumen, Productores, Cosecha y Transportistas.
- Implementar en Productores el CRUD de cabeceras de pago y sus detalles.
- Dejar las otras tres pestañas visibles con estado vacío informativo.
- Agregar en Mantenimiento una vista de acreedores de cosecha que permita
  consultar y gestionar `acreedores_cosecha`.
- Permitir todas las operaciones CRUD de Pagos y Acreedores a `ADMIN` y
  `ANALISTA`, protegidas tanto en UI como en API.
- Capturar manualmente todos los datos, incluidos los importes. No integrar
  otros sistemas ni calcular importes derivados en esta entrega.

### Excluido

- CRUD de cosechas o transportistas y cálculos en sus pestañas respectivas.
- Importación de archivos, scraping, integraciones, pagos bancarios o
  conciliación automática.
- Cambios mobile/offline y creación de la tabla `acreedores_productores`.

## Requisitos

- RF-001: `ADMIN` y `ANALISTA` pueden abrir `/pagos`; cualquier otro rol queda
  rechazado por autorización de servidor.
- RF-002: la página contiene las cuatro pestañas indicadas. Resumen, Cosecha y
  Transportistas muestran un estado vacío y no ejecutan operaciones.
- RF-003: Productores lista y permite seleccionar productores existentes. El
  CRUD de esta pestaña administra pagos/liquidaciones; no crea, edita ni elimina
  las entidades maestras de `productores`.
- RF-004: cada cabecera de `pago_productores` pertenece a exactamente un
  productor existente y contiene una guía y un lote. `lote` es
  `varchar(150) NOT NULL`. Los códigos y nombres de origen son datos manuales
  y quedan como instantánea de la captura.
- RF-005: una cabecera puede tener cero o más detalles mientras está en
  `BORRADOR`. Cada detalle referencia un acreedor de `acreedores_cosecha` que
  pertenece al mismo productor. Solo acreedores `APPROVED` se pueden asignar.
- RF-006: todos los campos e importes del formulario se guardan como los
  ingresa el usuario. El sistema no deriva subtotal, descuentos, detracción,
  netos ni totales.
- RF-007: cada `porcentaje_peso` debe estar entre 0 y 100 inclusive; los
  porcentajes de los detalles no necesitan sumar 100.
- RF-008: los estados válidos son `BORRADOR`, `OBSERVADO`, `PENDIENTE`,
  `PAGADO` y `ANULADO`. La cabecera inicia en `BORRADOR` y cambia
  automáticamente a `PENDIENTE` al guardar el primer detalle. Admin y Analista
  pueden cambiar manualmente a los demás estados. Cada detalle mantiene estado
  independiente con el mismo catálogo y comienza en `PENDIENTE`; no se calcula
  automáticamente el estado de cabecera a partir de sus detalles.
- RF-009: eliminar físicamente se permite solo si el pago está en `BORRADOR` y
  no tiene detalles. Eliminar un pago con detalles conserva cabecera y detalles
  y cambia todos sus estados a `ANULADO`. Eliminar un detalle conserva la fila
  y la cambia a `ANULADO`.
- RF-010: la vista de Mantenimiento permite listar, crear, editar y eliminar
  perfiles existentes de `acreedores_cosecha`. La creación web registra el
  origen `ADMIN_WEB` y queda `PENDING`; editar un perfil `APPROVED` lo devuelve
  a `PENDING` sin borrar su historial de revisiones. Los acreedores con pagos,
  registros de cosecha o revisiones asociadas no se pueden eliminar físicamente.
- RNF-001: las mutaciones de `ANALISTA` llevan autorización explícita de API
  compatible con `RolesGuard` y `AllowAnalystMutation`; ocultar controles de UI
  no sustituye el guard.
- RNF-002: validar longitudes, tipos numéricos, fechas, estados, relaciones y
  límites de porcentajes tanto en DTOs/servicios como en PostgreSQL.
- RNF-003: datos de identidad y cuentas bancarias no aparecen en logs,
  excepciones ni telemetría. Respuestas con datos bancarios usan
  `Cache-Control: no-store`.
- RNF-004: no habilitar `synchronize` ni modificar registros históricos de
  `pagos_cosecha`, `registros_cosecha` o sus instantáneas.
- RNF-005: organizar UI, API y persistencia por responsabilidades siguiendo
  SOLID, sin introducir una arquitectura distinta a módulos vecinos.

## Contratos afectados

- Web: nueva ruta `/pagos` con navegación de pestañas y CRUD de liquidaciones
  en Productores. Añadir `/mantenimiento/acreedores-cosecha` para el CRUD de
  perfiles. Ambas rutas son accesibles a `ADMIN` y `ANALISTA`.
- API Pagos: bajo `/pagos/productores`, ofrecer listado paginado, creación,
  lectura individual, actualización y eliminación lógica/física de cabeceras.
  Las rutas anidadas `/pagos/productores/:pagoId/detalles` ofrecen listado y
  creación; `/:detalleId` ofrece actualización y eliminación con verificación
  de pertenencia a la cabecera.
- API de acreedores: agregar operaciones administrativas CRUD sin cambiar los
  endpoints de captura pública/mobile. Nuevos perfiles web registran origen
  `ADMIN_WEB`; ampliar el constraint PostgreSQL de origen y el tipo de dominio.
- PostgreSQL: siguiente migración incremental `066`, con `pago_productores` y
  `detalle_pago_productores`; ambas siguen `id bigserial` más `public_id uuid`.
  Añadir `productor_id bigint` a la cabecera. Referenciar `productores(id)`,
  `usuarios(id)`, `acreedores_cosecha(id)` y `tipos_documento(id)` con sus tipos
  existentes (`bigint`, salvo `tipos_documento.id`, que es `smallint`). No crear
  `acreedores_productores`.
- Restricciones: resolver las referencias explícitamente como
  `pago_productor_id -> pago_productores(id)`, `acreedor_id ->
acreedores_cosecha(id)`, `tipo_documento_id_productor ->
tipos_documento(id)` y `supervisor_id -> usuarios(id)`. Usar defaults SQL con
  comillas simples, incluido `DEFAULT 'NO_APLICA'`.
- Añadir auditoría de creación/actualización y los índices necesarios para
  búsqueda por productor, fechas, estado y cabecera de detalle.
- Respuestas web/API exponen UUID público como identificador externo; las FKs
  persistidas apuntan a IDs internos numéricos.

### Campos de las tablas nuevas

- `pago_productores`: `id`, `public_id`, `productor_id`,
  `sistema_origen varchar(150)`, `nro_guia varchar(150)`, `lote varchar(150)`,
  `protocolo varchar(10)`, `variedad varchar(150)`,
  `tipo_cultivo varchar(150)`, `categoria varchar(50)`,
  `destino varchar(150)`, `fecha_cosecha date`, `fecha_recepcion date`,
  `jabas integer`, `peso_bruto numeric(10,2)`, `peso_tara numeric(10,2)`,
  `peso_neto numeric(10,2)`, `peso_promedio numeric(10,2)`,
  `exportador varchar(10)`, `codigo_productor_origen varchar(150)`,
  `nombre_productor_origen varchar(250)`, `estado`, `creado_por_usuario_id`,
  `creado_at` y `actualizado_at`.
- `detalle_pago_productores`: `id`, `public_id`, `pago_productor_id`,
  `acreedor_id`, `tipo_documento_id_productor smallint`,
  `nro_documento_productor varchar(20)`, `cantidad_jabas integer`,
  `precio_jaba numeric(10,2)`, `precio_kilo numeric(10,2)`,
  `porcentaje_peso numeric(10,2)`, `aplica_fairtrade boolean default false`,
  `supervisor_id bigint`, `sub_total numeric(10,2)`,
  `tipo_descuento varchar(200) default 'NO_APLICA'`,
  `monto_descuento numeric(10,2) default 0`,
  `total_post_descuento numeric(10,2)`, `detraccion numeric(10,2)`,
  `total_post_detraccion numeric(10,2)`, `nro_liquidacion varchar(50)`
  nullable, `observacion varchar(300)` obligatoria, `estado`, `creado_at` y
  `actualizado_at`.
- Cabecera y detalles usan el mismo conjunto de estados, pero cada estado se
  actualiza de forma independiente, salvo que anular la cabecera también anula
  todos sus detalles. Eliminar un detalle nunca elimina su fila.
- Las dos tablas conservan la precisión indicada en la propuesta. En fechas,
  pesos, jabas e importes se valida el tipo y formato; solo `porcentaje_peso`
  tiene rango funcional fijado en esta spec. Todos esos valores son manuales.

## Seguridad y datos

Los actores son usuarios autenticados `ADMIN` y `ANALISTA`. `RolesGuard` bloquea
mutaciones de analista salvo autorización explícita por handler; todas las
operaciones de escritura deben declararla y probarla. Los servicios vuelven a
validar que el acreedor pertenezca al productor seleccionado y que su estado de
aprobación sea `APPROVED`. La base aplica `ON DELETE RESTRICT` a relaciones
financieras e históricas. Los valores bancarios y documentos se excluyen de
logs, trazas y mensajes de error.

La captura web nueva de acreedores usa `ADMIN_WEB`, estado `PENDING`, actor y
fechas de auditoría. Las operaciones de aprobación/observación mantienen el
historial existente de `revisiones_acreedor_cosecha`.

## Migración y rollback

1. Crear migración aditiva `066` para las dos tablas nuevas y ampliar el
   constraint de origen de `acreedores_cosecha` para aceptar `ADMIN_WEB`.
   No hay backfill de pagos, porque estas tablas no existen todavía.
2. Desplegar API compatible con la tabla y luego el panel web. No se requiere
   secuencia mobile porque no se agrega captura offline.
3. Ante rollback, retirar la UI/rutas nuevas y conservar tablas, perfiles,
   revisiones e información capturada. No ejecutar `DROP` automático ni borrar
   liquidaciones; corregir hacia adelante.
4. En verificación operativa, confirmar estado de la migración, constraints,
   conteos de nuevas tablas y capacidad de consulta/creación con datos de
   prueba no productivos.

## Supuestos para revisión humana

- `detalle_pago_productores.estado` usa el mismo catálogo que la cabecera,
  inicia en `PENDIENTE` y se administra de forma independiente; no se deriva un
  estado general desde los detalles. El borrado de un detalle lo anula.
- Los acreedores creados desde Mantenimiento se registran como `ADMIN_WEB` y
  `PENDING`, respetando el flujo de aprobación vigente. Se pueden asignar a un
  pago únicamente después de aprobarlos.
- El borrado físico de acreedores solo procede si no tienen pagos, cosechas ni
  historial de revisión que los referencie; de lo contrario la API lo rechaza.

## Criterios de aceptación

- [x] CA-001: Admin y Analista ven las cuatro pestañas; solo Productores expone
      funciones y las otras muestran un estado vacío.
- [x] CA-002: ambos roles realizan el CRUD web de cabeceras/detalles y
      acreedores; un rol no autorizado obtiene rechazo de API.
- [x] CA-003: la cabecera referencia un productor existente y cada detalle solo
      acepta acreedores aprobados del mismo productor.
- [x] CA-004: guía, lote e importes se guardan manualmente, sin cálculos; lote
      admite hasta 150 caracteres.
- [x] CA-005: porcentaje 0 y 100 son válidos; valores fuera del rango son
      rechazados; varios detalles no tienen que sumar 100.
- [x] CA-006: un pago comienza `BORRADOR`, pasa a `PENDIENTE` al guardar su
      primer detalle y permite cambiar manualmente a `OBSERVADO`, `PAGADO` o
      `ANULADO`. Cada detalle comienza `PENDIENTE` y permite esos mismos estados de
      manera independiente.
- [x] CA-007: un borrador sin detalles se puede borrar físicamente; un pago
      con detalles y sus líneas se conservan y quedan `ANULADO` al eliminarlo;
      eliminar una línea también conserva y anula esa línea.
- [ ] CA-008: la migración funciona desde esquema previo 065 y en bootstrap
      vacío, y conserva los datos de Comercial existentes. Pendiente de smoke
      completo: Spec 093 corrigió la migración 001; el smoke ahora alcanza 025,
      donde se detiene por el bloqueo independiente R-043 antes de llegar a 066.
- [x] CA-009: ninguna operación escribe datos bancarios/documentos en logs;
      las respuestas sensibles no quedan en caché HTTP.

## Verificación de implementación

- Pasaron typecheck, lint y build de API y admin-web.
- Pasaron 130 pruebas focalizadas en seis archivos; `docs:check` validó 175
  documentos y `git diff --check` no reportó errores.
- `pnpm db:smoke` se ejecutó en PostgreSQL efímero local. Tras la corrección de
  Spec 093, 001 y 002–024 pasan; 025 falla por R-043, así que el smoke no llega
  a la migración 066. El clúster temporal se limpió y no se usó producción.
- Antes del despliegue queda pendiente resolver R-043 y verificar la migración
  066 tanto en bootstrap como sobre una base hasta 065.

## Impacto documental

- [x] Actualizar `docs/domain/data-model.md` con las entidades y estados de
      pagos de productores y la reutilización de acreedores.
- [x] Actualizar `docs/index.md` y `docs/specs/README.md` con esta spec.
- [x] Evaluar impacto en `docs/operations/risk-register.md` por el acceso web a
      importes, documentos y cuentas bancarias.
- [x] Al implementar, completar `implemented_in`, cambiar el estado y actualizar
      la documentación activa.
