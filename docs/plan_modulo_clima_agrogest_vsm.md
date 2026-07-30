# Plan de implementación del Módulo Clima para AgroGest VSM

## 1. Propósito del documento

Este documento define el plan para diseñar, evaluar e implementar una primera versión del **Módulo Clima de AgroGest VSM**, orientado inicialmente al cultivo de mango.

En esta primera etapa, el módulo será independiente de la información operativa de AgroGest VSM. No se relacionará todavía con parcelas, coordenadas, diagnósticos, visitas, etapas fenológicas ni labores agronómicas.

El objetivo inicial será recopilar, normalizar, almacenar y visualizar información meteorológica general que ayude a los responsables agrícolas a comprender las condiciones climáticas actuales, históricas y pronosticadas del Peru, y que sirva como apoyo para la toma de decisiones.

La integración con parcelas, visitas de campo, diagnósticos y etapas fenológicas se desarrollará en una segunda etapa, cuando el módulo climático haya sido validado técnica y funcionalmente.

---

## 2. Objetivo general

Implementar en AgroGest VSM un módulo climático que concentre información meteorológica relevante para la producción de mango, utilizando fuentes externas y estaciones meteorológicas, y que permita visualizar condiciones actuales, pronósticos, históricos, alertas y el estado de las fuentes de información.

---

## 3. Objetivos específicos

1. Integrar fuentes de información meteorológica confiables.
2. Normalizar las variables climáticas y sus unidades.
3. Almacenar datos actuales, históricos y pronosticados.
4. Presentar la información mediante paneles, mapas y gráficos.
5. Detectar eventos meteorológicos que puedan requerir atención.
6. Mostrar claramente la fuente, fecha, tipo y nivel de confianza de cada dato.
7. Evaluar la utilidad del módulo con usuarios de Valle San Miguel.
8. Preparar una arquitectura que permita integrar posteriormente la información climática con AgroGest VSM.

---

## 4. Alcance de la primera etapa

### 4.1 Incluido

- Datos meteorológicos generales de las zonas productoras de mango.
- Consulta de condiciones meteorológicas actuales.
- Pronóstico horario y diario.
- Historial climático.
- Visualización geográfica mediante Leaflet.
- Registro de estaciones meteorológicas.
- Integración con proveedores externos.
- Alertas meteorológicas generales.
- Estado y disponibilidad de las fuentes de datos.
- Comparación básica entre fuentes.
- Exportación de información para análisis.

### 4.2 No incluido

- Asociación de datos con parcelas específicas.
- Uso de polígonos o coordenadas de parcelas.
- Relación con visitas agronómicas.
- Relación con diagnósticos de campo.
- Relación con etapas fenológicas.
- Recomendaciones automáticas para una parcela.
- Predicción de enfermedades.
- Cálculo automático de riego por parcela.
- Modelos de inteligencia artificial.
- Análisis de rendimiento o producción.
- Recomendaciones de productos, dosis o aplicaciones.

---

## 5. Estructura funcional del módulo

```text
Módulo Clima
├── Resumen climático
├── Mapa agroclimático
├── Pronóstico
├── Historial climático
├── Estaciones meteorológicas
├── Alertas climáticas
└── Estado de fuentes de datos
```

---

# 6. Componentes del módulo

## 6.1 Resumen climático

Será la pantalla principal del módulo y mostrará una visión rápida de la situación meteorológica.

### Información principal

- Temperatura actual.
- Temperatura mínima y máxima del día.
- Humedad relativa.
- Precipitación registrada.
- Probabilidad de lluvia.
- Velocidad y dirección del viento.
- Ráfagas máximas.
- Radiación solar.
- Evapotranspiración de referencia, cuando esté disponible.
- Presión atmosférica.
- Nubosidad.
- Punto de rocío.
- Hora de salida y puesta del sol.
- Alertas activas.
- Última actualización.
- Fuente del dato.

### Elementos visuales

- Tarjetas de indicadores.
- Pronóstico resumido de los próximos siete días.
- Alertas más importantes.
- Comparación entre condición actual y promedio histórico.
- Indicador de disponibilidad de las fuentes.

