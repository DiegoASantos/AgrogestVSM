---
title: Plan de implementación del Módulo Clima para AgroGest VSM
status: active
owner: mantenimiento
last_reviewed: 2026-08-01
---

title: Plan de implementación del Módulo Clima para AgroGest VSM
status: active
owner: mantenimiento
last_reviewed: 2026-08-01
---

---
title: Plan de implementación del Módulo Clima para AgroGest VSM
status: active
owner: mantenimiento
last_reviewed: 2026-08-01
---

# Plan de implementaciÃ³n del MÃ³dulo Clima para AgroGest VSM

## 1. PropÃ³sito del documento

Este documento define el plan para diseÃ±ar, evaluar e implementar una primera versiÃ³n del **MÃ³dulo Clima de AgroGest VSM**, orientado inicialmente al cultivo de mango.

En esta primera etapa, el mÃ³dulo serÃ¡ independiente de la informaciÃ³n operativa de AgroGest VSM. No se relacionarÃ¡ todavÃ­a con parcelas, coordenadas, diagnÃ³sticos, visitas, etapas fenolÃ³gicas ni labores agronÃ³micas.

El objetivo inicial serÃ¡ recopilar, normalizar, almacenar y visualizar informaciÃ³n meteorolÃ³gica general que ayude a los responsables agrÃ­colas a comprender las condiciones climÃ¡ticas actuales, histÃ³ricas y pronosticadas del Peru, y que sirva como apoyo para la toma de decisiones.

La integraciÃ³n con parcelas, visitas de campo, diagnÃ³sticos y etapas fenolÃ³gicas se desarrollarÃ¡ en una segunda etapa, cuando el mÃ³dulo climÃ¡tico haya sido validado tÃ©cnica y funcionalmente.

---

## 2. Objetivo general

Implementar en AgroGest VSM un mÃ³dulo climÃ¡tico que concentre informaciÃ³n meteorolÃ³gica relevante para la producciÃ³n de mango, utilizando fuentes externas y estaciones meteorolÃ³gicas, y que permita visualizar condiciones actuales, pronÃ³sticos, histÃ³ricos, alertas y el estado de las fuentes de informaciÃ³n.

---

## 3. Objetivos especÃ­ficos

1. Integrar fuentes de informaciÃ³n meteorolÃ³gica confiables.
2. Normalizar las variables climÃ¡ticas y sus unidades.
3. Almacenar datos actuales, histÃ³ricos y pronosticados.
4. Presentar la informaciÃ³n mediante paneles, mapas y grÃ¡ficos.
5. Detectar eventos meteorolÃ³gicos que puedan requerir atenciÃ³n.
6. Mostrar claramente la fuente, fecha, tipo y nivel de confianza de cada dato.
7. Evaluar la utilidad del mÃ³dulo con usuarios de Valle San Miguel.
8. Preparar una arquitectura que permita integrar posteriormente la informaciÃ³n climÃ¡tica con AgroGest VSM.

---

## 4. Alcance de la primera etapa

### 4.1 Incluido

- Datos meteorolÃ³gicos generales de las zonas productoras de mango.
- Consulta de condiciones meteorolÃ³gicas actuales.
- PronÃ³stico horario y diario.
- Historial climÃ¡tico.
- VisualizaciÃ³n geogrÃ¡fica mediante Leaflet.
- Registro de estaciones meteorolÃ³gicas.
- IntegraciÃ³n con proveedores externos.
- Alertas meteorolÃ³gicas generales.
- Estado y disponibilidad de las fuentes de datos.
- ComparaciÃ³n bÃ¡sica entre fuentes.
- ExportaciÃ³n de informaciÃ³n para anÃ¡lisis.

### 4.2 No incluido

- AsociaciÃ³n de datos con parcelas especÃ­ficas.
- Uso de polÃ­gonos o coordenadas de parcelas.
- RelaciÃ³n con visitas agronÃ³micas.
- RelaciÃ³n con diagnÃ³sticos de campo.
- RelaciÃ³n con etapas fenolÃ³gicas.
- Recomendaciones automÃ¡ticas para una parcela.
- PredicciÃ³n de enfermedades.
- CÃ¡lculo automÃ¡tico de riego por parcela.
- Modelos de inteligencia artificial.
- AnÃ¡lisis de rendimiento o producciÃ³n.
- Recomendaciones de productos, dosis o aplicaciones.

