---
title: Precarga individual de recepciones y vínculo de productores Systrace
status: implemented
numero: "105"
area: api, admin-web, database, comercial, integraciones, seguridad
created: 2026-10-14
approved_by: usuario (2026-10-14)
implemented_in: migración 071; API Comercial y configuración; admin-web Pagos; docs de arquitectura, dominio, despliegue y riesgos
---

# Spec 105: Precarga individual de recepciones y vínculo de productores Systrace

## Contexto

La cabecera del pago se captura manualmente. La API de Systrace
`recepcion-cth` devuelve los campos de recepción equivalentes a todos los
campos de la cabecera, salvo el UUID interno `productorId`; `sistemaOrigen`
puede establecerse como `SYSTRACE`. El usuario necesita buscar por productor y
fecha de recepción, elegir una recepción y precargar una cabecera individual.

La consulta comprobada el 2026-10-14 devolvió 861 filas con `success`, `total`
y `data`. Los parámetros probados `codigo_productor`, `fecharecepcion`,
`fecha_recepcion` y `limit` no redujeron la respuesta. Por tanto, mientras el
proveedor no publique filtros efectivos, la API de AgroGest debe filtrar la
respuesta en el servidor y nunca reenviar las 861 filas al navegador. La
consulta observada es una muestra temporal; no garantiza la calidad de futuras
filas.

## Alcance

### Incluido

- En el formulario de nuevo pago, filtrar recepciones por fecha exacta y
  productor de origen (código o nombre), mostrar coincidencias resumidas y
  permitir seleccionar exactamente una recepción.
- Vincular explícitamente el código de productor de Systrace con un productor
  interno de AgroGest, recordar el vínculo y reutilizarlo en pagos futuros.
- Precargar los campos de cabecera desde la recepción seleccionada y permitir
  revisar los campos antes de guardar.
- Consultar Systrace exclusivamente desde la API de AgroGest, con URL y clave
  configuradas en el servidor.
- Mantener el formulario manual como alternativa cuando Systrace no responda
  o no exista una recepción coincidente.

### Excluido

- Importación masiva, guardado automático de pagos, sincronización periódica o
  persistencia local del conjunto completo de recepciones.
- Uso del endpoint de calibrado, cálculos de importes y precarga de los detalles
  por acreedor.
- Vinculación por similitud de nombres y creación automática de productores
  de AgroGest.
- Cambios mobile o modificaciones de las tablas de pagos.

## Requisitos

- RF-001: Solo `ADMIN` y `ANALISTA` autenticados pueden consultar recepciones
  desde la web y la API. La consulta requiere una fecha de recepción válida.
- RF-002: Tras elegir la fecha exacta, la UI permite buscar y seleccionar un
  productor de Systrace por código o nombre. Muestra solo las recepciones de
  ese productor y fecha, identificadas para el usuario por guía y lote. La
  selección de una fila no crea ni modifica pagos.
- RF-003: La API del servidor solicita `recepcion-cth` con `x-api-key`, valida
  la estructura de respuesta, filtra y pagina las coincidencias. La URL de
  Systrace es fija desde configuración; el cliente no puede suministrar una
  URL. El servidor no devuelve al navegador filas de otros productores o
  fechas en el resultado de búsqueda.
- RF-004: El mapeo de una fila seleccionada es:

  | Cabecera | Systrace |
  | --- | --- |
  | `sistemaOrigen` | constante `SYSTRACE` |
  | `nroGuia`, `lote`, `protocolo` | `nroguia`, `lote`, `protocolo` |
  | `variedad`, `tipoCultivo`, `categoria`, `destino` | `nombre_variedad`, `tipo_cultivo`, `categoria`, `codigo_destino` |
  | `fechaCosecha`, `fechaRecepcion` | `fechacosecha`, `fecharecepcion` |
  | `jabas`, `pesoBruto`, `pesoTara`, `pesoNeto`, `pesoPromedio` | `totaljabas`, `totalpbruto`, `totalptara`, `totalpneto`, `peso_promedio` |
  | `exportador`, `codigoProductorOrigen`, `nombreProductorOrigen` | `codigo_exportador`, `codigo_productor`, `nombre` |