### Resultado esperado

El usuario debe comprender en menos de un minuto la situación climática general y detectar si existe algún evento que requiera atención.

---

## 6.2 Mapa agroclimático

El mapa utilizará **Leaflet**, ya implementado en AgroGest VSM.

En esta primera etapa no mostrará parcelas. Su propósito será representar información climática general por zonas, localidades, distritos, sectores de referencia o estaciones meteorológicas.

### Capas iniciales

- Mapa base.
- Localidades o zonas productoras de mango.
- Estaciones meteorológicas.
- Puntos climáticos de consulta.
- Temperatura.
- Precipitación.
- Humedad relativa.
- Viento.
- Nubosidad.
- Alertas climáticas.

### Filtros

- Fecha y hora.
- Variable climática.
- Fuente de información.
- Tipo de dato: observado, estimado, pronosticado o histórico.
- Periodo de análisis.

### Comportamiento

Al seleccionar una estación o punto climático se mostrará:

- Nombre del punto.
- Ubicación.
- Variables disponibles.
- Condiciones actuales.
- Pronóstico resumido.
- Fuente.
- Fecha de actualización.
- Estado de disponibilidad.

---

## 6.3 Pronóstico

Permitirá consultar las condiciones meteorológicas futuras.

### Horizontes

- Pronóstico horario de 24 a 72 horas.
- Pronóstico diario de 7 a 15 días.
- Tendencia extendida, únicamente como referencia cuando la fuente lo permita.

### Variables

- Temperatura.
- Humedad relativa.
- Precipitación.
- Probabilidad de lluvia.
- Viento y ráfagas.
- Nubosidad.
- Radiación solar.
- Evapotranspiración de referencia.
- Punto de rocío.

### Visualizaciones

- Gráfico horario.
- Gráfico diario.
- Tabla detallada.
- Comparación entre proveedores.
- Indicador de confianza o incertidumbre.

### Regla de presentación

El sistema deberá diferenciar claramente:

```text
Dato observado
Dato estimado
Dato pronosticado
Dato histórico
```

---

## 6.4 Historial climático

Permitirá consultar el comportamiento climático anterior de una zona.

### Periodos de consulta

- Diario.
- Semanal.
- Mensual.
- Por campaña.
- Por año.
- Comparación entre años.

### Información

- Temperatura mínima, máxima y promedio.
- Precipitación acumulada.
- Número de días con lluvia.
- Humedad relativa promedio.
- Viento máximo.
- Radiación acumulada.
- Evapotranspiración acumulada.
- Días secos consecutivos.
- Eventos extremos.

### Comparaciones

- Periodo actual contra el periodo anterior.
- Año actual contra promedio histórico.
- Mes actual contra el mismo mes de años anteriores.
- Anomalía de temperatura.
- Anomalía de precipitación.

### Exportación

- CSV.
- Excel, en una etapa posterior.
- PDF de resumen, en una etapa posterior.

---

## 6.5 Estaciones meteorológicas

Permitirá registrar y supervisar estaciones propias, oficiales o externas.

### Tipos de estación

- Estación de SENAMHI.
- Estación de terceros.
- Estación virtual basada en un proveedor meteorológico.
- Punto de referencia meteorológico.

### Datos de la estación

- Nombre.
- Código.
- Tipo.
- Fuente.
- Ubicación general.
- Latitud y longitud de la estación.
- Altitud.
- Estado.
- Fecha de instalación.
- Variables disponibles.
- Frecuencia de actualización.
- Última comunicación.

### Funciones

- Registrar estación.
- Activar o desactivar.
- Consultar lecturas.
- Ver errores de comunicación.
- Ver variables disponibles.
- Configurar frecuencia de actualización.
- Importar datos mediante CSV.
- Integrar mediante API.
- Preparar futura integración con MQTT.

---

## 6.6 Alertas climáticas

En la primera etapa, las alertas serán exclusivamente meteorológicas y no agronómicas.

