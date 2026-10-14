---
title: Distribución de jabas, cálculos y estado de detalles de pagos de productores
status: implemented
numero: "106"
area: api, admin-web, database, comercial
created: 2026-10-14
approved_by: usuario (2026-10-14)
implemented_in: migración 072; API Comercial pagos; admin-web Pagos; docs de dominio, arquitectura, despliegue y riesgos
---

# Spec 106: Distribución y cálculo de detalles de pagos de productores

## Contexto

La cabecera de pago puede precargarse desde una recepción de Systrace, pero hoy los
detalles admiten importes libres, no controlan el saldo de jabas entre cabeceras
del mismo lote y no guardan la fecha de pago. El usuario necesita repartir todas
las jabas de una recepción en varios detalles, pagos o fechas (por ejemplo, para
separar Fairtrade), sin asignar más jabas que las recibidas. La captura debe
mostrar el avance sin exigir que todo se pague en una sola operación.

Esta spec reemplaza las reglas de captura manual de importes, porcentaje desde
cero y observación siempre obligatoria de la spec 092; conserva sus registros
históricos y los estados independientes de cabecera y detalle.

## Alcance

### Incluido

- Selector de descuento, precios vinculados, importes calculados y validaciones
  de cada detalle del formulario web.
- Control del saldo de jabas de una misma recepción y productor entre distintas
  cabeceras y detalles, incluso al editar o anular.
- Estado, observación y fecha de pago por detalle; columna de estado en la vista
  de detalles.
- Validaciones y cálculos equivalentes en todos los endpoints de pagos de la
  API, migración aditiva y pruebas de concurrencia y compatibilidad.

### Excluido

- Transferencia bancaria, integración con calibrado, pago automático, cierre
  obligatorio del lote en una sola fecha o cambios de la app móvil.
- Cambiar el catálogo de estados de la cabecera o recalcular pagos históricos en
  una migración masiva.

## Requisitos

- RF-001: Cada detalle activo tiene un número entero de jabas mayor que cero.
  La suma de jabas de detalles no anulados de la misma recepción no puede
  superar las jabas recibidas. `PENDIENTE` y `OBSERVADO` reservan jabas para
  evitar asignarlas dos veces; anular libera esa reserva. Se permite guardar un
  pago parcial y completar el saldo con otro detalle o cabecera, el mismo día o
  en otra fecha.
- RF-002: La identidad de la recepción para el control de saldo comprende
  `sistemaOrigen`, `codigoProductorOrigen`, `nroGuia`, `lote` y
  `fechaRecepcion`. Para origen `SYSTRACE`, el primer guardado valida las jabas y
  el peso neto frente a la recepción seleccionada del proveedor; se conservan
  como instantánea en la cabecera. Las cabeceras posteriores de esa identidad
  deben usar las mismas jabas y peso neto. Una corrección del vínculo entre
  productores no duplica el cupo de la recepción. Para captura manual, la
  primera cabecera no anulada define el total declarado y las posteriores
  deben coincidir. No se mezclan cupos de distintas recepciones aunque
  compartan lote.
- RF-003: La web muestra jabas de recepción, asignadas, pagadas, disponibles y
  pendientes de pago para la recepción elegida. Cuenta como **pagada** solo una
  jaba cuyo detalle está `PAGADO`; `asignadas` incluye todos los detalles no
  anulados. Un lote figura completo únicamente cuando todas las jabas están en
  detalles `PAGADO`. El saldo se actualiza al guardar, editar o anular y el
  servidor vuelve a comprobarlo dentro de la transacción. Si otra sesión
  consume el saldo, se rechaza el exceso y se informa el disponible actual.
- RF-004: `precioJaba` y `precioKilo` son editables. La última entrada manual
  gobierna el cálculo: jaba → kilo divide entre 20; kilo → jaba multiplica por
  20. El otro campo se rellena al editar. Se admiten hasta cuatro decimales en
  el precio digitado y se guardan hasta seis en ambos precios, para conservar
  exactamente el resultado de dividir entre 20. La API comprueba la
  coherencia de ambos precios. El formulario envía `precioBase` (`JABA` o
  `KILO`) para indicar el último campo editado; si un cliente antiguo no lo
  envía, la API acepta la pareja solo cuando ya es coherente. Los precios no
  se consultan a Systrace.
- RF-005: `porcentajePeso` es obligatorio, mayor que cero y menor o igual a
  100. El `subTotal` del detalle representa **kilogramos asignados**, no
  soles: `pesoNetoRecepcion / jabasRecepcion × cantidadJabasDetalle ×
  porcentajePeso / 100`. Por ejemplo, 2 000 kg en 100 jabas, 40 jabas en el
  detalle y 80 % producen `subTotal = 640 kg`. La UI lo muestra como calculado
  y de solo lectura.
