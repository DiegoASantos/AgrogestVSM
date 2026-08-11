---
title: Reservorios en el Entorno Agroclimático
status: implementing
numero: 032
area: clima, api, postgresql, geodatos, admin-web, seguridad
created: 2026-08-11
approved_by: usuario mediante solicitud directa, 2026-08-11
implemented_in:
---

# Spec 032: Reservorios en el Entorno Agroclimático

## Contexto

Los reservorios de Poechos y San Lorenzo son infraestructura hídrica crítica para
la agricultura en Piura. Su nivel, volumen y caudales impactan directamente las
decisiones de riego de los productores monitoreados por AgroGest. Actualmente el
módulo de Clima expone variables meteorológicas pero ignora el estado de los
embalses, obligando al usuario a consultar fuentes externas para correlacionar
clima y disponibilidad de agua.

En lugar de crear un módulo separado, los reservorios se integran en el módulo de
Clima existente, que pasa a llamarse **Entorno Agroclimático** en la interfaz. Esto
refleja la realidad agronómica: temperatura, lluvia, viento y agua almacenada se
evalúan juntos.

## Alcance

### Incluido

- Renombrar el grupo lateral `Clima` a `Entorno Agroclimático`, `Resumen climático`
  a `Resumen Agroclimático` e `Historial climático` a `Historial Agroclimático`.
  Las rutas `/clima/*` y el esquema SQL `clima` se conservan sin cambios.
- Nuevas tablas `clima.reservorios` y `clima.lecturas_reservorios` en el esquema
  PostgreSQL existente.
- Seed de los reservorios Poechos y San Lorenzo con coordenadas, capacidad máxima
  y cota máxima.
- Endpoints `GET /clima/reservorios`, `GET /clima/reservorios/:id/historico`,
  `POST /clima/reservorios/:id/lecturas`, `PUT /clima/reservorios/:id/lecturas/:id`,
  `DELETE /clima/reservorios/:id/lecturas/:id`.
- Formulario de carga manual de lecturas desde el panel web (ADMIN y ANALISTA).
- Widget de estado de reservorios en el Resumen Agroclimático: nombre, volumen
  actual, porcentaje de capacidad, tendencia reciente.
- Puntos de reservorios en el Mapa Agroclimático, diferenciados visualmente de los
  puntos climáticos (color e ícono).
- Panel lateral del mapa: al seleccionar un reservorio muestra última lectura y
  minigráfico de evolución de volumen.
- Extensión del endpoint `GET /clima/resumen` para incluir `reservorios` en el
  payload.
- Las lecturas de reservorios se muestran en el Historial Agroclimático como una
  categoría adicional de variables seleccionables.

### Excluido

- Integración automática con ANA, SNIRH, PECHP u otras fuentes externas. Se
  evaluará en una spec futura cuando la fuente esté definida y disponible.
- Sincronización offline mobile. Los datos de reservorios solo se visualizan en el
  panel web en esta etapa.
- Asociación de reservorios a parcelas, productores o recomendaciones de riego.
- Alertas automáticas por umbrales de reservorio.
- Carga masiva o importación CSV de lecturas de reservorios.

## Requisitos

### Datos de reservorio

- RF-001: Cada reservorio tiene `nombre`, `departamento`, `provincia`, `distrito`,
  `latitud`, `longitud`, `capacidad_max_mmc` (volumen máximo en millones de metros
  cúbicos) y `cota_max_msnm` (cota máxima en metros sobre el nivel del mar).
- RF-002: Los atributos fijos de un reservorio solo puede modificarlos ADMIN. No
  hay eliminación de reservorios desde la UI; es una operación de base de datos.
- RF-003: Las lecturas de un reservorio registran `variable` (cota_msnm,
  volumen_mmc, caudal_entrada_m3s, caudal_salida_m3s, evaporacion_mm), `valor`,
  `unidad`, `tipo` (OBSERVADO o ESTIMADO), `dato_at` (fecha/hora del dato en
  campo) y `fuente_id` (referencia a `clima.fuentes_datos`, con una fuente de tipo
  manual).
- RF-004: Cada lectura conserva trazabilidad: quién la creó, cuándo se recibió y
  desde qué fuente.

### Permisos

