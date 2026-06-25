---
title: Métricas del flujo asistido por IA
status: active
owner: mantenimiento
last_reviewed: 2026-06-25
---

# Métricas del flujo asistido por IA

## Propósito

Medir si exploración y revisión independiente reducen defectos sin introducir
un coste de coordinación mayor que su beneficio.

## Campos mínimos

| Campo | Medición |
| ----- | -------- |
| tarea | Spec, issue o descripción breve |
| criticidad | baja, media, alta o crítica |
| tiempo de implementación | minutos desde inicio hasta validación inicial |
| tiempo de revisión | segundos de ejecución del reviewer |
| consumo | tokens de entrada, salida y coste reportado por proveedor |
| hallazgos | total por severidad |
| aceptados | hallazgos que produjeron corrección |
| rechazados | falsos positivos o fuera de alcance |
| defectos posteriores | defectos atribuibles detectados después del cierre |

## Registro

| Fecha | Tarea | Criticidad | Implementación | Revisión | Consumo | Hallazgos | Aceptados | Rechazados | Defectos posteriores |
| ----- | ----- | ---------- | -------------- | -------- | ------- | --------- | --------- | ---------- | -------------------- |
| 2026-06-25 | Spec 002 | baja | no medido | no aplicada | no medido | no medido | no medido | no medido | 0 al cierre |
| 2026-06-25 | Spec 003 / piloto Fase 2 | crítica | no medido retrospectivo | 174.49 s | 67 839 entrada; 6 183 salida; 5 631 razonamiento; 772 480 cache-read; USD 0.042588385 | 1 alta, 2 medias, 2 bajas | 2 | 3 | 0 al cierre |

## Resultado del piloto crítico

- H1 rechazado: los conteos se filtran por códigos Piura (`20%`), por lo que
  agregar otra región no altera el resultado. Además, arrancar con una migración
  fallida sería menos seguro que el comportamiento fail-fast actual.
- H2 aceptado como deuda baja: bootstrap y migraciones pueden conservar índices
  equivalentes con nombres diferentes. Se registró como R-015.
- H3 rechazado: la lógica de consolidación mobile ya existía antes de la
  Spec 003; el cambio solo aisló repositorios para recuperar la suite.
- H4 aceptado como observación: los scripts son deliberadamente PowerShell para
  el entorno Windows actual. El requisito quedó explícito en `README.md`.
- H5 rechazado: la finalidad y versión fijada de OpenGem ya están documentadas
  en `docs/runbooks/ai-tooling.md`.

Resultado: dos observaciones útiles, tres falsos positivos o elementos fuera de
alcance y ningún defecto bloqueante confirmado.

## Interpretación

No se crean nuevos agentes hasta disponer de al menos tres tareas medidas. Un
reviewer se mantiene si encuentra defectos válidos, mejora pruebas o reduce
riesgo de manera repetible. El volumen de texto producido no cuenta como valor.