### Tipos iniciales

- Temperatura máxima elevada.
- Temperatura mínima baja.
- Probabilidad alta de lluvia.
- Precipitación intensa.
- Viento fuerte.
- Ráfagas fuertes.
- Humedad relativa elevada durante varias horas.
- Radiación elevada.
- Evapotranspiración elevada.
- Periodo seco prolongado.
- Fuente meteorológica sin actualización.
- Diferencia significativa entre proveedores.

### Severidad

```text
INFORMATIVA
PRECAUCIÓN
ALTA
CRÍTICA
```

### Información de una alerta

- Tipo.
- Severidad.
- Zona afectada.
- Inicio estimado.
- Fin estimado.
- Variable que la generó.
- Valor observado o pronosticado.
- Umbral configurado.
- Fuente.
- Fecha de generación.
- Estado: activa, atendida, vencida o descartada.

### Restricción

Las alertas no deberán indicar automáticamente una labor agrícola. Solo comunicarán la condición meteorológica detectada.

Ejemplo:

> Se pronostica una probabilidad de lluvia superior al 70 % durante las próximas 24 horas en la zona de Tambogrande.

---

## 6.7 Estado de fuentes de datos

Permitirá supervisar la salud de las integraciones climáticas.

### Información

- Nombre del proveedor.
- Tipo de fuente.
- Estado actual.
- Última consulta exitosa.
- Último error.
- Tiempo promedio de respuesta.
- Cantidad de errores.
- Variables disponibles.
- Frecuencia de sincronización.
- Cobertura temporal.
- Cobertura geográfica.

### Estados

```text
OPERATIVA
DEGRADADA
NO DISPONIBLE
EN MANTENIMIENTO
SIN CONFIGURAR
```

### Objetivo

Evitar que el usuario visualice información desactualizada sin saberlo.

---

# 7. Fuentes de datos propuestas y aprobadas

## 7.1 Open-Meteo

Uso principal:

- Condiciones actuales.
- Pronóstico horario.
- Pronóstico diario.
- Temperatura.
- Humedad.
- Precipitación.
- Probabilidad de lluvia.
- Viento.
- Radiación.
- Evapotranspiración de referencia.

## 7.2 NASA POWER

Uso principal:

- Información histórica.
- Radiación solar.
- Temperatura histórica.
- Precipitación histórica.
- Comparaciones climáticas.
- Creación de líneas base.

## 7.3 SENAMHI

Uso principal:

- Fuente oficial de referencia.
- Información de estaciones disponibles.
- Boletines meteorológicos y agroclimáticos.
- Validación regional.

La integración dependerá de los mecanismos oficiales disponibles.

## 7.4 Fuentes complementarias futuras

- CHIRPS para precipitación histórica.
- ERA5-Land para reconstrucciones históricas.
- METAR como respaldo regional.
- Copernicus para información satelital en una fase posterior.

---

# 8. Variables meteorológicas prioritarias para mango

Aunque el módulo todavía no interpretará etapas fenológicas ni parcelas, se priorizarán variables que posteriormente puedan ser útiles para el cultivo de mango.

## Prioridad alta

- Temperatura actual.
- Temperatura mínima.
- Temperatura máxima.
- Humedad relativa.
- Precipitación.
- Probabilidad de lluvia.
- Velocidad del viento.
- Ráfagas de viento.
- Radiación solar.
- Evapotranspiración de referencia.
- Punto de rocío.

## Prioridad media

- Nubosidad.
- Presión atmosférica.
- Horas de humedad elevada.
- Días secos consecutivos.
- Precipitación acumulada.
- Diferencia térmica entre día y noche.

## Prioridad futura

- Humedad del suelo.
- Temperatura del suelo.
- Mojado foliar.
- Índices satelitales.
- Déficit de presión de vapor.
- Balance hídrico.

---

# 9. Arquitectura técnica propuesta

## 9.1 Flujo general

