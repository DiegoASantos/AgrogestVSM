---
title: Módulo clima territorial para el panel web
status: implementing
numero: 020
area: clima, api, postgresql, geodatos, admin-web, seguridad, integraciones
created: 2026-07-30
approved_by: usuario, 2026-07-30; ampliación aprobada por usuario, 2026-08-10
implemented_in: apps/api/src/modules/clima; apps/admin-web/src/modules/clima; apps/admin-web/src/modules/auth/utils/authorization.ts; apps/admin-web/src/shared/components/admin-layout-shell.tsx; docs/domain/data-model.md (ampliación 2026-08-10)
---

# Spec 020: Módulo clima territorial para el panel web

## Contexto

AgroGest requiere un módulo climático administrativo, independiente de parcelas,
visitas y demás datos operativos. Servirá para consultar, almacenar y auditar
datos territoriales de Piura, Áncash y Lambayeque. La consulta Open-Meteo por
parcela disponible en mobile no cambia ni alimenta este módulo.

## Ampliación aprobada el 2026-08-10

El usuario amplió el acceso web de consulta a `ADMIN`, `ANALISTA` y
`AGRONOMO`. También aprobó convertir las mediciones del Resumen y el Historial
en visualizaciones gráficas, mejorar de forma coherente las siete vistas,
explicar VPD como déficit de presión de vapor y reparar el pronóstico de tres
días del mapa agroclimático. Esta ampliación reemplaza las restricciones de
solo ADMIN de la versión inicial; las mutaciones administrativas futuras siguen
reservadas a `ADMIN`.

## Alcance

### Incluido

- Grupo lateral **Clima**, sin ruta propia, con Resumen climático, Mapa
  agroclimático, Pronóstico, Historial climático, Estaciones meteorológicas,
  Alertas climáticas y Estado de fuentes de datos.
- ADMIN, ANALISTA y AGRONOMO pueden consultar las siete vistas y las rutas
  `GET /clima/*`.
- Puntos climáticos territoriales iniciales: Tambogrande, Las Lomas, Casma y
  Motupe; administrables sin relacionarse a una parcela.
- Open-Meteo para condición, pronóstico e histórico; NASA POWER para contraste
  histórico y radiación; SENAMHI como referencia no integrada (`SIN_CONFIGURAR`).
- Persistencia PostgreSQL de fuentes, puntos, estaciones, lecturas,
  pronósticos, umbrales, alertas y ejecuciones de sincronización.
- Estaciones manuales de tipo virtual, oficial, externa o propia; importación
  CSV validada y preparación de adaptadores futuros.
- Alertas exclusivamente meteorológicas, deduplicadas y configurables por ADMIN.
- Exportación CSV del histórico filtrado.

### Excluido

- Asociar, inferir o mostrar parcelas, visitas, diagnósticos, fenología,
  recomendaciones agronómicas o cálculos de riego.
- Mutaciones o administración climática por roles distintos de ADMIN.
- Uso de SENAMHI como fuente operativa sin contrato y validación de actualización.
- MQTT, METOS/iMETOS Disease, credenciales de estaciones o recomendaciones
  automáticas; se implementarán mediante una spec futura aprobada.

## Requisitos

- RF-001: El padre Clima es un grupo expandible sin redirección; las siete rutas
  hijas aparecen para ADMIN, ANALISTA y AGRONOMO en el orden aprobado y se
  protegen en frontend y API.
- RF-002: Todo dato conserva fuente, punto o estación, variable, unidad, tipo
  (`OBSERVADO`, `ESTIMADO`, `PRONOSTICADO`, `HISTÓRICO`), instante del dato,
  recepción y calidad. La UI diferencia esos tipos y señala datos vencidos.
- RF-003: Resumen presenta condición territorial, mínimo/máximo, humedad,
  precipitación, viento, radiación/ET0 cuando aplique, pronóstico de siete días,
  alertas activas y estado de fuentes. Las mediciones climáticas se representan
  mediante gráficos con una sola unidad por eje; VPD se rotula como
  `VPD (déficit de presión de vapor)`.
- RF-004: Mapa usa Leaflet ya instalado y solo visualiza puntos climáticos y
  estaciones; al seleccionar un punto muestra condición actual y pronóstico de
  los próximos tres días usando las variables diarias realmente entregadas por
  la API.
- RF-005: Pronóstico presenta 72 h horario y 7–15 días diarios cuando la fuente
  lo permita. Historial ofrece series temporales gráficas por variable y
  conserva una tabla secundaria de trazabilidad accesible.
- RF-006: Estaciones permiten CRUD ADMIN, activación, variables disponibles,
  última comunicación e importación CSV. No se aceptan secretos ni lecturas
  manipulables desde el navegador.