- RF-005: ADMIN y ANALISTA pueden crear, editar y eliminar lecturas de reservorios.
- RF-006: AGRONOMO solo puede visualizar reservorios y lecturas; no ve los
  controles de creación, edición ni eliminación.
- RF-007: La API aplica guards para que las mutaciones `POST`, `PUT` y `DELETE`
  sobre lecturas rechacen a AGRONOMO con 403.

### API

- RF-008: `GET /clima/reservorios` devuelve la lista de reservorios; cada uno
  incluye su última lectura por variable.
- RF-009: `GET /clima/reservorios/:id/historico?desde=&hasta=&variable=` devuelve
  la serie temporal filtrada.
- RF-010: `POST /clima/reservorios/:id/lecturas` acepta `{ variable, valor, unidad,
tipo, dato_at }` y crea una lectura asociada a una fuente manual.
- RF-011: `PUT /clima/reservorios/:id/lecturas/:lecturaId` y
  `DELETE /clima/reservorios/:id/lecturas/:lecturaId` permiten corregir o eliminar
  lecturas.
- RF-012: `GET /clima/resumen` incluye el bloque `reservorios` en el payload, al
  mismo nivel que `points`, `alerts` y `sources`.

### Panel web

- RF-013: El grupo de navegación lateral se renombra a `Entorno Agroclimático`. Las
  etiquetas `Resumen climático`, `Historial climático` pasan a `Resumen
Agroclimático`, `Historial Agroclimático`. Las demás etiquetas (Mapa
  agroclimático, Pronóstico, Estaciones, Alertas, Fuentes) no cambian.
- RF-014: El Resumen Agroclimático muestra un widget con cada reservorio: nombre,
  volumen actual, porcentaje sobre capacidad máxima, indicador de tendencia (sube
  / baja / estable respecto a la lectura anterior).
- RF-015: El Mapa Agroclimático muestra los reservorios como puntos con color azul
  agua y un ícono de gota, diferenciados de los puntos climáticos. Al
  seleccionarlos, el panel lateral muestra la última lectura y una minigráfica de
  evolución de volumen.
- RF-016: El Historial Agroclimático permite seleccionar, además de las variables
  meteorológicas, las variables de reservorio (`cota_msnm`, `volumen_mmc`,
  `caudal_entrada_m3s`, `caudal_salida_m3s`, `evaporacion_mm`) cuando el punto
  seleccionado es un reservorio.
- RF-017: El formulario de carga manual de lecturas está disponible en el panel
  lateral del mapa y en una sección dedicada accesible desde el resumen. Solo se
  renderiza para ADMIN y ANALISTA.

### Datos semilla

- RF-018: La migración inserta los reservorios Poechos (capacidad ~885 MMC, cota
  máxima ~108 msnm) y San Lorenzo (capacidad ~200 MMC, cota máxima ~70 msnm) con
  coordenadas reales aproximadas.
- RF-019: Se crea o reutiliza una entrada en `clima.fuentes_datos` con código
  `manual_reservorios`, nombre `Carga manual`, tipo `MANUAL` y estado `OPERATIVA`.

## Contratos afectados

### PostgreSQL

Nuevas tablas en el esquema `clima`:

```sql
CREATE TABLE IF NOT EXISTS clima.reservorios (
    id                bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    public_id         uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    nombre            varchar(120) NOT NULL,
    departamento      varchar(60),
    provincia         varchar(80),
    distrito          varchar(80),
    latitud           double precision NOT NULL,
    longitud          double precision NOT NULL,
    capacidad_max_mmc double precision,
    cota_max_msnm     double precision,
    creado_at         timestamptz DEFAULT now() NOT NULL,
    actualizado_at    timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS clima.lecturas_reservorios (
    id              bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    public_id       uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    reservorio_id   bigint NOT NULL REFERENCES clima.reservorios(id),
    fuente_id       bigint REFERENCES clima.fuentes_datos(id),
    variable        varchar(60) NOT NULL,
    valor           double precision NOT NULL,
    unidad          varchar(20) NOT NULL,
    tipo            varchar(30) DEFAULT 'OBSERVADO' NOT NULL,
    dato_at         timestamptz NOT NULL,
    creado_por      uuid,
    recibido_at     timestamptz DEFAULT now() NOT NULL,
    creado_at       timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lecturas_reservorios_reservorio
    ON clima.lecturas_reservorios(reservorio_id, variable, dato_at DESC);
```