```text
Fuentes meteorológicas externas
            ↓
Adaptadores de integración
            ↓
Normalización de datos
            ↓
Validación y control de calidad
            ↓
PostgreSQL
            ↓
API interna de AgroGest VSM
            ↓
Frontend web + Leaflet
```

## 9.2 Backend

Mantener el stack actual de AgroGest VSM:

- NestJS.
- TypeScript.
- PostgreSQL.
- Trabajos programados.
- Registro estructurado de errores.

### Módulo funcional sugerido

```text
src/modules/clima
├── aplicacion
│   ├── casos-uso
│   ├── dto
│   └── servicios
├── dominio
│   ├── entidades
│   ├── repositorios
│   └── reglas
├── infraestructura
│   ├── proveedores
│   │   ├── open-meteo
│   │   ├── nasa-power
│   │   ├── senamhi
│   │   └── estaciones
│   ├── persistencia
│   └── trabajos
└── presentacion
    └── controladores
```

## 9.3 Frontend

- Next.js.
- TypeScript.
- Leaflet.
- TanStack Query.
- Recharts o ECharts para series climáticas o la libreria que ya se este utilizando para graficos en caso de no usar ninguna recomendar la mejor para el caso.

## 9.4 Regla técnica

El frontend no deberá consumir directamente las APIs externas.

```text
Frontend
   ↓
API de AgroGest VSM
   ↓
Base de datos y caché
   ↓
Proveedores meteorológicos
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

## Información mínima de un dato climático

```text
fuente
zona o punto climático
variable
valor
unidad
fecha y hora del dato
fecha y hora de recepción
tipo de dato
nivel de calidad
nivel de confianza
modelo meteorológico, cuando corresponda
```

## Tipos de dato

```text
OBSERVADO
ESTIMADO
PRONOSTICADO
HISTÓRICO
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

Los parámetros deberán permitir filtrar por:

- Zona.
- Fuente.
- Variable.
- Fecha inicial.
- Fecha final.
- Tipo de dato.

---

# 12. Frecuencia de actualización

| Información | Frecuencia propuesta |
|---|---:|
| Condiciones actuales | Cada 1 a 3 horas |
| Pronóstico horario | Cada 3 horas |
| Pronóstico diario | Cada 6 horas |
| Datos históricos | Una vez al día |
| Estado de fuentes | Cada 15 a 30 minutos |
| Estaciones propias | Según capacidad del dispositivo |
| Alertas | Después de cada sincronización |

La frecuencia deberá ser configurable por fuente.

---

# 13. Plan de ejecución

## Fase 1. Definición funcional y técnica

### Duración estimada

1 semana.

### Actividades

- Confirmar alcance del MVP.
- Definir zonas climáticas iniciales.
- Definir variables prioritarias.
- Definir fuentes iniciales.
- Revisar arquitectura actual de AgroGest VSM.
- Elaborar especificación funcional.
- Elaborar modelo de datos preliminar.
- Definir criterios de calidad.

### Entregables

- Documento de alcance.
- Catálogo de variables.
- Catálogo de fuentes.
- Diseño técnico preliminar.
- Modelo de datos inicial.

---

## Fase 2. Prueba de fuentes de información

### Duración estimada

2 semanas.

### Actividades

- Crear prueba técnica con Open-Meteo.
- Crear prueba técnica con NASA POWER.
- Evaluar mecanismos disponibles de SENAMHI.
- Seleccionar de 3 a 5 zonas climáticas de prueba.
- Consultar datos durante varios días.
- Medir disponibilidad y tiempo de respuesta.
- Validar unidades y fechas.
- Comparar resultados entre fuentes.
- Registrar errores e inconsistencias.

### Indicadores

| Indicador | Meta inicial |
|---|---:|
| Consultas exitosas | ≥ 98 % |
| Registros completos | ≥ 95 % |
| Errores de normalización | < 2 % |
| Tiempo promedio de respuesta | < 3 segundos |
| Datos con fuente identificada | 100 % |

### Entregables

- Informe de evaluación de proveedores.
- Matriz comparativa de fuentes.
- Recomendación de fuentes para el MVP.
- Dataset inicial de prueba.

