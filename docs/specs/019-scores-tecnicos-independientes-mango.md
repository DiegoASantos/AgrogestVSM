---
title: Scores técnicos independientes por módulo para mango
status: implementing
numero: 019
area: visitas, sanidad, nutrición, riego, labores, scoring, api, mobile, sync, database, admin-web
created: 2026-07-28
approved_by: usuario, 2026-07-28; ampliación climática aprobada, 2026-07-30; consolidación macro-score de Plagas aprobada, 2026-07-31; consolidación macro-score de Enfermedades aprobada, 2026-07-31; consolidación macro-score de Nutrición aprobada, 2026-07-31
implemented_in:
---

# Spec 019: Scores técnicos independientes por módulo para mango

## Contexto

AgroGest ya cuenta con calificaciones manuales de cumplimiento de recomendaciones
previas. Esta spec agrega indicadores técnicos independientes, derivados de la
observación actual de la visita, sin modificar el score de cumplimiento ni sus
históricos. Inicialmente aplica a todo mango, sin distinguir variedad.

## Alcance

### Incluido

- Scores técnicos de Plagas, Enfermedades, Nutrición, Riego y Labores.
- Scores por visita/parcela, promedios por productor y campaña, y score técnico
  global web con pesos de etapa fenológica existentes.
- Visualización de scores de módulo en mobile y de detalle/agregados en web.
- Acciones automáticas desde un catálogo técnico aprobado y revisión nueva de
  receta cuando la receta previa ya fue emitida.
- Alerta climática de Enfermedades mediante estación meteorológica por parcela.
- Tablero de Inicio con condición, variables de campo y pronóstico de siete días
  por parcela. La fuente inicial es Open-Meteo con selección `best_match` y
  caché local SQLite de solo lectura para consulta offline.
- Adaptador futuro para estación METOS/iMETOS Disease por parcela, con prioridad
  sobre el modelo cuando existan lecturas válidas y autorizadas.

### Excluido

- Reemplazar, recalcular o mezclar el score de cumplimiento existente.
- Productos, dosis, períodos de carencia o recomendaciones químicas generadas
  automáticamente.
- Activar alertas predictivas de enfermedades o riego a partir de Open-Meteo.
- Integrar METOS/iMETOS Disease sin contrato, credenciales, estación asociada y
  validación operativa autorizadas.

## Requisitos

- RF-001: Cada score técnico es autoritativo en API y se deriva de los datos de
  captura; mobile puede previsualizarlo, pero no enviarlo como fuente de verdad.
- RF-002: Plagas conserva el cálculo y la separación definidos por la spec 018;
  debe completar selección explícita, validación, agregados eficientes y sync
  idempotente pendiente de esa spec.
- RF-003: Enfermedades, Nutrición, Riego y Labores usan las matrices y valores
  ya validados en mobile, centralizados y versionados en backend. Toda regla
  nueva o ambigua requiere aprobación del agrónomo de la empresa antes de
  activarse.
- RF-004: El score global técnico usa la matriz de pesos fenológicos vigente y
  se renormaliza sobre módulos disponibles. Las respuestas exponen módulos
  incluidos, faltantes y cobertura; nunca se confunde con cumplimiento.
- RF-005: Los agregados por productor y campaña promedian únicamente valores
  técnicos elegibles del indicador solicitado y devuelven `null` sin datos.
- RF-006: Una alerta moderada o crítica crea acciones desde catálogo técnico
  aprobado. Una receta emitida no se modifica: se crea una revisión nueva y
  trazable.
- RF-007: La alerta climática solo usa lecturas recientes y trazables de una
  estación asociada a la parcela; con cobertura insuficiente devuelve estado no
  disponible y no altera el score observado.
- RF-008: Inicio muestra clima estimado de Open-Meteo únicamente para parcelas
  autorizadas. La API deriva la ubicación desde el punto de referencia o un
  punto interior de la geometría; mobile nunca entrega coordenadas como entrada.
- RF-009: La estimación expone temperatura, humedad relativa, precipitación,
  viento, lluvia acumulada 24 h, ET0, humedad de suelo modelada 3–9 cm y siete
  días de pronóstico. Debe identificarse como modelo, no como sensor de campo.
- RF-010: Mobile conserva el último resultado por parcela en SQLite, sin outbox
  ni sincronización. Al no haber conexión muestra el valor guardado y señala si
  está vencido; nunca lo usa para disparar alertas.

## Enmienda de consolidación macro-score de Plagas 2026-07-31

- RF-011: El score técnico de Plagas consolida siempre Trips, Queresas, Ácaros,
  Cochinilla, Chinche y Mosca de la fruta, aunque la etapa fenológica solo haya
  mostrado un subconjunto para captura.
