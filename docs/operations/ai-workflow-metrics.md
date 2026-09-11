---
title: Métricas del flujo asistido por IA
status: active
owner: mantenimiento
last_reviewed: 2026-09-10
---

# Métricas del flujo asistido por IA

## Propósito

Medir si exploración y revisión independiente reducen defectos sin introducir
un coste de coordinación mayor que su beneficio.

## Campos mínimos

| Campo                    | Medición                                                  |
| ------------------------ | --------------------------------------------------------- |
| tarea                    | Spec, issue o descripción breve                           |
| criticidad               | baja, media, alta o crítica                               |
| tiempo de implementación | minutos desde inicio hasta validación inicial             |
| tiempo de revisión       | segundos de ejecución del reviewer                        |
| consumo                  | tokens de entrada, salida y coste reportado por proveedor |
| hallazgos                | total por severidad                                       |
| aceptados                | hallazgos que produjeron corrección                       |
| rechazados               | falsos positivos o fuera de alcance                       |
| defectos posteriores     | defectos atribuibles detectados después del cierre        |

## Registro

| Fecha      | Tarea                    | Criticidad | Implementación          | Revisión                                         | Consumo                                                                                | Hallazgos                         | Aceptados | Rechazados | Defectos posteriores |
| ---------- | ------------------------ | ---------- | ----------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------- | --------------------------------- | --------- | ---------- | -------------------- |
| 2026-06-25 | Spec 002                 | baja       | no medido               | no aplicada                                      | no medido                                                                              | no medido                         | no medido | no medido  | 0 al cierre          |
| 2026-06-25 | Spec 003 / piloto Fase 2 | crítica    | no medido retrospectivo | 174.49 s                                         | 67 839 entrada; 6 183 salida; 5 631 razonamiento; 772 480 cache-read; USD 0.042588385  | 1 alta, 2 medias, 2 bajas         | 2         | 3          | 0 al cierre          |
| 2026-08-18 | Spec 053                 | alta       | no medido               | intento mayor a 120 s, sin veredicto recuperable | no reportado                                                                           | no evaluado                       | 0         | 0          | 0 al cierre          |
| 2026-08-19 | Spec 060                 | media      | no medido               | 220.81 s                                         | 43 514 entrada; 2 439 salida; 11 252 razonamiento; 451 328 cache-read; USD 0.032475824 | 1 baja; 1 observacion             | 2         | 0          | 0 al cierre          |
| 2026-08-21 | Spec 064                 | media      | no medido               | 343.95 s; veredicto correcto                     | no reportado por fallo de exportacion posterior al veredicto                           | 3 bajas; 1 informativa            | 0         | 2          | 0 al cierre          |
| 2026-09-01 | Spec 071                 | alta       | no medido               | 192.88 s iniciales; 93.84 s cierre F1            | no reportado por incompatibilidad del exportador local                                 | 1 media; 1 baja; cierre aprobado  | 1         | 0          | 0 al cierre          |
| 2026-09-04 | Spec 072                 | alta       | no medido               | 361.89 s; aprobado con corrección documental     | 15 472 entrada; 465 salida; 65 razonamiento; 18 432 cache-read; USD 0.007258236        | 1 media; 3 bajas                  | 1         | 3          | 0 al cierre          |
| 2026-09-04 | Spec 073                 | alta       | no medido               | 432.45 s; aprobado con corrección baja           | no reportado por fallo local `EEXIST` del exportador                                   | 1 baja; 6 observaciones           | 1         | 5          | 0 al cierre          |
| 2026-09-07 | Spec 078                 | alta       | no medido               | 287 s iniciales; 33 s cierre; aprobado           | no reportado por incompatibilidad del wrapper con agente subagent                      | 2 bajas; 2 observaciones          | 4         | 0          | 0 al cierre          |
| 2026-09-07 | Spec 079                 | media      | no medido               | 173.18 s iniciales; 34.26 s cierre; aprobado     | 67 008 entrada; 1 509 salida; 14 562 razonamiento; 9 728 cache-read; USD 0.043165514   | 3 bajas; cierre sin hallazgos     | 1         | 2          | 0 al cierre          |
| 2026-09-10 | Spec 081                 | alta       | no medido               | cinco revisiones directas; cierre aprobado       | no reportado; wrapper incompatible con agente subagent                                 | 2 medias; 7 bajas; 2 informativas | 4         | 7          | 0 al cierre          |

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