---

## 5. Estructura funcional del mÃ³dulo

```text
MÃ³dulo Clima
â”œâ”€â”€ Resumen climÃ¡tico
â”œâ”€â”€ Mapa agroclimÃ¡tico
â”œâ”€â”€ PronÃ³stico
â”œâ”€â”€ Historial climÃ¡tico
â”œâ”€â”€ Estaciones meteorolÃ³gicas
â”œâ”€â”€ Alertas climÃ¡ticas
â””â”€â”€ Estado de fuentes de datos
```

---

# 6. Componentes del mÃ³dulo

## 6.1 Resumen climÃ¡tico

SerÃ¡ la pantalla principal del mÃ³dulo y mostrarÃ¡ una visiÃ³n rÃ¡pida de la situaciÃ³n meteorolÃ³gica.

### InformaciÃ³n principal

- Temperatura actual.
- Temperatura mÃ­nima y mÃ¡xima del dÃ­a.
- Humedad relativa.
- PrecipitaciÃ³n registrada.
- Probabilidad de lluvia.
- Velocidad y direcciÃ³n del viento.
- RÃ¡fagas mÃ¡ximas.
- RadiaciÃ³n solar.
- EvapotranspiraciÃ³n de referencia, cuando estÃ© disponible.
- PresiÃ³n atmosfÃ©rica.
- Nubosidad.
- Punto de rocÃ­o.
- Hora de salida y puesta del sol.
- Alertas activas.
- Ãšltima actualizaciÃ³n.
- Fuente del dato.

### Elementos visuales

- Tarjetas de indicadores.
- PronÃ³stico resumido de los prÃ³ximos siete dÃ­as.
- Alertas mÃ¡s importantes.
- ComparaciÃ³n entre condiciÃ³n actual y promedio histÃ³rico.
- Indicador de disponibilidad de las fuentes.

### Resultado esperado

El usuario debe comprender en menos de un minuto la situaciÃ³n climÃ¡tica general y detectar si existe algÃºn evento que requiera atenciÃ³n.

---

## 6.2 Mapa agroclimÃ¡tico

El mapa utilizarÃ¡ **Leaflet**, ya implementado en AgroGest VSM.

En esta primera etapa no mostrarÃ¡ parcelas. Su propÃ³sito serÃ¡ representar informaciÃ³n climÃ¡tica general por zonas, localidades, distritos, sectores de referencia o estaciones meteorolÃ³gicas.

### Capas iniciales

- Mapa base.
- Localidades o zonas productoras de mango.
- Estaciones meteorolÃ³gicas.
- Puntos climÃ¡ticos de consulta.
- Temperatura.
- PrecipitaciÃ³n.
- Humedad relativa.
- Viento.
- Nubosidad.
- Alertas climÃ¡ticas.

### Filtros

- Fecha y hora.
- Variable climÃ¡tica.
- Fuente de informaciÃ³n.
- Tipo de dato: observado, estimado, pronosticado o histÃ³rico.
- Periodo de anÃ¡lisis.

### Comportamiento

Al seleccionar una estaciÃ³n o punto climÃ¡tico se mostrarÃ¡:

- Nombre del punto.
- UbicaciÃ³n.
- Variables disponibles.
- Condiciones actuales.
- PronÃ³stico resumido.
- Fuente.
- Fecha de actualizaciÃ³n.
- Estado de disponibilidad.

---

## 6.3 PronÃ³stico

PermitirÃ¡ consultar las condiciones meteorolÃ³gicas futuras.

### Horizontes

- PronÃ³stico horario de 24 a 72 horas.
- PronÃ³stico diario de 7 a 15 dÃ­as.
- Tendencia extendida, Ãºnicamente como referencia cuando la fuente lo permita.

### Variables