- RF-012: Una plaga no registrada en la visita aporta incidencia 0, severidad 0
  y nota 3 sin crear persistencia artificial. Las registradas conservan la
  fórmula individual y la excepción geográfica de Mosca de la fruta de la spec 018.
- RF-013: `ScorePlagas = MIN(nota Trips, nota Queresas, nota Ácaros, nota
Cochinilla, nota Chinche, nota Mosca de la fruta)`.
- RF-014: Web muestra el score del módulo con énfasis visual, su fórmula macro y
  las seis notas con sus fórmulas. Mobile muestra en el detalle de visita solo
  el resultado del módulo Plagas, el estado y el mensaje del semáforo.
- RF-015: Para Plagas, 2 o 3 es verde, 1 es amarillo y 0 es rojo. Los estados y
  mensajes operativos son autoritativos en la respuesta de API para evitar
  divergencias entre clientes.

## Enmienda de consolidación macro-score de Enfermedades 2026-07-31

- RF-016: La captura de una enfermedad exige un porcentaje entero de árboles
  enfermos entre 0 y 100. Mobile lo presenta antes de incidencia y la API deriva
  la incidencia sin aceptar la selección del usuario: 0% es grado 0; 1–5% grado
  1; 6–20% grado 2; y 21–100% grado 3. Durante el despliegue compatible, la API
  solo acepta porcentaje ausente de un cliente anterior cuando este envía el
  nivel grado 0 válido para la enfermedad y etapa, y lo normaliza a 0%.
- RF-017: La incidencia expone la descripción de cada grado igual que severidad.
  Con grado 0 el porcentaje es 0, la severidad y los órganos afectados quedan
  vacíos. Los órganos afectados se conservan para mapeo interno y no participan
  en ninguna fórmula de score.
- RF-018: La captura sigue filtrada por etapa fenológica, pero el score consolida
  siempre Oidium, Antracnosis, Muerte regresiva y Alternaria. Una enfermedad no
  registrada aporta incidencia 0, severidad 0, porcentaje 0 y nota 3, sin crear
  filas artificiales.
- RF-019: Cada nota usa `NotaEnfermedad = 3 - MAX(gradoIncidencia,
gradoSeveridad)` y el módulo usa `ScoreEnfermedades = MIN(nota Oidium, nota
Antracnosis, nota Muerte regresiva, nota Alternaria)`.
- RF-020: Web enfatiza el macro-score, su fórmula, las cuatro notas y sus
  fórmulas. Mobile muestra debajo de Plagas únicamente el resultado del módulo,
  estado y mensaje del semáforo, sin fórmulas individuales.
- RF-021: Para Enfermedades, 2 o 3 es verde (`Lote Sano / Control Eficiente`), 1
  es amarillo (`Alerta / Umbral de Acción`) y 0 es rojo (`Crisis Sanitaria`). Los
  estados y mensajes operativos son autoritativos en API.
- RF-022: El módulo Enfermedades solo se consolida cuando finaliza su paso. En
  offline, la finalización espera que sus observaciones pendientes se confirmen
  primero en la API para mantener el orden padre-hijos y evitar un score parcial.

## Enmienda de consolidación macro-score de Nutrición 2026-07-31

- RF-023: Toda deficiencia nutricional evaluada exige un porcentaje entero de
  árboles afectados entre 0 y 100. La incidencia se deriva en API y mobile:
  0% es grado 0; 1–5% grado 1; 6–20% grado 2; y 21–100% grado 3.
- RF-024: La nota individual usa `NotaNutricion = 3 - gradoIncidencia`. Los
  detalles de severidad y órganos afectados pueden conservarse como información
  agronómica, pero no intervienen en el score técnico.
- RF-025: El módulo consolida siempre Nitrógeno, Magnesio, Potasio, Hierro, Zinc
  y Boro. Una deficiencia no registrada aporta incidencia 0, porcentaje 0 y
  nota 3, sin crear filas artificiales.
- RF-026: `ScoreNutricion = MIN(nota Nitrógeno, nota Magnesio, nota Potasio,
nota Hierro, nota Zinc, nota Boro)`.
- RF-027: Web enfatiza el macro-score, su fórmula y las seis notas individuales
  con sus fórmulas. Mobile muestra debajo de Enfermedades únicamente el puntaje,
  estado y mensaje del semáforo.
- RF-028: Para Nutrición, 2 o 3 es verde (`Fundo Nutrito / Salud Fuerte`), 1 es
  amarillo (`Alerta de Bloqueo Nutricional`) y 0 es rojo (`Deficiencia Crítica /
Riesgo de Rendimiento`). Los mensajes son autoritativos en API.
- RF-029: El score solo se publica al finalizar el paso 4. En offline, la
  finalización espera que las altas, cambios o borrados nutricionales pendientes
  o fallidos se confirmen primero en API.