- RF-005: La primera vez que se elige un código de productor de Systrace sin
  vínculo, el usuario selecciona explícitamente su productor correspondiente
  en AgroGest y confirma `Vincular productor`. El nombre de Systrace solo
  orienta; no establece identidad automáticamente. El vínculo persistido
  permite completar `productorId` en pagos posteriores del mismo código.
- RF-006: Un código Systrace solo puede apuntar a un productor interno a la
  vez; un productor interno puede recibir varios códigos Systrace. El vínculo
  se puede corregir mediante una acción explícita de ADMIN/ANALISTA, con
  auditoría de actor y fecha. Nunca se modifica solo por cambiar el selector
  de la cabecera. No se permite asociar un alias fusionado ni un productor
  inactivo sin revisión explícita del usuario.
- RF-007: Al usar un vínculo existente, la UI muestra el productor interno
  asociado para que el usuario lo compruebe. Si el productor interno cambia,
  se conserva la regla actual de limpiar acreedores previamente elegidos.
- RF-008: Seleccionar otra recepción reemplaza únicamente los campos de la
  cabecera mapeados; no altera los detalles. La UI muestra claramente qué
  recepción se eligió y permite corregir la cabecera antes de guardar.
- RF-009: Una fila incompleta o inválida para el DTO de pago no se aplica de
  forma parcial; se muestra un error de datos de origen sin exponer credenciales.
  El guardado final vuelve a usar las validaciones y la transacción existentes.
- RF-010: Si ya existe un pago de origen `SYSTRACE` con la misma guía y lote,
  mostrar esa condición antes de seleccionar para evitar duplicación accidental.
  No modificar ni sobrescribir pagos existentes en la búsqueda.
- RNF-001: La clave solo reside en configuración del servidor; no se incluye
  en JavaScript, respuestas, logs, trazas ni documentación versionada. URL y
  clave faltantes deshabilitan la consulta con un error controlado.
- RNF-002: La consulta externa tiene timeout y límite de tamaño de respuesta.
  Errores de red, autenticación externa o formato se traducen en mensajes
  genéricos y no impiden el llenado manual.
- RNF-003: Respuestas de búsqueda llevan `Cache-Control: no-store`. Evitar
  registrar nombres, códigos de productor y guías en logs.

## Contratos afectados

- API: agregar un endpoint de consulta de recepciones bajo `/pagos`, protegido
  por `ADMIN` y `ANALISTA`, con fecha obligatoria, productor opcional durante
  la elección y paginación acotada. La respuesta solo contiene los campos
  necesarios para elegir y precargar una cabecera, además de vínculo y pago
  existente. Agregar endpoint de alta/corrección explícita del vínculo con
  `AllowAnalystMutation`. No cambia el contrato de creación/edición de pagos.
- Web: agregar búsqueda y selector individual en el formulario de nuevo pago;
  mantener disponibles los controles manuales y el guardado completo actual.
- Configuración API: `RECEPCION_API_URL`, `CALIBRACION_API_URL` y
  `SYSTRACE_API_KEY` se documentan en `.env.example` sin valores reales. La
  URL de calibrado queda reservada y no se utiliza en esta entrega.
- PostgreSQL: migración aditiva `071` para
  `vinculos_productores_systrace` con `id bigint`, `public_id uuid`,
  `codigo_productor_systrace varchar(150) NOT NULL`, `productor_id bigint NOT
  NULL` con FK `RESTRICT`, `creado_por_usuario_id`, `actualizado_por_usuario_id`
  y marcas de tiempo. Restricción única de código Systrace e índice de
  `productor_id`. Una tabla de cambios conserva productor anterior, nuevo,
  actor y fecha de cada corrección. No hay backfill por nombre.
- SQLite, mobile y tipos de pagos persistidos: sin cambios. La unificación de
  productores existente debe resolver el vínculo hacia la ficha principal,
  sin perderlo ni asociarlo a un alias inactivo.

## Seguridad y datos