- Temperatura.
- Humedad relativa.
- PrecipitaciÃ³n.
- Probabilidad de lluvia.
- Viento y rÃ¡fagas.
- Nubosidad.
- RadiaciÃ³n solar.
- EvapotranspiraciÃ³n de referencia.
- Punto de rocÃ­o.

### Visualizaciones

- GrÃ¡fico horario.
- GrÃ¡fico diario.
- Tabla detallada.
- ComparaciÃ³n entre proveedores.
- Indicador de confianza o incertidumbre.

### Regla de presentaciÃ³n

El sistema deberÃ¡ diferenciar claramente:

```text
Dato observado
Dato estimado
Dato pronosticado
Dato histÃ³rico
```

---

## 6.4 Historial climÃ¡tico

PermitirÃ¡ consultar el comportamiento climÃ¡tico anterior de una zona.

### Periodos de consulta

- Diario.
- Semanal.
- Mensual.
- Por campaÃ±a.
- Por aÃ±o.
- ComparaciÃ³n entre aÃ±os.

### InformaciÃ³n

- Temperatura mÃ­nima, mÃ¡xima y promedio.
- PrecipitaciÃ³n acumulada.
- NÃºmero de dÃ­as con lluvia.
- Humedad relativa promedio.
- Viento mÃ¡ximo.
- RadiaciÃ³n acumulada.
- EvapotranspiraciÃ³n acumulada.
- DÃ­as secos consecutivos.
- Eventos extremos.

### Comparaciones

- Periodo actual contra el periodo anterior.
- AÃ±o actual contra promedio histÃ³rico.
- Mes actual contra el mismo mes de aÃ±os anteriores.
- AnomalÃ­a de temperatura.
- AnomalÃ­a de precipitaciÃ³n.

### ExportaciÃ³n

- CSV.
- Excel, en una etapa posterior.
- PDF de resumen, en una etapa posterior.

---

## 6.5 Estaciones meteorolÃ³gicas

PermitirÃ¡ registrar y supervisar estaciones propias, oficiales o externas.

### Tipos de estaciÃ³n

- EstaciÃ³n de SENAMHI.
- EstaciÃ³n de terceros.
- EstaciÃ³n virtual basada en un proveedor meteorolÃ³gico.
- Punto de referencia meteorolÃ³gico.

### Datos de la estaciÃ³n

- Nombre.
- CÃ³digo.
- Tipo.
- Fuente.
- UbicaciÃ³n general.
- Latitud y longitud de la estaciÃ³n.
- Altitud.
- Estado.
- Fecha de instalaciÃ³n.
- Variables disponibles.
- Frecuencia de actualizaciÃ³n.
- Ãšltima comunicaciÃ³n.

### Funciones

- Registrar estaciÃ³n.
- Activar o desactivar.
- Consultar lecturas.
- Ver errores de comunicaciÃ³n.
- Ver variables disponibles.
- Configurar frecuencia de actualizaciÃ³n.
- Importar datos mediante CSV.
- Integrar mediante API.
- Preparar futura integraciÃ³n con MQTT.

---

## 6.6 Alertas climÃ¡ticas

En la primera etapa, las alertas serÃ¡n exclusivamente meteorolÃ³gicas y no agronÃ³micas.

### Tipos iniciales

- Temperatura mÃ¡xima elevada.
- Temperatura mÃ­nima baja.
- Probabilidad alta de lluvia.
- PrecipitaciÃ³n intensa.
- Viento fuerte.
- RÃ¡fagas fuertes.
- Humedad relativa elevada durante varias horas.
- RadiaciÃ³n elevada.
- EvapotranspiraciÃ³n elevada.
- Periodo seco prolongado.
- Fuente meteorolÃ³gica sin actualizaciÃ³n.
- Diferencia significativa entre proveedores.

### Severidad

```text
INFORMATIVA
PRECAUCIÃ“N
ALTA
CRÃTICA
```

### InformaciÃ³n de una alerta

- Tipo.
- Severidad.
- Zona afectada.
- Inicio estimado.
- Fin estimado.
- Variable que la generÃ³.
- Valor observado o pronosticado.
- Umbral configurado.
- Fuente.
- Fecha de generaciÃ³n.
- Estado: activa, atendida, vencida o descartada.