- RF-006: `tipoDescuento` se elige entre `NO_APLICA`, `CLP`, `INSUMOS` y
  `COMISION`. Con `NO_APLICA`, `montoDescuento` es cero y de solo lectura; con
  otra opción, el monto es obligatorio y mayor que cero. No se admiten montos
  negativos ni superiores al importe bruto del detalle.
- RF-007: `totalPostDescuento = subTotal × precioKilo − montoDescuento` y
  `totalPostDetraccion = totalPostDescuento − detraccion`. La detracción se
  digita manualmente, no puede ser negativa ni superar el total posterior al
  descuento. Los tres valores derivados se recalculan en la API, no se confía
  en importes enviados por el navegador. Los valores monetarios finales se
  redondean a dos decimales con redondeo decimal `HALF_UP`, uniforme en web y
  API. El subtotal en kilogramos se redondea y guarda con seis decimales; ese
  mismo valor se multiplica por `precioKilo` para calcular dinero.
- RF-008: Cada detalle nuevo o editable tiene estado elegible `PENDIENTE`,
  `OBSERVADO` o `PAGADO`; inicia en `PENDIENTE`. `ANULADO` sigue siendo la
  acción de baja lógica y `BORRADOR` histórico sigue siendo legible. La
  cabecera conserva su estado independiente.
- RF-009: `observacion` es un selector con exactamente: `Cuenta bancaria
  inexistente o equivocada`, `Datos personales inconsistentes` y `Transaccion
  en proceso por CCI`. Es obligatoria al elegir `OBSERVADO`; para `PENDIENTE`
  o `PAGADO` se permite vacía. Los textos libres históricos se siguen leyendo
  sin modificación; al editar una observación se elige una opción del catálogo.
- RF-010: `fechaPago` es una fecha persistida por detalle. Es obligatoria y
  editable en `PAGADO`; al cambiar por primera vez a ese estado, la UI propone
  la fecha actual de Lima. Una edición de un detalle ya pagado conserva su
  fecha guardada. En `PENDIENTE` y `OBSERVADO` no se establece fecha de pago;
  al revertir desde `PAGADO`, se limpia para que no parezca pagado. Si se
  solicita `PAGADO` sin fecha, la API asigna la fecha actual de Lima antes de
  persistir, incluso para clientes antiguos. La baja lógica `ANULADO` conserva
  la fecha histórica si el detalle estuvo pagado.
- RNF-001: La comprobación de cupo es atómica entre solicitudes concurrentes
  sobre la misma recepción y cubre creación completa, edición completa,
  endpoints individuales y operaciones por lote. El detalle que se está
  editando no se cuenta dos veces y las anulaciones del mismo lote se
  consideran en el saldo final de la transacción. Los errores no dejan una
  cabecera o parte de los detalles guardados.
- RNF-002: Las consultas de saldo y las respuestas financieras usan los
  permisos actuales `ADMIN`/`ANALISTA` y `Cache-Control: no-store`. No incluyen
  documentos ni cuentas bancarias, y no registran datos personales en logs.

## Contratos afectados

- API: agregar `estado`, `fechaPago` y `precioBase` a los DTO de creación/edición y
  `fechaPago` a la respuesta de detalle. Mantener la lectura de registros
  anteriores. Añadir una consulta de saldo por identidad de recepción,
  protegida para `ADMIN` y `ANALISTA`, que responda totales y saldo en jabas
  para el formulario. Las mutaciones existentes aceptan los mismos nombres
  de campos, pero aplican las nuevas reglas y devuelven valores derivados del
  servidor; los totales enviados por clientes antiguos no son autoridad y
  pueden omitirse en clientes nuevos.
- Web: sustituir los inputs libres de descuento y observación por selectores;
  agregar estado y fecha de pago por detalle; vincular los dos precios y dejar
  subtotal y totales de solo lectura. Mostrar el saldo antes de guardar y tras
  un conflicto de cupo. Incluir estado y fecha en el listado de detalles.
- PostgreSQL: migración aditiva `072` añade
  `detalle_pago_productores.fecha_pago date NULL`, cambia `observacion` para
  permitir vacío en estados distintos de `OBSERVADO`, refuerza el rango de
  `porcentaje_peso` para nuevas escrituras sin invalidar filas históricas y
  amplía `precio_jaba`, `precio_kilo` y `sub_total` a `numeric(14,6)`.
  Añadir índice para la búsqueda del grupo de recepción; conservar históricos
  y FKs existentes.
- SQLite y mobile: sin cambios.

## Seguridad y datos