### API

Se extiende `ClimaController` sin crear un nuevo controlador. Las rutas nuevas
quedan bajo el prefijo `/clima/reservorios`. La respuesta de `/clima/resumen`
agrega el bloque `reservorios`.

### Web

- `clima.service.ts` (admin-web): nuevos métodos `getReservorios`,
  `getReservorioHistory`, `createReservorioReading`, `updateReservorioReading`,
  `deleteReservorioReading`.
- `clima-screen.tsx`: widget `ReservoirStatus`, puntos de reservorio en el mapa,
  panel lateral con lecturas, formulario de carga.
- `admin-navigation.ts`: renombrar grupo y etiquetas afectadas.

### Tipos compartidos

Nuevos tipos en `clima.service.ts` (admin-web): `Reservoir`, `ReservoirReading`.
El `Summary` extiende su tipo para incluir `reservoirs: Reservoir[]`.

## Seguridad y datos

- No se exponen secretos ni credenciales. La fuente `manual_reservorios` es
  puramente declarativa.
- Los guards de la API aplican `@Roles("ADMIN", "ANALISTA")` para mutaciones y
  `@Roles("ADMIN", "ANALISTA", "AGRONOMO")` para consultas.
- El `creado_por` de cada lectura se obtiene del JWT del usuario autenticado, no
  del cuerpo del request.
- Las coordenadas de los reservorios son datos públicos. No contienen información
  personal.
- Los valores de capacidad y cota se validan como positivos en el backend.

## Migración y rollback

- **Avance**: nueva migración numerada que crea las tablas `clima.reservorios` y
  `clima.lecturas_reservorios`, los índices, y el seed de Poechos, San Lorenzo y
  la fuente manual.
- **Compatibilidad**: las tablas son nuevas; no afectan lecturas, estaciones ni
  alertas existentes. La migración es aditiva.
- **Rollback**: `DROP TABLE IF EXISTS clima.lecturas_reservorios; DROP TABLE IF
EXISTS clima.reservorios; DELETE FROM clima.fuentes_datos WHERE codigo =
'manual_reservorios';`. No hay pérdida de datos previos.

## Criterios de aceptación

- [ ] CA-001: El menú lateral muestra "Entorno Agroclimático" con "Resumen
      Agroclimático" e "Historial Agroclimático".
- [ ] CA-002: El Resumen Agroclimático incluye un widget con Poechos y San
      Lorenzo mostrando volumen actual y porcentaje de capacidad.
- [ ] CA-003: El Mapa Agroclimático muestra dos puntos adicionales de color azul
      con ícono de gota para los reservorios.
- [ ] CA-004: Al seleccionar un reservorio en el mapa, el panel lateral muestra
      la última lectura de cota, volumen, caudales y evaporación.
- [ ] CA-005: Un usuario ADMIN o ANALISTA puede crear una lectura desde un
      formulario con campos: variable, valor, unidad, tipo, fecha del dato.
- [ ] CA-006: Un usuario AGRONOMO no ve el formulario de carga ni botones de
      editar/eliminar en lecturas.
- [ ] CA-007: La API rechaza con 403 cualquier mutación de lecturas hecha por un
      AGRONOMO.
- [ ] CA-008: El Historial Agroclimático permite seleccionar un reservorio y
      graficar la evolución de volumen, cota o caudales en el tiempo.
- [x] CA-009: La migración se ejecuta sin errores y el seed inserta Poechos y San
      Lorenzo correctamente.

## Pruebas

- unitarias para el servicio de reservorios en API;
- unitarias para el servicio de reservorios en admin-web;
- unitarias para los guards de autorización (ADMIN/ANALISTA vs AGRONOMO);
- integración para los endpoints nuevos;
- validación manual de la migración en entorno local;
- validación manual de los tres roles en la UI.

## Impacto documental

- [x] `docs/domain/data-model.md`: agregar tablas `clima.reservorios` y
      `clima.lecturas_reservorios`.
- [x] `docs/index.md`: actualizar referencia a "Entorno Agroclimático".
- [ ] Spec 020: anotar la ampliación de alcance con referencia a esta spec.