### RestricciÃ³n

Las alertas no deberÃ¡n indicar automÃ¡ticamente una labor agrÃ­cola. Solo comunicarÃ¡n la condiciÃ³n meteorolÃ³gica detectada.

Ejemplo:

> Se pronostica una probabilidad de lluvia superior al 70 % durante las prÃ³ximas 24 horas en la zona de Tambogrande.

---

## 6.7 Estado de fuentes de datos

PermitirÃ¡ supervisar la salud de las integraciones climÃ¡ticas.

### InformaciÃ³n

- Nombre del proveedor.
- Tipo de fuente.
- Estado actual.
- Ãšltima consulta exitosa.
- Ãšltimo error.
- Tiempo promedio de respuesta.
- Cantidad de errores.
- Variables disponibles.
- Frecuencia de sincronizaciÃ³n.
- Cobertura temporal.
- Cobertura geogrÃ¡fica.

### Estados

```text
OPERATIVA
DEGRADADA
NO DISPONIBLE
EN MANTENIMIENTO
SIN CONFIGURAR
```

### Objetivo

Evitar que el usuario visualice informaciÃ³n desactualizada sin saberlo.

---

# 7. Fuentes de datos propuestas y aprobadas

## 7.1 Open-Meteo

Uso principal:

- Condiciones actuales.
- PronÃ³stico horario.
- PronÃ³stico diario.
- Temperatura.
- Humedad.
- PrecipitaciÃ³n.
- Probabilidad de lluvia.
- Viento.
- RadiaciÃ³n.
- EvapotranspiraciÃ³n de referencia.

## 7.2 NASA POWER

Uso principal:

- InformaciÃ³n histÃ³rica.
- RadiaciÃ³n solar.
- Temperatura histÃ³rica.
- PrecipitaciÃ³n histÃ³rica.
- Comparaciones climÃ¡ticas.
- CreaciÃ³n de lÃ­neas base.

## 7.3 SENAMHI

Uso principal:

- Fuente oficial de referencia.
- InformaciÃ³n de estaciones disponibles.
- Boletines meteorolÃ³gicos y agroclimÃ¡ticos.
- ValidaciÃ³n regional.

La integraciÃ³n dependerÃ¡ de los mecanismos oficiales disponibles.

## 7.4 Fuentes complementarias futuras

- CHIRPS para precipitaciÃ³n histÃ³rica.
- ERA5-Land para reconstrucciones histÃ³ricas.
- METAR como respaldo regional.
- Copernicus para informaciÃ³n satelital en una fase posterior.

---

# 8. Variables meteorolÃ³gicas prioritarias para mango

Aunque el mÃ³dulo todavÃ­a no interpretarÃ¡ etapas fenolÃ³gicas ni parcelas, se priorizarÃ¡n variables que posteriormente puedan ser Ãºtiles para el cultivo de mango.

## Prioridad alta

- Temperatura actual.
- Temperatura mÃ­nima.
- Temperatura mÃ¡xima.
- Humedad relativa.
- PrecipitaciÃ³n.
- Probabilidad de lluvia.
- Velocidad del viento.
- RÃ¡fagas de viento.
- RadiaciÃ³n solar.
- EvapotranspiraciÃ³n de referencia.
- Punto de rocÃ­o.

## Prioridad media

- Nubosidad.
- PresiÃ³n atmosfÃ©rica.
- Horas de humedad elevada.
- DÃ­as secos consecutivos.
- PrecipitaciÃ³n acumulada.
- Diferencia tÃ©rmica entre dÃ­a y noche.

## Prioridad futura

- Humedad del suelo.
- Temperatura del suelo.
- Mojado foliar.
- Ãndices satelitales.
- DÃ©ficit de presiÃ³n de vapor.
- Balance hÃ­drico.

---

# 9. Arquitectura tÃ©cnica propuesta

## 9.1 Flujo general

```text
Fuentes meteorolÃ³gicas externas
            â†“
Adaptadores de integraciÃ³n
            â†“
NormalizaciÃ³n de datos
            â†“
ValidaciÃ³n y control de calidad
            â†“
PostgreSQL
            â†“
API interna de AgroGest VSM
            â†“
Frontend web + Leaflet
```

