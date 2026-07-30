---
title: Scores técnicos independientes por módulo para mango
status: implementing
numero: 019
area: visitas, sanidad, nutrición, riego, labores, scoring, api, mobile, sync, database, admin-web
created: 2026-07-28
approved_by: usuario, 2026-07-28; ampliación climática aprobada, 2026-07-30
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
- Integración API/PostgreSQL para autorización, agregados sin N+1 y migraciones.
- SQLite/outbox para alta offline, reintento, reinicio, padre fallido y conflicto.
- UI mobile/web para separación visual de indicadores y revisión de receta.
- Adaptador meteorológico para cobertura, duplicados, retrasos y errores.

## Impacto documental

- [ ] Actualizar arquitectura de sync, modelo de dominio, riesgos y runbooks.
- [ ] Actualizar esta spec a `implemented` y completar `implemented_in`.
