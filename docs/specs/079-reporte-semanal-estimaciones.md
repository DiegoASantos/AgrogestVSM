---
title: Reporte semanal de estimaciones de visitas
status: implemented
numero: "079"
area: reportes, estimaciones, api, admin-web, seguridad
created: 2026-09-07
approved_by: Usuario mediante instrucción "Implement the plan", 2026-09-07
implemented_in: apps/api/src/modules/reportes; apps/admin-web/src/modules/reportes; apps/admin-web/src/app/(admin)/reportes/estimaciones; docs/architecture/overview.md; docs/domain/data-model.md
---

# Spec 079: Reporte semanal de estimaciones de visitas

## Contexto

El módulo principal Estimaciones permite planificar y comparar una semana a la
vez. Se necesita un reporte temporal que muestre la evolución de las visitas
proyectadas y ejecutadas a lo largo de varias semanas.

## Alcance

### Incluido

- Submódulo `Estimaciones` en Reportes del panel administrativo.
- Rango inclusivo normalizado a semanas completas de lunes a domingo.
- Filtro opcional por agrónomo y total general por defecto.
- Tabla semanal y gráfico de dos líneas para proyectadas y ejecutadas.
- Acceso de lectura para `ADMIN` y `ANALISTA`.

### Excluido

- Migraciones, tablas nuevas o modificaciones de las estimaciones guardadas.
- Mobile, exportaciones, notificaciones y nuevos permisos.
- Agrupaciones diarias o mensuales y filtros por productor o parcela.

## Requisitos

- RF-001: las fechas requeridas se normalizan hacia afuera; el inicio retrocede
  al lunes de su semana y el fin avanza al domingo de su semana.
- RF-002: se devuelven todas las semanas del rango, incluidas las que no tienen
  datos y las futuras, ordenadas cronológicamente.
- RF-003: las visitas proyectadas suman las estimaciones activas de la semana;
  las ejecutadas cuentan visitas activas atribuidas al agrónomo de la visita.
- RF-004: el filtro opcional de agrónomo se aplica a ambos agregados; sin filtro
  se suman todos los agrónomos y se conserva la historia aunque su estado actual
  cambie.
- RF-005: la variación es
  `(ejecutadas - proyectadas) / proyectadas * 100`, redondeada a dos decimales;
  si la proyección total es cero, no aplica.
- RF-006: la vista inicia desde la semana que contiene el 1 de enero del año
  actual hasta el domingo de la semana actual.
- RF-007: el gráfico usa visitas en el eje Y y semana ISO en el eje X; presenta
  una línea de proyectadas y otra de ejecutadas.
- RNF-001: API y web restringen el acceso a `ADMIN` y `ANALISTA`.
- RNF-002: fechas e identificador se validan y todas las consultas son
  parametrizadas.
- RNF-003: la respuesta contiene solo fechas, número de semana y agregados; no
  expone datos personales.

## Contratos afectados

`GET /reportes/estimaciones` requiere `fecha_desde` y `fecha_hasta`, y acepta
`agronomo_usuario_id`. Devuelve el rango normalizado y filas semanales con año
ISO, número de semana, fechas, visitas proyectadas, ejecutadas y variación.

El panel agrega la ruta protegida `/reportes/estimaciones` y su entrada en la
navegación secundaria de Reportes.

## Seguridad y datos

El guard existente de Reportes exige `ADMIN` o `ANALISTA`. La consulta excluye
visitas y estimaciones inactivas, parametriza el rango y el identificador, y no
registra filtros ni resultados en logs.

## Migración y rollback

No hay migración. API y web deben desplegarse en conjunto; el rollback restaura
el controlador, servicio y navegación anteriores sin afectar datos.

## Criterios de aceptación

- [x] CA-001: ADMIN y ANALISTA acceden al reporte; AGRONOMO no accede.
- [x] CA-002: el rango se normaliza a lunes-domingo y rechaza fechas invertidas.
- [x] CA-003: todas las semanas aparecen aun con valores cero o fechas futuras.
- [x] CA-004: el total y el filtro por agrónomo agregan proyectadas y ejecutadas
      con las mismas reglas históricas.
- [x] CA-005: la variación conserva signo, usa dos decimales y muestra `No
aplica` con proyección cero.
- [x] CA-006: tabla y gráfico representan la misma serie; el gráfico usa semana
      ISO en X y visitas en Y.
- [x] CA-007: la vista cubre carga, error y ausencia de actividad, es responsive
      y funciona en modo oscuro.

## Pruebas

- DTO, controlador, roles, normalización semanal y consulta parametrizada.
- Agregados, semanas vacías, cruce de año, filtro y variación nula.
- Cliente web, utilidades temporales, navegación, tabla y gráfico accesible.
- Lint, typecheck, pruebas focalizadas, `pnpm check`, build y revisión del diff.

Resultado de cierre: pruebas focalizadas 43/43, `pnpm check` con 1841/1841
pruebas y documentación válida, y build completo aprobado con la ruta
`/reportes/estimaciones`. DeepSeek aprobó el diff y la revisión final del ajuste
del eje X sin hallazgos.

## Impacto documental

- [x] Arquitectura.
- [x] Dominio.
- [ ] Runbook: evaluado, sin procedimiento nuevo.
- [ ] ADR: no introduce una decisión arquitectónica nueva.
- [ ] Variables o despliegue: sin variables; API y web se liberan juntas.