## 9.2 Backend

Mantener el stack actual de AgroGest VSM:

- NestJS.
- TypeScript.
- PostgreSQL.
- Trabajos programados.
- Registro estructurado de errores.

### MÃ³dulo funcional sugerido

```text
src/modules/clima
â”œâ”€â”€ aplicacion
â”‚   â”œâ”€â”€ casos-uso
â”‚   â”œâ”€â”€ dto
â”‚   â””â”€â”€ servicios
â”œâ”€â”€ dominio
â”‚   â”œâ”€â”€ entidades
â”‚   â”œâ”€â”€ repositorios
â”‚   â””â”€â”€ reglas
â”œâ”€â”€ infraestructura
â”‚   â”œâ”€â”€ proveedores
â”‚   â”‚   â”œâ”€â”€ open-meteo
â”‚   â”‚   â”œâ”€â”€ nasa-power
â”‚   â”‚   â”œâ”€â”€ senamhi
â”‚   â”‚   â””â”€â”€ estaciones
â”‚   â”œâ”€â”€ persistencia
â”‚   â””â”€â”€ trabajos
â””â”€â”€ presentacion
    â””â”€â”€ controladores
```

## 9.3 Frontend

- Next.js.
- TypeScript.
- Leaflet.
- TanStack Query.
- Recharts o ECharts para series climÃ¡ticas o la libreria que ya se este utilizando para graficos en caso de no usar ninguna recomendar la mejor para el caso.

## 9.4 Regla tÃ©cnica

El frontend no deberÃ¡ consumir directamente las APIs externas.

```text
Frontend
   â†“
API de AgroGest VSM
   â†“
Base de datos y cachÃ©
   â†“
Proveedores meteorolÃ³gicos
```

---

# 10. Modelo de datos preliminar

Se recomienda crear un esquema PostgreSQL independiente:

```sql
clima
```

## Tablas iniciales

```text
clima.fuentes_datos
clima.variables_climaticas
clima.unidades_medida
clima.zonas_climaticas
clima.puntos_climaticos
clima.estaciones_meteorologicas
clima.estaciones_variables
clima.observaciones
clima.pronosticos
clima.pronosticos_detalle
clima.alertas
clima.tipos_alerta
clima.umbrales_alerta
clima.ejecuciones_sincronizacion
clima.errores_integracion
clima.estado_fuentes
```

## InformaciÃ³n mÃ­nima de un dato climÃ¡tico

```text
fuente
zona o punto climÃ¡tico
variable
valor
unidad
fecha y hora del dato
fecha y hora de recepciÃ³n
tipo de dato
nivel de calidad
nivel de confianza
modelo meteorolÃ³gico, cuando corresponda
```

## Tipos de dato

```text
OBSERVADO
ESTIMADO
PRONOSTICADO
HISTÃ“RICO
CALCULADO
```

---

# 11. API interna preliminar

```http
GET /clima/resumen
GET /clima/pronostico
GET /clima/historico
GET /clima/mapa
GET /clima/zonas
GET /clima/puntos-climaticos
GET /clima/estaciones
GET /clima/estaciones/:id
GET /clima/alertas
GET /clima/fuentes
GET /clima/fuentes/estado
POST /clima/estaciones
POST /clima/estaciones/importar
POST /clima/alertas/:id/atender
```

Los parÃ¡metros deberÃ¡n permitir filtrar por:

- Zona.
- Fuente.
- Variable.
- Fecha inicial.
- Fecha final.
- Tipo de dato.

---

# 12. Frecuencia de actualizaciÃ³n

| InformaciÃ³n | Frecuencia propuesta |
|---|---:|
| Condiciones actuales | Cada 1 a 3 horas |
| PronÃ³stico horario | Cada 3 horas |
| PronÃ³stico diario | Cada 6 horas |
| Datos histÃ³ricos | Una vez al dÃ­a |
| Estado de fuentes | Cada 15 a 30 minutos |
| Estaciones propias | SegÃºn capacidad del dispositivo |
| Alertas | DespuÃ©s de cada sincronizaciÃ³n |