La API es la autoridad del cálculo, la identidad de recepción y el saldo. Para
Systrace, se compara la primera instantánea con la fila de recepción obtenida
desde el servidor; no se confía en un cambio manual de jabas o peso neto. Una
vez que hay detalles, no se puede cambiar la identidad, las jabas ni el peso
neto de su cabecera; la corrección operativa es anular y registrar una nueva.
En la captura manual se muestra que el cupo proviene de una declaración, no de
Systrace. Las mutaciones continúan restringidas a `ADMIN` y `ANALISTA` en el
guard de API, incluyendo las rutas antiguas. No se exponen claves de Systrace
ni datos bancarios en el endpoint de saldo.

## Migración y rollback

1. Antes de desplegar, realizar backup según el runbook y revisar registros
   históricos con porcentajes cero, descuentos u observaciones libres.
2. Aplicar `072` de forma aditiva antes de publicar la API y la web. Ningún
   dato histórico se reescribe ni se inventa fecha de pago: aun si un detalle
   antiguo tiene estado `PAGADO`, `fecha_pago` queda nula y se muestra como
   «fecha no registrada». Las nuevas transiciones a `PAGADO` sí la requieren.
3. Mantener las lecturas de filas históricas. Las nuevas reglas se aplican a
   filas nuevas y a las que se editen. Un guardado completo que reenvíe una
   fila histórica sin modificar no la recalcula ni le exige fecha, observación
   o porcentaje nuevos. Una edición histórica incompatible se explica en el
   formulario antes de confirmar. Los lotes antiguos ya sobreasignados
   permanecen consultables, pero no admiten nuevas asignaciones hasta
   corregirse. Las restricciones SQL que afecten datos antiguos se introducen
   con validación compatible o en una migración posterior tras saneamiento,
   nunca bloqueando el despliegue.
4. Ante una reversión de aplicación, retirar la UI y API nuevas conservando
   `fecha_pago` y datos financieros; el código anterior debe tolerar la columna
   adicional. No hacer `DROP` ni borrar pagos. La recuperación de datos se
   efectúa desde backup solo si se verifica una corrupción, con decisión
   operativa explícita.

## Criterios de aceptación

- [x] CA-001: Un lote de 100 jabas admite 40 y luego 60 en distintos detalles,
  pagos o fechas, con Fairtrade distinto; rechaza la jaba 101 y muestra saldo.
- [x] CA-002: Dos escrituras concurrentes no pueden reservar más jabas que las
  recibidas; anular un detalle devuelve sus jabas al saldo disponible.
- [x] CA-003: Cambiar cualquiera de los dos precios completa el otro con factor
  20; el cálculo del subtotal, descuento, detracción y redondeo coincide en
  web, API y persistencia.
- [x] CA-004: Se rechazan porcentaje cero o mayor que 100, descuento sin monto,
  descuento con `NO_APLICA` distinto de cero y totales negativos.
- [x] CA-005: Un detalle `OBSERVADO` exige una de las tres observaciones; uno
  `PENDIENTE` se guarda sin observación ni fecha. Un detalle `PAGADO` guarda
  la fecha digitada o, si falta, la fecha actual de Lima; la conserva al
  reeditarse.
- [x] CA-006: Los registros anteriores siguen consultables sin modificación ni
  fecha inventada; todas las rutas de escritura aplican las nuevas reglas.
- [x] CA-007: ADMIN y ANALISTA pueden consultar el saldo y guardar; otros roles
  no acceden a los datos financieros.

## Pruebas

- 22 pruebas focalizadas de API y web: cálculo, límites, estados, fecha,
  compatibilidad histórica, saldo entre cabeceras y permisos de controlador.
- Lint y typecheck de API y web, build de ambos componentes.
- PostgreSQL 16 aislado: migración 072 sobre esquema anterior mínimo,
  asignaciones de 40 y 60 jabas en dos cabeceras, bloqueo advisory entre dos
  transacciones, rechazo de porcentaje cero nuevo y actualización de fila
  histórica con porcentaje cero. Se detuvo el contenedor de ensayo.
- No se ejecutó E2E del formulario ni una migración sobre una copia completa
  del esquema productivo; validar ambos en staging antes de desplegar. No se
  operó sobre producción. Offline-online no aplica al módulo web.

## Impacto documental

- [x] Arquitectura: actualizado el flujo de pagos web y la validación de API.
- [x] Dominio: descritos cupo, fórmulas, estados y fecha por detalle.
- [x] Runbook: añadidas verificación y recuperación de la migración `072`.
- [x] ADR: la identidad sigue los campos de recepción de la spec 105; no se
  requiere una decisión arquitectónica separada en esta entrega.
- [x] Variables o despliegue: no se agregaron secretos ni variables; se
  actualizó el orden de despliegue y el registro de riesgos.
