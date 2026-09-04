---
title: Reporte web de campos por etapas
status: implemented
numero: 074
area: reportes, visitas-campo, parcelas, geodatos, admin-web, api
created: 2026-09-04
approved_by: Usuario, 2026-09-04
implemented_in: apps/api/src/modules/reportes; apps/admin-web/src/modules/reportes; apps/admin-web/src/shared/constants; docs/architecture/overview.md; docs/domain/data-model.md
---

# Spec 074: Reporte web de campos por etapas

## Contexto

El modulo web de Reportes dispone del reporte de Visitas como pantalla unica.
Se requiere organizar Reportes como un acordeon de navegacion y agregar Campos
por etapas para conocer el estado mas reciente de cada parcela, sin limitarlo
por fechas. La etapa o labor y el ingeniero se obtienen de la ultima visita
activa registrada para cada parcela.

## Alcance

### Incluido

- Acordeon `Reportes` en la navegacion lateral con los submodulos `Visitas` y
  `Campos por etapas`.
- Ruta `/reportes/visitas` para el reporte existente y ruta
  `/reportes/campos-por-etapas` para el nuevo reporte.
- Redireccion compatible de `/reportes` hacia `/reportes/visitas`.
- Filtros buscables de Ingeniero y Productor, sin rango de fechas.
- Tabla por ingeniero y por las ocho etapas o labores activas del catalogo.
- Mapa de parcelas coloreadas por la etapa o labor de su ultima visita activa.
- Un grafico circular por cada agronomo activo con su distribucion de parcelas
  por etapa o labor.
- Acceso exclusivo de lectura para `ADMIN` y `ANALISTA`.

### Excluido

- Filtro de fechas, historico de cambios de etapa o de asignaciones.
- Cambios a PostgreSQL, migraciones, mobile, SQLite u outbox.
- Exportacion, impresion o cambios al reporte Excel existente.
- Modificacion del catalogo de etapas y labores o de la regla de guardado de
  visitas.

## Requisitos

- RF-001: Ingeniero y Productor usan selectores con busqueda de texto y una
  opcion que considera todos los registros.
- RF-002: Para cada parcela activa se selecciona una sola visita activa: la de
  mayor `fecha_visita` y, ante empate, la de mayor `id`.
- RF-003: La parcela se contabiliza para el agronomo que registro esa ultima
  visita, independientemente del agronomo actualmente asignado a la parcela.
- RF-004: Solo participan agronomos activos con rol `AGRONOMO`, productores
  activos, parcelas activas y etapas o labores activas.
- RF-005: El filtro de Ingeniero se aplica al agronomo de la ultima visita y el
  filtro de Productor se aplica al propietario de la parcela.
- RF-006: La tabla presenta exactamente una columna `Ingeniero` seguida por
  las ocho entradas activas de `etapas_fenologicas`, ordenadas por `orden`, sin
  distinguir visualmente si cada entrada es `Etapa` o `Labor`.
- RF-007: Cada celda de la tabla muestra `cantidad (porcentaje)`. El porcentaje
  usa como denominador el total global de parcelas categorizadas que coincide
  con los filtros. Una fila final `Total` muestra la cantidad y porcentaje de
  cada etapa o labor; no se agrega una columna adicional de total general.
- RF-008: La tabla incluye todos los agronomos activos, aunque tengan cero
  parcelas; si se filtra por Ingeniero, muestra solo el seleccionado.
- RF-009: El mapa muestra cada parcela participante mediante su poligono o,
  como fallback, su punto interno y su punto de acceso. El color corresponde a
  la etapa o labor de la ultima visita y la leyenda conserva colores estables.
- RF-010: Las parcelas sin geodatos no se dibujan y la interfaz informa su
  cantidad. Las parcelas cuya ultima visita no tenga una etapa o labor activa
  se excluyen de tabla, mapa y graficos y se informan como no categorizadas.
- RF-011: Se muestra un grafico circular por cada agronomo activo; cada sector
  representa la cantidad de sus parcelas en una etapa o labor y su porcentaje
  se calcula respecto del total categorizado de ese ingeniero. Si se filtra por
  Ingeniero, se muestra un solo grafico.