La frecuencia deberÃ¡ ser configurable por fuente.

---

# 13. Plan de ejecuciÃ³n

## Fase 1. DefiniciÃ³n funcional y tÃ©cnica

### DuraciÃ³n estimada

1 semana.

### Actividades

- Confirmar alcance del MVP.
- Definir zonas climÃ¡ticas iniciales.
- Definir variables prioritarias.
- Definir fuentes iniciales.
- Revisar arquitectura actual de AgroGest VSM.
- Elaborar especificaciÃ³n funcional.
- Elaborar modelo de datos preliminar.
- Definir criterios de calidad.

### Entregables

- Documento de alcance.
- CatÃ¡logo de variables.
- CatÃ¡logo de fuentes.
- DiseÃ±o tÃ©cnico preliminar.
- Modelo de datos inicial.

---

## Fase 2. Prueba de fuentes de informaciÃ³n

### DuraciÃ³n estimada

2 semanas.

### Actividades

- Crear prueba tÃ©cnica con Open-Meteo.
- Crear prueba tÃ©cnica con NASA POWER.
- Evaluar mecanismos disponibles de SENAMHI.
- Seleccionar de 3 a 5 zonas climÃ¡ticas de prueba.
- Consultar datos durante varios dÃ­as.
- Medir disponibilidad y tiempo de respuesta.
- Validar unidades y fechas.
- Comparar resultados entre fuentes.
- Registrar errores e inconsistencias.

### Indicadores

| Indicador | Meta inicial |
|---|---:|
| Consultas exitosas | â‰¥ 98 % |
| Registros completos | â‰¥ 95 % |
| Errores de normalizaciÃ³n | < 2 % |
| Tiempo promedio de respuesta | < 3 segundos |
| Datos con fuente identificada | 100 % |

### Entregables

- Informe de evaluaciÃ³n de proveedores.
- Matriz comparativa de fuentes.
- RecomendaciÃ³n de fuentes para el MVP.
- Dataset inicial de prueba.

---

## Fase 3. Backend climÃ¡tico

### DuraciÃ³n estimada

2 semanas.

### Actividades

- Crear esquema `clima`.
- Crear tablas iniciales.
- Implementar adaptador de Open-Meteo.
- Implementar adaptador de NASA POWER.
- Crear normalizador de variables.
- Crear trabajos programados.
- Crear control de errores y reintentos.
- Crear endpoints internos.
- Crear pruebas unitarias.
- Crear pruebas de integraciÃ³n.

### Criterios de aceptaciÃ³n

- Los datos se almacenan sin duplicados.
- Las unidades se normalizan correctamente.
- Los errores externos no detienen el mÃ³dulo.
- Cada dato conserva su fuente y fecha.
- El historial puede consultarse desde la API interna.

---

## Fase 4. Interfaz del mÃ³dulo

### DuraciÃ³n estimada

2 semanas.

### Actividades

- Crear navegaciÃ³n del mÃ³dulo Clima.
- Crear resumen climÃ¡tico.
- Crear mapa con Leaflet.
- Crear pantalla de pronÃ³stico.
- Crear pantalla de historial.
- Crear pantalla de estaciones.
- Crear pantalla de alertas.
- Crear pantalla de estado de fuentes.
- Incorporar filtros.
- Incorporar grÃ¡ficos.
- Validar comportamiento responsive.

### Criterios de aceptaciÃ³n

- El usuario puede consultar las condiciones actuales.
- El usuario puede revisar el pronÃ³stico.
- El usuario puede consultar el historial.
- El usuario puede identificar la fuente del dato.
- El usuario puede identificar informaciÃ³n desactualizada.
- El usuario puede localizar estaciones y zonas en Leaflet.

---

## Fase 5. Alertas y control de calidad

### DuraciÃ³n estimada

1 semana.

### Actividades

- Definir umbrales meteorolÃ³gicos iniciales.
- Crear motor de alertas bÃ¡sico.
- Registrar alertas.
- Mostrar severidad.
- Evitar alertas repetidas.
- Implementar expiraciÃ³n.
- Detectar fuentes desactualizadas.
- Detectar valores fuera de rango.