La frontera de confianza está entre AgroGest y Systrace. El navegador nunca
recibe la clave y nunca llama directamente al host externo. La API valida
filtros y roles, limita la respuesta y evita exponer el conjunto completo.
La URL proviene solo de configuración para impedir solicitudes a destinos
elegidos por el usuario. La conexión Systrace proporcionada usa HTTP; clave y
datos viajan sin cifrado por esa red. Este riesgo debe figurar en el registro
operativo y revaluarse si Systrace habilita HTTPS o cambia la red.

No se considera el nombre un identificador suficiente del productor. Solo el
código externo establece el vínculo persistente, después de una confirmación
humana de la correspondencia. La API verifica que los UUID públicos no
permitan apuntar a otra entidad ni a un productor fusionado. Una corrección
del vínculo no reescribe pagos históricos: las cabeceras conservan su
instantánea de origen y el productor interno asignado al guardar.

## Migración y rollback

La migración `071` crea una tabla nueva, sin modificar pagos ni productores
existentes. Desplegar migración y API compatible antes de la web. Verificar
unicidad, FK, permisos y asociación de prueba sin datos reales. Antes del
despliegue se requiere backup según runbook. Si se revierte la integración,
retirar selector y endpoints, y conservar la tabla y sus vínculos para una
recuperación posterior; no hacer `DROP` ni borrar pagos. La captura manual y
las versiones mobile instaladas siguen funcionando si Systrace falla o se
retira la nueva UI.

## Criterios de aceptación

- [x] CA-001: Buscar por fecha y productor presenta solo coincidencias y el
  usuario puede elegir una única guía/lote.
- [x] CA-002: La elección rellena los 18 campos externos/derivados sin guardar
  automáticamente; `productorId` procede del vínculo confirmado o requiere
  elección y confirmación explícitas si el código aún no está vinculado.
- [x] CA-003: El vínculo se recuerda en la siguiente búsqueda del mismo código,
  se puede corregir con auditoría y no se crea por coincidencia de nombres.
- [x] CA-004: Un registro incompleto o con formatos inválidos no produce una
  cabecera parcialmente rellenada.
- [x] CA-005: La UI avisa de una guía/lote ya usada y no altera pagos previos.
- [x] CA-006: ADMIN y ANALISTA pueden consultar y vincular; otros roles no
  pueden. La clave nunca aparece en cliente, respuesta ni log.
- [x] CA-007: Fallo, timeout o falta de configuración de Systrace conserva la
  captura manual y muestra un mensaje útil.

## Pruebas

- Unitarias del cliente Systrace con fixture ficticia: filtro, mapeo, límites,
  filas inválidas, timeout y respuesta inesperada.
- API: autorización de consulta/vínculo/corrección, validación de fecha y
  productor, paginación, protección de credencial, unicidad concurrente del
  vínculo y detección de pago existente.
- Migración: esquema vacío y base previa con productores/pagos existentes;
  verificar FK, índice, unicidad, compatibilidad y rollback operativo.
- Web: búsqueda, selección individual, reemplazo de cabecera sin cambio de
  detalles, y guardado manual cuando Systrace no está disponible.
- Typecheck, lint, pruebas y build de API y web; revisión manual del flujo.

Verificación de código: 24 pruebas dirigidas de configuración, cliente,
mapeo, búsqueda, vínculo, permisos, pagos y unificación; lint y typecheck de
API/web; build de ambas aplicaciones. La comprobación real contra Systrace
quedó pendiente porque la red privada no respondió durante la validación
final. La migración 071 tampoco se aplicó a una base real en esta sesión.

## Impacto documental

- [x] Arquitectura: registrar la consulta externa en API y el flujo web.
- [x] Dominio: aclarar procedencia de campos y vínculo de productor interno.
- [x] Runbook: configurar URL/clave y comprobar conectividad sin mostrar datos.
- [x] ADR: no requerido para esta integración acotada.
- [x] Variables o despliegue: `.env.example` y registro del riesgo HTTP.

## Decisiones confirmadas para revisión

- Fecha exacta de recepción.
- Elegir primero un productor de Systrace y después vincularlo con uno de
  AgroGest. Recordar ese vínculo para pagos futuros.