---

## Fase 3. Backend climático

### Duración estimada

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
- Crear pruebas de integración.

### Criterios de aceptación

- Los datos se almacenan sin duplicados.
- Las unidades se normalizan correctamente.
- Los errores externos no detienen el módulo.
- Cada dato conserva su fuente y fecha.
- El historial puede consultarse desde la API interna.

---

## Fase 4. Interfaz del módulo

### Duración estimada

2 semanas.

### Actividades

- Crear navegación del módulo Clima.
- Crear resumen climático.
- Crear mapa con Leaflet.
- Crear pantalla de pronóstico.
- Crear pantalla de historial.
- Crear pantalla de estaciones.
- Crear pantalla de alertas.
- Crear pantalla de estado de fuentes.
- Incorporar filtros.
- Incorporar gráficos.
- Validar comportamiento responsive.

### Criterios de aceptación

- El usuario puede consultar las condiciones actuales.
- El usuario puede revisar el pronóstico.
- El usuario puede consultar el historial.
- El usuario puede identificar la fuente del dato.
- El usuario puede identificar información desactualizada.
- El usuario puede localizar estaciones y zonas en Leaflet.

---

## Fase 5. Alertas y control de calidad

### Duración estimada

1 semana.

### Actividades

- Definir umbrales meteorológicos iniciales.
- Crear motor de alertas básico.
- Registrar alertas.
- Mostrar severidad.
- Evitar alertas repetidas.
- Implementar expiración.
- Detectar fuentes desactualizadas.
- Detectar valores fuera de rango.

### Criterios de aceptación

- Las alertas muestran su origen.
- Los umbrales son configurables.
- No se generan alertas duplicadas innecesariamente.
- Las alertas vencidas se cierran correctamente.
- El módulo no presenta una recomendación agrícola automática.

---

## Fase 6. Evaluación con usuarios

### Duración estimada

1 semana.

### Participantes sugeridos

- Agrónomos.
- Jefe de campo.
- Personal administrativo que consulte información climática.
- Responsable técnico del sistema.

### Tareas de evaluación

1. Consultar las condiciones actuales.
2. Revisar si existe probabilidad de lluvia.
3. Consultar el viento de las próximas horas.
4. Revisar el comportamiento de la última semana.
5. Comparar dos zonas climáticas.
6. Ubicar una estación en el mapa.
7. Revisar una alerta.
8. Identificar la fuente y fecha del dato.

### Indicadores

| Indicador | Meta |
|---|---:|
| Tareas completadas | ≥ 85 % |
| Comprensión del resumen | ≥ 80 % |
| Comprensión del pronóstico | ≥ 80 % |
| Identificación de la fuente | ≥ 90 % |
| Utilidad percibida | ≥ 4 de 5 |
| Errores de navegación | < 10 % |

### Preguntas de validación

- ¿La información es fácil de comprender?
- ¿Qué variable resulta más útil?
- ¿Qué información falta?
- ¿El pronóstico ayuda a planificar actividades?
- ¿Las alertas son claras?
- ¿El mapa aporta valor?
- ¿La información se actualiza con suficiente frecuencia?

---

# 14. Evaluación final

## Dimensiones

| Dimensión | Peso |
|---|---:|
| Calidad de datos | 25 % |
| Utilidad para usuarios | 25 % |
| Viabilidad técnica | 20 % |
| Usabilidad | 15 % |
| Disponibilidad de fuentes | 10 % |
| Costo operativo | 5 % |

## Resultado

```text
90 a 100: Viabilidad muy alta
75 a 89: Viable
60 a 74: Viable con ajustes
Menos de 60: No continuar todavía
```

## Criterios obligatorios

El módulo no deberá aprobarse si:

- No se puede identificar la fuente de los datos.
- Se presentan datos antiguos como actuales.
- Las fuentes fallan frecuentemente.
- El historial presenta pérdidas o duplicados.
- Las unidades no están normalizadas.
- Los usuarios no comprenden el tipo de dato.
- El sistema confunde observaciones con pronósticos.