### Criterios de aceptaciÃ³n

- Las alertas muestran su origen.
- Los umbrales son configurables.
- No se generan alertas duplicadas innecesariamente.
- Las alertas vencidas se cierran correctamente.
- El mÃ³dulo no presenta una recomendaciÃ³n agrÃ­cola automÃ¡tica.

---

## Fase 6. EvaluaciÃ³n con usuarios

### DuraciÃ³n estimada

1 semana.

### Participantes sugeridos

- AgrÃ³nomos.
- Jefe de campo.
- Personal administrativo que consulte informaciÃ³n climÃ¡tica.
- Responsable tÃ©cnico del sistema.

### Tareas de evaluaciÃ³n

1. Consultar las condiciones actuales.
2. Revisar si existe probabilidad de lluvia.
3. Consultar el viento de las prÃ³ximas horas.
4. Revisar el comportamiento de la Ãºltima semana.
5. Comparar dos zonas climÃ¡ticas.
6. Ubicar una estaciÃ³n en el mapa.
7. Revisar una alerta.
8. Identificar la fuente y fecha del dato.

### Indicadores

| Indicador | Meta |
|---|---:|
| Tareas completadas | â‰¥ 85 % |
| ComprensiÃ³n del resumen | â‰¥ 80 % |
| ComprensiÃ³n del pronÃ³stico | â‰¥ 80 % |
| IdentificaciÃ³n de la fuente | â‰¥ 90 % |
| Utilidad percibida | â‰¥ 4 de 5 |
| Errores de navegaciÃ³n | < 10 % |

### Preguntas de validaciÃ³n

- Â¿La informaciÃ³n es fÃ¡cil de comprender?
- Â¿QuÃ© variable resulta mÃ¡s Ãºtil?
- Â¿QuÃ© informaciÃ³n falta?
- Â¿El pronÃ³stico ayuda a planificar actividades?
- Â¿Las alertas son claras?
- Â¿El mapa aporta valor?
- Â¿La informaciÃ³n se actualiza con suficiente frecuencia?

---

# 14. EvaluaciÃ³n final

## Dimensiones

| DimensiÃ³n | Peso |
|---|---:|
| Calidad de datos | 25 % |
| Utilidad para usuarios | 25 % |
| Viabilidad tÃ©cnica | 20 % |
| Usabilidad | 15 % |
| Disponibilidad de fuentes | 10 % |
| Costo operativo | 5 % |

## Resultado

```text
90 a 100: Viabilidad muy alta
75 a 89: Viable
60 a 74: Viable con ajustes
Menos de 60: No continuar todavÃ­a
```

## Criterios obligatorios

El mÃ³dulo no deberÃ¡ aprobarse si:

- No se puede identificar la fuente de los datos.
- Se presentan datos antiguos como actuales.
- Las fuentes fallan frecuentemente.
- El historial presenta pÃ©rdidas o duplicados.
- Las unidades no estÃ¡n normalizadas.
- Los usuarios no comprenden el tipo de dato.
- El sistema confunde observaciones con pronÃ³sticos.

---

# 15. Requisitos no funcionales

## Disponibilidad

- El mÃ³dulo debe seguir mostrando el Ãºltimo dato vÃ¡lido cuando una fuente falle.
- Debe indicar claramente que la informaciÃ³n no estÃ¡ actualizada.

## Rendimiento

- El resumen deberÃ¡ cargar en menos de 3 segundos en condiciones normales.
- El mapa deberÃ¡ cargar progresivamente las capas.

## Trazabilidad

- Cada dato debe conservar proveedor, fecha, unidad y tipo.
- Cada sincronizaciÃ³n debe quedar registrada.

## Seguridad

- Las credenciales de proveedores deberÃ¡n almacenarse en variables de entorno.
- Las APIs externas no serÃ¡n consumidas directamente por el frontend.

## Mantenibilidad

- Cada proveedor deberÃ¡ implementarse mediante un adaptador independiente.
- Agregar o retirar una fuente no deberÃ¡ alterar el frontend.

## Observabilidad

- Logs estructurados.
- Registro de errores.
- MÃ©tricas de sincronizaciÃ³n.
- Alertas por fuente caÃ­da.