- RF-030: Los seis nutrientes usan códigos estables y las evaluaciones nuevas
  guardan su identidad de catálogo. Los lectores mantienen compatibilidad con
  filas históricas identificadas por descripción durante la transición.

## Enmienda climática 2026-07-30

La spec 021 sustituye temporalmente el clima móvil por parcela: mientras no
exista geometría válida, Inicio usa clima territorial por distrito. La ruta de
parcela se conserva para una futura etapa georreferenciada.

## Contratos afectados

- PostgreSQL y SQLite para datos técnicos, versiones de regla, revisiones de
  receta y, tras autorización de proveedor, lecturas meteorológicas.
- API y OpenAPI: lecturas de scores por visita, productor y campaña; contratos
  de captura y catálogo con códigos/grados explícitos.
- Mobile: SQLite, outbox, handlers y pantallas de módulos; admin web: detalle,
  agregados técnicos y revisiones de receta.
- API: `GET /parcelas/:id/clima`, protegido por el mismo alcance de parcela;
  cache de servidor de corta duración y contrato de fuente explícita.

## Seguridad y datos

- Guards de visita, parcela, productor y receta aplican a cada endpoint.
- Solo roles autorizados administran matrices, acciones, estaciones y
  revisiones de receta.
- Las credenciales de estación se mantienen fuera del repositorio; no se
  registran en logs ni se aceptan lecturas climáticas manipulables desde mobile.
- La coordenada precisa de la parcela no se expone en la respuesta climática.

## Migración y rollback

1. Expandir PostgreSQL y SQLite con lectores compatibles, sin borrar pendientes
   de outbox ni datos históricos.
2. Desplegar API que tolere clientes anteriores y derive scores sin persistirlos
   como segunda fuente de verdad.
3. Publicar mobile y web compatibles; mantener las rutas de cumplimiento sin
   cambios.
4. El rollback deshabilita las nuevas exposiciones y conserva capturas,
   versiones y revisiones. SQLite usa migración correctiva hacia adelante.
5. La migración PostgreSQL asigna códigos estables a las cuatro enfermedades y
   aborta si no existe exactamente una fila del tipo esperado por código. La
   migración SQLite agrega el grado al catálogo y fuerza su recarga. El rollback
   conserva ambos datos aditivos para no romper clientes ya publicados.
6. Nutrición se expande con `codigo`/`nutriente_id` en PostgreSQL y
   `code`/`nutrient_id` en SQLite. El backfill conserva compatibilidad por nombre
   y el rollback operativo mantiene estas columnas aditivas para no romper
   clientes nuevos ni evaluaciones pendientes de sincronización.

## Criterios de aceptación

- [ ] CA-001: Cumplimiento y score técnico devuelven contratos distintos y los
      cambios técnicos no alteran ningún cálculo histórico de cumplimiento.
- [ ] CA-002: Cada módulo calcula el resultado, semáforo y acciones esperados
      a partir de sus capturas validadas.
- [ ] CA-003: El global renormaliza módulos disponibles e informa cobertura.
- [ ] CA-004: Mobile conserva padre-hijo, idempotencia, reintentos y pendientes
      en todos los cambios de captura.
- [ ] CA-005: Una receta emitida permanece inmutable y recibe una revisión nueva.
- [ ] CA-006: Datos climáticos incompletos, atrasados o no autorizados no activan
      la alerta predictiva.
- [x] CA-007: Inicio puede mostrar una estimación por parcela online y el último
      valor cacheado offline, claramente diferenciado de una estación METOS.

## Pruebas

- Unitarias para fórmulas, pesos, redondeo, semáforos, acciones y cobertura.
- Fronteras 0/1/5/6/20/21/100 del porcentaje, derivación autoritativa y
  descripciones de incidencia de Enfermedades.
- Fronteras 0/1/5/6/20/21/100, porcentaje obligatorio, universo fijo de seis
  deficiencias y semáforo del macro-score de Nutrición.
- Integración API/PostgreSQL para autorización, agregados sin N+1 y migraciones.
- SQLite/outbox para alta offline, reintento, reinicio, padre fallido y conflicto.
- UI mobile/web para separación visual de indicadores y revisión de receta.
- Adaptador meteorológico para cobertura, duplicados, retrasos y errores.

## Impacto documental

- [ ] Actualizar arquitectura de sync, modelo de dominio, riesgos y runbooks.
- [ ] Actualizar esta spec a `implemented` y completar `implemented_in`.