- RF-007: Alertas genéricas se calculan después de cada sincronización, se
  deduplican por regla/punto/ventana y pueden atenderse, descartarse o vencer.
- RF-008: Umbrales semilla editables y desactivables: calor 35/38 °C, frío
  12/8 °C, probabilidad lluvia 70/90 %, lluvia 25/50 mm/24 h, viento 35/50 km/h
  y ET0 6/7.5 mm, para severidades PRECAUCIÓN/ALTA/CRÍTICA según corresponda.
- RNF-001: El resumen cacheado carga normalmente en menos de tres segundos;
  fallos externos no detienen el módulo y quedan trazados como salud de fuente.
- RNF-002: Condiciones se actualizan cada hora, pronóstico cada tres horas,
  histórico diariamente y salud de fuentes cada quince minutos, evitando
  ejecuciones concurrentes y llamadas repetidas.

## Contratos afectados

- PostgreSQL: migración expansiva con esquema `clima`, entidades TypeORM e
  índices de unicidad para evitar duplicados por fuente, punto, variable e
  instante.
- API OpenAPI: endpoints de lectura para ADMIN, ANALISTA y AGRONOMO
  `/clima/resumen`, `/clima/mapa`,
  `/clima/pronostico`, `/clima/historico`, `/clima/puntos`,
  `/clima/estaciones`, `/clima/alertas`, `/clima/fuentes` y CSV de histórico.
- Admin web: rutas `/clima/*`, navegación, tipos y servicios. Mobile y sus
  contratos actuales no se modifican.

## Seguridad y datos

- El controlador climático web usa `@Roles("ADMIN", "ANALISTA", "AGRONOMO")`
  sobre endpoints GET; el control de UI no sustituye esa restricción. Cualquier
  mutación futura debe declarar `@Roles("ADMIN")` en el handler correspondiente.
- Latitud/longitud pertenecen a puntos territoriales y estaciones administradas,
  no a geodatos de parcelas. Las credenciales futuras se usarán exclusivamente
  desde variables de entorno y nunca se devolverán, registrarán o importarán.
- La importación CSV limita tamaño, valida encabezados/unidades/fechas y reporta
  filas rechazadas sin escritura parcial.
- Los proveedores se consultan solo desde la API, con timeout, límite de
  concurrencia y logs sin URLs con secretos.

## Migración y rollback

1. Crear esquema y tablas nuevas sin afectar entidades existentes ni SQLite.
2. Sembrar fuentes, cuatro puntos y umbrales idempotentemente; desplegar API
   compatible antes de habilitar tareas programadas.
3. Publicar panel web con rutas ADMIN y estados vacíos seguros mientras carga.
4. El rollback deshabilita las tareas y rutas nuevas; no elimina observaciones,
   alertas o auditoría. La migración inversa solo elimina el esquema si no hay
   datos a conservar y se ejecuta con respaldo aprobado.

## Criterios de aceptación

- [ ] CA-001: El menú padre Clima no navega y sus siete hijos aparecen para
      ADMIN, ANALISTA y AGRONOMO en el orden aprobado.
- [ ] CA-002: Los cuatro puntos se consultan sin relación con parcelas ni visitas.
- [ ] CA-003: Resumen, mapa, pronóstico e historial distinguen tipo, fuente y
      fecha de actualización; Resumen e Historial priorizan gráficos y un fallo
      muestra último dato válido o estado claro.
- [ ] CA-004: Open-Meteo y NASA POWER persisten datos normalizados sin duplicados.
- [ ] CA-005: Estaciones, fuentes y umbrales respetan ADMIN; CSV inválido no
      persiste registros parciales.
- [ ] CA-006: Alertas se deduplican, vencen y nunca recomiendan labores agrícolas.
- [ ] CA-007: ADMIN, ANALISTA y AGRONOMO consultan Clima; otro rol autenticado
      recibe 403 en la API y no obtiene acceso por URL directa en web.

## Pruebas

- Unitarias para normalización, adaptadores, umbrales, deduplicación y vigencia.
- Integración PostgreSQL para migración, índices, seeds, autorización y rollback.
- HTTP/OpenAPI para filtros, CSV, 401/403, proveedor lento/no disponible y caché.
- UI/E2E para navegación de los tres roles, gráficos, filtros, mapa, pronóstico
  de tres días, estados vacíos y datos vencidos.
- Prueba operativa de los cuatro puntos durante varios días, con fuente 100 %
  identificada y disponibilidad objetivo de consultas de al menos 98 %.

## Impacto documental

- [ ] Actualizar arquitectura, modelo de dominio y runbook de operación climática.
- [ ] Registrar tareas, fuentes, variables y riesgos en operaciones.
- [ ] Marcar `docs/plan_modulo_clima_agrogest_vsm.md` como antecedente de esta
      spec y mantenerlo enlazado desde la documentación canónica.