---

# 16. Riesgos y mitigaciones

| Riesgo | MitigaciÃ³n |
|---|---|
| Diferencias entre proveedores | Mostrar fuente y comparar datos |
| API externa no disponible | CachÃ©, reintentos y Ãºltimo dato vÃ¡lido |
| InformaciÃ³n con baja resoluciÃ³n | Comunicar cobertura y confianza |
| Datos desactualizados | Mostrar fecha y estado de fuente |
| Exceso de llamadas | Trabajos programados y cachÃ© |
| ConfusiÃ³n entre datos observados y pronosticados | Etiquetas obligatorias |
| Alertas excesivas | Umbrales configurables y deduplicaciÃ³n |
| Dependencia de una sola fuente | DiseÃ±ar mÃºltiples adaptadores |
| InterpretaciÃ³n agronÃ³mica prematura | Mantener la primera etapa solo meteorolÃ³gica |

---

# 17. Entregables del MVP

1. EspecificaciÃ³n funcional del mÃ³dulo.
2. DiseÃ±o tÃ©cnico.
3. Modelo de datos climÃ¡tico.
4. IntegraciÃ³n con Open-Meteo.
5. IntegraciÃ³n con NASA POWER.
6. EvaluaciÃ³n de SENAMHI.
7. Trabajos programados de sincronizaciÃ³n.
8. API interna de clima.
9. Resumen climÃ¡tico.
10. Mapa agroclimÃ¡tico en Leaflet.
11. Pantalla de pronÃ³stico.
12. Pantalla de historial.
13. GestiÃ³n de estaciones meteorolÃ³gicas.
14. Alertas meteorolÃ³gicas.
15. Estado de fuentes.
16. Pruebas tÃ©cnicas.
17. EvaluaciÃ³n con usuarios.
18. Informe final de viabilidad.

---

# 18. DuraciÃ³n total estimada

| Fase | DuraciÃ³n |
|---|---:|
| DefiniciÃ³n funcional y tÃ©cnica | 1 semana |
| Prueba de fuentes | 2 semanas |
| Backend climÃ¡tico | 2 semanas |
| Interfaz del mÃ³dulo | 2 semanas |
| Alertas y calidad | 1 semana |
| EvaluaciÃ³n con usuarios | 1 semana |
| **Total estimado** | **9 semanas** |

La duraciÃ³n puede reducirse si inicialmente se implementa Ãºnicamente Open-Meteo y se deja NASA POWER para una iteraciÃ³n posterior.

---

# 19. Segunda etapa futura

Una vez validado el mÃ³dulo climÃ¡tico, se podrÃ¡ iniciar una segunda etapa para relacionar la informaciÃ³n con AgroGest VSM.

```text
Datos climÃ¡ticos validados
        +
Parcelas y coordenadas
        +
Visitas agronÃ³micas
        +
Etapas fenolÃ³gicas
        +
DiagnÃ³sticos
        â†“
Evaluaciones agroclimÃ¡ticas
        â†“
Alertas contextualizadas
        â†“
Apoyo avanzado para la toma de decisiones
```

La segunda etapa deberÃ¡ desarrollarse como una ampliaciÃ³n del mÃ³dulo, no como parte del MVP climÃ¡tico inicial.

---

# 20. DecisiÃ³n recomendada

Se recomienda iniciar con un MVP independiente y limitado a:

```text
Resumen climÃ¡tico
Mapa agroclimÃ¡tico con Leaflet
PronÃ³stico
Historial
Estaciones meteorolÃ³gicas
Alertas meteorolÃ³gicas
Estado de fuentes
```

Las primeras integraciones recomendadas son:

```text
Open-Meteo para condiciones actuales y pronÃ³sticos
NASA POWER para informaciÃ³n histÃ³rica
SENAMHI como referencia oficial
Estaciones propias cuando estÃ©n disponibles
```

El criterio principal de Ã©xito serÃ¡ comprobar que la informaciÃ³n es estable, comprensible, trazable y Ãºtil para los usuarios antes de cruzarla con los datos operativos de AgroGest VSM.
