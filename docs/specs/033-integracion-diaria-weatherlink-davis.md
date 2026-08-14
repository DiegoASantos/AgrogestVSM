---
title: Integracion diaria WeatherLink Davis
status: superseded
numero: 033
area: clima, api, postgresql, admin-web, seguridad, integraciones
created: 2026-08-11
approved_by: usuario mediante solicitud directa, 2026-08-11
implemented_in: apps/api/src/modules/clima; apps/api/src/database/migrations/045-integracion-diaria-weatherlink.ts; apps/admin-web/src/modules/clima; render.yaml; docs/domain/data-model.md
superseded_by: docs/specs/037-consulta-directa-weatherlink.md
---

# Spec 033: Integracion diaria WeatherLink Davis

## Contexto

AgroGest ya persiste fuentes, estaciones y lecturas meteorologicas, pero las
estaciones Davis administradas mediante WeatherLink no alimentan el sistema. El
flujo operativo disponible consulta cada manana los datos cerrados del dia
anterior. La integracion debe aprovechar ese comportamiento sin contratar un
trabajo programado adicional y sin exponer credenciales del proveedor.

## Alcance

### Incluido

- WeatherLink v2 como fuente observada dentro de Entorno Agroclimatico.
- Descubrimiento de todas las estaciones accesibles y activacion administrable.
- Importacion historica oportunista al abrir una vista de clima despues de las
  08:00 en `America/Lima`.
- Recuperacion de hasta 30 dias pendientes por ejecucion, en ventanas diarias.
- Temperatura, humedad, rocio, lluvia, viento, presion, radiacion, UV,
  evapotranspiracion, suelo y humedad foliar cuando el sensor los entregue.
- Visualizacion en resumen, mapa, estaciones e historial.
- Estado y progreso persistentes por estacion.

### Excluido

- Condiciones en tiempo real mediante `/current`.
- Cron Jobs, workers permanentes o cambio del plan de Render.
- Alertas agronomicas derivadas de estaciones Davis.
- Mobile offline y almacenamiento del payload crudo de WeatherLink.

## Requisitos

- RF-001: la primera consulta autenticada a una ruta `GET /clima/*` realizada a
  partir de las 08:00 de Lima intenta iniciar la sincronizacion sin bloquear la
  respuesta HTTP.
- RF-002: cada estacion importa dias completos mediante `/historic/{station-id}`
  desde las 00:00 del dia hasta las 00:00 del siguiente dia en Lima.
- RF-003: una ejecucion procesa como maximo 30 dias pendientes por estacion y se
  reanuda desde el ultimo dia completo.
- RF-004: las escrituras son idempotentes por fuente, estacion, variable, tipo e
  instante del dato.
- RF-005: ADMIN puede activar estaciones y forzar un reintento; ADMIN, ANALISTA y
  AGRONOMO pueden consultar datos y progreso.
- RF-006: las estaciones desactivadas no se consultan y el redescubrimiento no
  las reactiva.
- RF-007: la UI muestra datos persistidos y progreso mientras el trabajo ocurre
  en segundo plano, y consulta el estado cada 15 segundos durante la ejecucion.
- RNF-001: API Key y API Secret solo se leen de variables de entorno y nunca se
  registran, devuelven ni versionan.
- RNF-002: un advisory lock de PostgreSQL evita ejecuciones concurrentes.
- RNF-003: timeouts, limites del proveedor y respuestas parciales degradan la
  fuente sin impedir que las vistas devuelvan el ultimo dato valido.

## Contratos afectados

- PostgreSQL: fuente `weatherlink` y tabla
  `clima.estaciones_estado_sincronizacion` con PK interna, UUID publico, FKs a
  fuente y estacion, estado, ultimo dia completo, intentos, exitos y detalle.
- API: `GET /clima/resumen` agrega `stations`; `GET /clima/mapa` agrega elementos
  de tipo `station`; `GET /clima/historico` acepta `estacion_id`; estaciones
  incluyen lecturas y progreso. Se agregan endpoints de estado, activacion y
  reintento WeatherLink.
- Admin web: resumen, mapa, estaciones e historial consumen los contratos
  aditivos y muestran fuente, fecha y antiguedad.
- Configuracion: `WEATHERLINK_ENABLED`, `WEATHERLINK_API_KEY`,
  `WEATHERLINK_API_SECRET`, `WEATHERLINK_DAILY_SYNC_HOUR`,
  `WEATHERLINK_TIME_ZONE`, `WEATHERLINK_CATCHUP_MAX_DAYS` y
  `WEATHERLINK_REQUEST_TIMEOUT_MS`.

## Seguridad y datos

- La frontera de confianza se limita a la API de AgroGest y WeatherLink por TLS;
  el navegador nunca conoce las credenciales.
- Si `WEATHERLINK_ENABLED=true`, API Key y Secret son obligatorios. Si esta
  deshabilitado, la API inicia sin ellos y la fuente queda `SIN_CONFIGURAR`.
- Los errores persistidos se reducen a codigo HTTP o categoria operativa; nunca
  contienen URL, headers, query strings ni cuerpos remotos.
- Las credenciales compartidas durante la definicion se consideran expuestas y
  deben rotarse antes de staging o produccion.

## Migracion y rollback

- Avance: migracion aditiva crea el estado por estacion e inserta la fuente
  WeatherLink idempotentemente. No modifica lecturas existentes.
- Compatibilidad: API y web anteriores ignoran los nuevos datos; mobile no
  cambia.
- Rollback operativo: establecer `WEATHERLINK_ENABLED=false` y desactivar la
  fuente. Se preservan estaciones, lecturas y auditoria.
- Rollback fisico, solo con respaldo y autorizacion: retirar la tabla de estado
  si no contiene informacion requerida. Las lecturas importadas no se eliminan
  automaticamente.

## Criterios de aceptacion

- [x] CA-001: antes de las 08:00 no se inicia la importacion diaria.
- [x] CA-002: la primera consulta posterior inicia una sola ejecucion en segundo
      plano y devuelve inmediatamente los datos persistidos.
- [x] CA-003: se importan ayer y hasta 30 dias pendientes sin duplicados.
- [x] CA-004: una interrupcion reanuda desde el ultimo dia marcado completo.
- [x] CA-005: resumen, mapa, estaciones e historial muestran estaciones Davis.
- [x] CA-006: ADMIN puede activar/desactivar y reintentar; los demas roles no
      pueden mutar.
- [x] CA-007: ninguna credencial aparece en Git, logs, errores o respuestas.
- [x] CA-008: migracion, lint, tipos, pruebas y builds terminan correctamente.

## Pruebas

- unitarias para calculo diario, ventanas, conversiones y mapeo de sensores;
- unitarias para configuracion y sanitizacion de errores;
- servicio con descubrimiento, reanudacion, deduplicacion, `401/403`, `429` y
  timeout simulados;
- integracion HTTP para contratos y roles;
- pruebas web de estado, progreso, activacion e historial;
- smoke aislado de migracion PostgreSQL.

## Impacto documental

- [x] Arquitectura y modelo del dominio.
- [x] Spec 020 como ampliacion del proveedor observado.
- [x] Runbook de despliegue y variables Render.
- [x] Linea base de seguridad y registro de riesgos.
- [x] Indice de documentacion y specs.
