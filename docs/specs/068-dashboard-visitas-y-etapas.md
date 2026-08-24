---
title: Dashboard de visitas por agrónomo y parcelas por etapa
status: implemented
numero: "068"
area: api, admin-web, dashboard
created: 2026-08-24
approved_by: usuario mediante instrucción "Implement the plan", 2026-08-24
implemented_in: apps/api/src/modules/dashboard; apps/admin-web/src/modules/dashboard; docs/architecture/overview.md
---

# Spec 068: Dashboard de visitas por agrónomo y parcelas por etapa

## Contexto

El dashboard requería visibilidad de la carga de visitas por agrónomo y del
estado fenológico más reciente de las parcelas, con filtros independientes por
rango de fechas.

## Alcance

### Incluido

- Gráfico de visitas activas agrupadas por agrónomo y rango de fechas.
- Gráfico de parcelas por la etapa de su última visita activa en el rango.
- Filtro opcional con todas las filas activas de `etapas_fenologicas`, mostrando
  nombre y tipo.
- Tarjeta fija con los apellidos y nombres de los productores correspondientes
  a cada barra.

### Excluido

- Cambios a PostgreSQL, mobile, sincronización o reglas de guardado de visitas.
- Permitir registrar una visita nueva con una etapa de tipo `Labor`.

## Requisitos

- RF-001: Cada gráfico conserva su propio rango de fechas, inicialmente desde
  el primer día del mes actual hasta hoy.
- RF-002: El gráfico por agrónomo cuenta solo visitas activas y ordena de mayor
  a menor cantidad.
- RF-003: El gráfico por etapa considera una sola visita por parcela: la más
  reciente por fecha y, ante empate, la de mayor ID.
- RF-004: El filtro de etapa muestra todas las filas activas de
  `etapas_fenologicas`, incluidas las de tipo `Labor`.
- RF-005: La tarjeta de detalle no sigue el puntero y muestra solo apellidos y
  nombres de productores, sin códigos ni nombres de parcelas.
- RF-006: Una etapa de tipo `Labor` solo mostrará resultados si una visita ya la
  referencia; la regla actual de alta de visitas no se modifica.

## Contratos afectados

- `GET /dashboard/visitas-por-agronomo?fecha_desde&fecha_hasta` devuelve
  agrónomo, ID y cantidad de visitas.
- `GET /dashboard/parcelas-por-etapa?fecha_desde&fecha_hasta&etapa_fenologica_id?`
  devuelve opciones del catálogo y grupos con etapa, tipo, cantidad y productores.
- Ambos parámetros de fecha son ISO opcionales, inclusivos y deben respetar
  `fecha_desde <= fecha_hasta`.

## Seguridad y datos

Los endpoints conservan los guards globales de autenticación y la lectura de
dashboard disponible para roles autorizados. No se registran datos personales
en logs ni se modifica información persistida.

## Migración y rollback

No hay migración. El despliegue es compatible porque suma endpoints de lectura.
Rollback: retirar las tarjetas web y los dos endpoints; no requiere transformar
datos ni clientes mobile.

## Criterios de aceptación

- [x] CA-001: Se muestran visitas por agrónomo para un rango independiente.
- [x] CA-002: Se muestran parcelas por etapa según su última visita del rango.
- [x] CA-003: La tarjeta fija de cada etapa enumera los productores.
- [x] CA-004: El catálogo de filtro incluye nombre y tipo de todas las etapas
      activas.
- [x] CA-005: Fechas invertidas se rechazan antes de consultar datos.

## Pruebas

- Unitarias del servicio dashboard para la validación de rango y agrupación de
  parcelas por etapa.
- Unitarias del cliente web para las nuevas rutas y parámetros.
- Typecheck y lint focalizados de API y admin web.

## Impacto documental

- [x] Arquitectura: dashboard actualizado como panel de métricas de visitas y
      estado fenológico.
- [x] Spec e índices.
- [ ] Dominio, runbook, ADR, variables o despliegue: sin cambios.