- RNF-001: La consulta determina la ultima visita en PostgreSQL y no descarga
  todo el historial de visitas para calcular el reporte en el navegador.
- RNF-002: La respuesta mantiene un unico universo de parcelas para tabla,
  mapa y graficos, evitando diferencias entre totales.
- RNF-003: La interfaz es accesible por teclado, responde en escritorio y movil
  y conserva estados de carga, error y ausencia de datos.

## Contratos afectados

- Nuevo `GET /reportes/campos-por-etapas` para `ADMIN` y `ANALISTA` con query:
  - `agronomo_usuario_id`: entero positivo opcional;
  - `productor_id`: entero positivo opcional.
- La respuesta contiene:
  - catalogo ordenado de etapas y labores activas;
  - agronomos activos con sus conteos por etapa o labor;
  - totales globales y cantidad de parcelas no categorizadas;
  - parcelas categorizadas con productor, ingeniero de la ultima visita,
    etapa o labor y geodatos necesarios para el mapa.
- `GET /reportes/visitas` conserva su contrato; solo cambia su ruta web a
  `/reportes/visitas`.
- Los filtros reutilizan `GET /usuarios/agronomos` y `GET /productores`; no se
  modifica su contrato.

## Seguridad y datos

- El controlador conserva `@Roles("ADMIN", "ANALISTA")`; el acordeon del
  frontend no sustituye los guards de la API.
- La respuesta no incluye correo, telefono, documento del productor ni roles
  completos. Solo expone nombres visibles, identificadores, datos descriptivos
  de parcela y geodatos ya autorizados para estos roles.
- Los IDs se validan y las consultas se parametrizan.
- No se registran filtros, nombres personales, geometrias ni contenido del
  reporte en logs.

## Migracion y rollback

No hay migracion de esquema ni datos. El cambio es aditivo: desplegar primero
la API y despues la web. El rollback elimina el nuevo endpoint y submodulo,
restaura la entrada directa de Reportes y mantiene disponible el reporte de
Visitas sin transformar datos.

## Criterios de aceptacion

- [x] CA-001: Reportes aparece como acordeon con Visitas y Campos por etapas;
      `/reportes` redirige al reporte de Visitas.
- [x] CA-002: ADMIN y ANALISTA acceden a ambos submodulos; AGRONOMO no accede a
      sus rutas ni endpoints.
- [x] CA-003: Ingeniero y Productor se buscan por texto y filtran tabla, mapa y
      graficos sin recargar la pagina.
- [x] CA-004: Cada parcela se cuenta una sola vez, usando etapa o labor e
      ingeniero de su ultima visita activa sin filtro de fecha.
- [x] CA-005: La tabla muestra Ingeniero mas las ocho columnas del catalogo,
      cantidades, porcentajes globales y fila Total.
- [x] CA-006: El mapa usa geodatos de parcela y colores estables para las ocho
      etapas o labores, con conteos de faltantes.
- [x] CA-007: Existe un grafico circular por cada agronomo activo, incluidos
      estados vacios, con porcentajes internos correctos.
- [x] CA-008: Carga, error, ausencia de datos, tema oscuro y vista movil
      mantienen una salida legible y recuperable.

## Pruebas

- Unitarias del DTO y metadatos de roles del endpoint.
- Unitarias de ultima visita por parcela, desempate por ID, filtros, filas en
  cero, totales y exclusiones.
- Unitarias del cliente web, navegacion del acordeon y construccion de filtros.
- Pruebas de colores y preparacion de datos de tabla, mapa y graficos.
- Lint, typecheck, pruebas y build de API y admin web.
- Validacion visual en escritorio y ancho movil.

## Impacto documental

- [x] Arquitectura: documentar el segundo submodulo de Reportes y la regla de
      ultima visita sin rango temporal.
- [x] Dominio: documentar el universo y denominadores del reporte.
- [x] Runbook: evaluado; no requiere cambios de procedimiento.
- [x] ADR: evaluado; no requiere una decision arquitectonica nueva.
- [x] Variables o despliegue: evaluado; no requiere variables ni
      migraciones nuevas.