---

# 15. Requisitos no funcionales

## Disponibilidad

- El módulo debe seguir mostrando el último dato válido cuando una fuente falle.
- Debe indicar claramente que la información no está actualizada.

## Rendimiento

- El resumen deberá cargar en menos de 3 segundos en condiciones normales.
- El mapa deberá cargar progresivamente las capas.

## Trazabilidad

- Cada dato debe conservar proveedor, fecha, unidad y tipo.
- Cada sincronización debe quedar registrada.

## Seguridad

- Las credenciales de proveedores deberán almacenarse en variables de entorno.
- Las APIs externas no serán consumidas directamente por el frontend.

## Mantenibilidad

- Cada proveedor deberá implementarse mediante un adaptador independiente.
- Agregar o retirar una fuente no deberá alterar el frontend.

## Observabilidad

- Logs estructurados.
- Registro de errores.
- Métricas de sincronización.
- Alertas por fuente caída.

---

# 16. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Diferencias entre proveedores | Mostrar fuente y comparar datos |
| API externa no disponible | Caché, reintentos y último dato válido |
| Información con baja resolución | Comunicar cobertura y confianza |
| Datos desactualizados | Mostrar fecha y estado de fuente |
| Exceso de llamadas | Trabajos programados y caché |
| Confusión entre datos observados y pronosticados | Etiquetas obligatorias |
| Alertas excesivas | Umbrales configurables y deduplicación |
| Dependencia de una sola fuente | Diseñar múltiples adaptadores |
| Interpretación agronómica prematura | Mantener la primera etapa solo meteorológica |

---

# 17. Entregables del MVP

1. Especificación funcional del módulo.
2. Diseño técnico.
3. Modelo de datos climático.
4. Integración con Open-Meteo.
5. Integración con NASA POWER.
6. Evaluación de SENAMHI.
7. Trabajos programados de sincronización.
8. API interna de clima.
9. Resumen climático.
10. Mapa agroclimático en Leaflet.
11. Pantalla de pronóstico.
12. Pantalla de historial.
13. Gestión de estaciones meteorológicas.
14. Alertas meteorológicas.
15. Estado de fuentes.
16. Pruebas técnicas.
17. Evaluación con usuarios.
18. Informe final de viabilidad.

---

# 18. Duración total estimada

| Fase | Duración |
|---|---:|
| Definición funcional y técnica | 1 semana |
| Prueba de fuentes | 2 semanas |
| Backend climático | 2 semanas |
| Interfaz del módulo | 2 semanas |
| Alertas y calidad | 1 semana |
| Evaluación con usuarios | 1 semana |
| **Total estimado** | **9 semanas** |

La duración puede reducirse si inicialmente se implementa únicamente Open-Meteo y se deja NASA POWER para una iteración posterior.

---

# 19. Segunda etapa futura

Una vez validado el módulo climático, se podrá iniciar una segunda etapa para relacionar la información con AgroGest VSM.

```text
Datos climáticos validados
        +
Parcelas y coordenadas
        +
Visitas agronómicas
        +
Etapas fenológicas
        +
Diagnósticos
        ↓
Evaluaciones agroclimáticas
        ↓
Alertas contextualizadas
        ↓
Apoyo avanzado para la toma de decisiones
```

La segunda etapa deberá desarrollarse como una ampliación del módulo, no como parte del MVP climático inicial.

---

# 20. Decisión recomendada

Se recomienda iniciar con un MVP independiente y limitado a:

```text
Resumen climático
Mapa agroclimático con Leaflet
Pronóstico
Historial
Estaciones meteorológicas
Alertas meteorológicas
Estado de fuentes
```

Las primeras integraciones recomendadas son:

```text
Open-Meteo para condiciones actuales y pronósticos
NASA POWER para información histórica
SENAMHI como referencia oficial
Estaciones propias cuando estén disponibles
```

El criterio principal de éxito será comprobar que la información es estable, comprensible, trazable y útil para los usuarios antes de cruzarla con los datos operativos de AgroGest VSM.
