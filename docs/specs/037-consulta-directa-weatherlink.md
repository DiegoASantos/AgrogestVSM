---
title: Consulta directa WeatherLink por rango
status: implemented
numero: 037
area: clima, api, admin-web, mobile, sqlite, seguridad, integraciones
created: 2026-08-14
approved_by: usuario mediante instruccion "Implement the plan", 2026-08-14
implemented_in: apps/api/src/modules/clima; apps/admin-web/src/modules/clima; apps/mobile/src/modules/clima; docs/architecture/mobile-offline-sync.md; docs/domain/data-model.md
---

# Spec 037: Consulta directa WeatherLink por rango

## Contexto

La importacion diaria WeatherLink falla al persistir lecturas y deja datos
desactualizados. Las vistas necesitan consultar observaciones historicas bajo
demanda sin depender de una tarea oportunista a las 08:00 ni escribir cada
lectura en PostgreSQL.

## Alcance

### Incluido

- consulta directa de estaciones Davis por un rango inclusivo de hasta siete
  dias cerrados;
- seleccion de estacion, fecha inicial y fecha final en web y mobile;
- serie completa en web y resumen diario desplegable en mobile;
- cache API en memoria de diez minutos y ultima consulta mobile en SQLite;
- retiro de disparadores, progreso e incidentes de la sincronizacion diaria;
- actualizacion manual del catalogo de estaciones, sin importar lecturas.

### Excluido

- condiciones del dia actual mediante `/current`;
- persistencia de nuevas lecturas WeatherLink en PostgreSQL;
- eliminacion de lecturas, tablas o auditoria historicas;
- alertas agronomicas derivadas de Davis.

## Requisitos

- RF-001: `GET /clima/historico` con `estacion_id` exige `desde` y `hasta` en
  formato `YYYY-MM-DD`, con rango inclusivo de uno a siete dias y `hasta` como
  maximo ayer en `America/Lima`.
- RF-002: la API consulta una ventana WeatherLink por dia, normaliza las
  lecturas y devuelve filas y resumen diario sin escribirlas en PostgreSQL.
- RF-003: una cache en memoria por estacion y dia evita repetir solicitudes
  identicas durante diez minutos.
- RF-004: web y mobile solo consultan tras la accion explicita `Consultar`.
- RF-005: mobile conserva la ultima respuesta por estacion como cache de solo
  lectura, sin `sync_outbox`.
- RF-006: ADMIN puede actualizar el catalogo y activar estaciones; ADMIN,
  ANALISTA y AGRONOMO pueden consultar observaciones.
- RNF-001: API Key, API Secret, URL autenticada y payload crudo no salen de API
  ni aparecen en logs o errores.
- RNF-002: las consultas tienen limite por usuario y concurrencia acotada para
  proteger la cuota del proveedor.

## Contratos afectados

- API: la rama WeatherLink de `GET /clima/historico` agrega rango, fecha de
  consulta, metadata de cache y resumen diario. La rama Open-Meteo no cambia.
- API: `GET /clima/estaciones` conserva su forma compatible, identifica modo de
  consulta directa y deja de iniciar sincronizaciones.
- API: el estado y reintento diario quedan compatibles pero inactivos; se
  agrega una accion ADMIN para refrescar solo metadata de estaciones.
- SQLite: `clima_estacion_cache.payload_json` conserva la ultima consulta y su
  rango sin cambio de esquema.

## Seguridad y datos

- La API resuelve el UUID publico a la identidad WeatherLink interna.
- La validacion de rango ocurre antes de llamar al proveedor.
- Los errores remotos se traducen a mensajes operativos sin credenciales ni
  detalles internos.
- La cache API es efimera y la cache mobile no contiene secretos ni genera
  operaciones sincronizables.

## Migracion y rollback

1. No hay migracion PostgreSQL ni SQLite.
2. Las tablas y lecturas WeatherLink existentes se conservan para auditoria y
   rollback, pero los clientes nuevos no las consideran vigentes.
3. Las variables de sincronizacion diaria permanecen temporalmente aceptadas y
   documentadas como obsoletas.
4. El rollback consiste en desplegar la version anterior y reactivar su flujo;
   no requiere restaurar datos.

## Criterios de aceptacion

- [ ] CA-001: ambos fundos consultan uno a siete dias hasta ayer y muestran
      observaciones sin intentar guardarlas.
- [x] CA-002: ninguna ruta GET dispara la sincronizacion WeatherLink diaria.
- [x] CA-003: una consulta repetida dentro de diez minutos usa cache.
- [x] CA-004: web muestra rango, serie, tabla y trazabilidad de consulta directa.
- [x] CA-005: mobile muestra resumen diario y recupera su ultima consulta sin
      conexion, sin crear outbox.
- [x] CA-006: no vuelve a aparecer el error de guardado de lecturas WeatherLink.
- [x] CA-007: roles, limites, secretos, lint, tipos, pruebas y builds quedan
      verificados.

## Pruebas

- unitarias de fechas Lima, rango, cache, agregados y errores WeatherLink;
- controladores y roles para consulta y refresco de catalogo;
- web para filtros, accion explicita, grafica, tabla y estados;
- mobile para cache, rango, resumen diario, desconexion y ausencia de outbox;
- gates de API, admin-web, mobile, documentacion y secretos.

## Impacto documental

- [x] Arquitectura.
- [x] Dominio.
- [x] Runbook.
- [x] ADR: no aplica; reemplaza una estrategia acotada mediante spec.
- [x] Variables o despliegue.
