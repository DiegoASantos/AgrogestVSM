---
title: Reporte web de visitas
status: implemented
numero: 073
area: reportes, visitas-campo, admin-web, api
created: 2026-09-04
approved_by: Usuario, 2026-09-04
implemented_in: apps/api/src/modules/reportes, apps/admin-web/src/modules/reportes
---

# Spec 073: Reporte web de visitas

## Contexto

El modulo web de Reportes existe como una ruta vacia para `ADMIN` y
`ANALISTA`. Se requiere incorporar su primer reporte operativo para analizar
las visitas activas por ingeniero, productor y rango de fechas, junto con las
parcelas actualmente asignadas y la relacion diaria entre hectareas observadas
y visitas registradas.

## Alcance

### Incluido

- Submodulo `Visitas` dentro de `/reportes`.
- Filtros buscables de Ingeniero y Productor.
- Rango inclusivo de fechas, inicializado desde el primer dia del mes actual
  hasta la fecha actual.
- Tabla resumen de todos los agronomos activos, incluidos los que tengan cero
  visitas para los filtros aplicados.
- Mapa de parcelas activas actualmente asignadas, filtrado por Ingeniero y
  Productor, independiente del rango de fechas.
- Grafico combinado diario con hectareas observadas y visitas activas.
- Acceso exclusivo de lectura para `ADMIN` y `ANALISTA`.

### Excluido

- Exportaciones nuevas, cambios al reporte Excel existente o impresion.
- Cambios a PostgreSQL, migraciones, mobile, SQLite u outbox.
- Visitas inactivas, historico de asignaciones de parcelas o geodatos nuevos.
- Cambios a permisos de Seguridad, Mantenimiento u otros modulos.

## Requisitos

- RF-001: Ingeniero y Productor usan selectores con caja de busqueda y opcion
  para considerar todos los registros.
- RF-002: `fecha_desde` y `fecha_hasta` son obligatorias, inclusivas y deben
  cumplir `fecha_desde <= fecha_hasta`.
- RF-003: el resumen devuelve cada usuario activo con rol `AGRONOMO`, su
  cantidad de visitas activas, cantidad de fechas distintas con visita y el
  promedio `visitas / dias`, redondeado a dos decimales; si no tiene dias, el
  promedio es cero.
- RF-004: los cuatro filtros afectan la tabla y el grafico.
- RF-005: el grafico agrupa por `fecha_visita`; las barras suman
  `visitas_campo.area_ha`, tratando valores nulos como cero, y la linea cuenta
  visitas activas.
- RF-006: el mapa muestra las parcelas activas con geodatos y asignacion actual;
  solo Ingeniero y Productor lo filtran.
- RF-007: las parcelas sin geodatos no se dibujan y la interfaz informa su
  cantidad.
- RNF-001: el reporte usa consultas agregadas sin cargar visitas individuales
  para calcular tabla o grafico.
- RNF-002: la interfaz es accesible por teclado, responde en escritorio y movil
  y conserva los estados de carga, vacio y error del panel.

## Contratos afectados

- Nuevo `GET /reportes/visitas` para `ADMIN` y `ANALISTA` con query:
  - `fecha_desde`: fecha ISO obligatoria;
  - `fecha_hasta`: fecha ISO obligatoria;
  - `agronomo_usuario_id`: entero positivo opcional;
  - `productor_id`: entero positivo opcional.
- Respuesta:

```json
{
  "summary": [
    {
      "agronomistUserId": "7",
      "engineerName": "Ana Lopez",
      "visitsCount": 8,
      "visitDays": 4,
      "dailyAverage": 2
    }
  ],
  "timeline": [
    {
      "visitDate": "2026-09-04",
      "hectares": 12.5,
      "visitsCount": 3
    }
  ]
}
```

- Los filtros reutilizan `GET /usuarios/agronomos`, `GET /productores` y
  `GET /parcelas?activo=true`; no se cambia su contrato.

## Seguridad y datos

- El controlador exige `@Roles("ADMIN", "ANALISTA")`; la visibilidad web no
  sustituye al guard de la API.
- No se exponen correo, telefono, roles completos ni datos de productores en la
  respuesta agregada.
- Los nombres de ingeniero se obtienen solo de usuarios activos con rol
  `AGRONOMO`.
- Las consultas parametrizan IDs y fechas para evitar inyeccion SQL.
- No se registran filtros, geometrias, nombres personales ni contenido del
  reporte en logs.

## Migracion y rollback

No hay migracion de esquema ni datos. El despliegue es aditivo: primero API y
luego web. El rollback elimina la pantalla funcional, el endpoint y el modulo
API; `/reportes` puede volver al estado vacio sin transformar datos.

## Criterios de aceptacion

- [x] CA-001: ADMIN y ANALISTA abren Reportes > Visitas; AGRONOMO no accede.
- [x] CA-002: Ingeniero y Productor se buscan por texto y todos los filtros se
      aplican sin recargar la pagina.
- [x] CA-003: la tabla muestra agronomos activos, visitas, dias distintos y el
      promedio correcto, incluidos ceros.
- [x] CA-004: el mapa muestra solo parcelas activas asignadas que coinciden con
      Ingeniero y Productor, sin depender del rango de fechas.
- [x] CA-005: el grafico diario combina hectareas observadas en barras y visitas
      en linea para los cuatro filtros.
- [x] CA-006: fechas vacias, invalidas o invertidas se rechazan antes de
      consultar; la API aplica la misma validacion.
- [x] CA-007: carga, error, ausencia de datos y vista movil mantienen una salida
      legible y recuperable.

## Pruebas

- Unitarias del DTO, consultas agregadas, ceros, promedio y filtros.
- Metadata de roles del endpoint.
- Unitarias del cliente web, construccion de filtros y filtrado del mapa.
- Lint, typecheck, tests y build de API y admin web.
- Validacion visual manual en escritorio y ancho movil pendiente: el navegador
  integrado no estuvo disponible durante la implementacion.

## Impacto documental

- [x] Arquitectura: se documento el reporte y la diferencia entre agregados
      historicos y asignacion actual del mapa.
- [x] Dominio: se documentaron dias, promedio y hectareas observadas.
- [x] Runbook: evaluado, sin cambios de procedimiento.
- [x] ADR: evaluado, no se introduce una decision arquitectonica nueva.
- [x] Variables o despliegue: evaluado, sin variables nuevas ni migraciones.
