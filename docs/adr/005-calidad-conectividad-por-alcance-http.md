---
title: Calidad de conectividad por alcance HTTP e historial reciente
status: accepted
date: 2026-08-19
decision_makers:
  - usuario
  - mantenimiento
supersedes: ADR-004
superseded_by:
---

# ADR-005: Calidad de conectividad por alcance HTTP e historial reciente

## Contexto

ADR-004 permitia que la lentitud del servidor, un HTTP 5xx o una cancelacion de
la app contaminaran la calidad de red. En produccion esto puede activar
`offline_auto` aunque el dispositivo tenga una conexion util. La ventana
persistida tampoco tenia vigencia maxima y podia describir una red anterior.

## Decision

El modo efectivo se basara en alcance de transporte. Cualquier respuesta HTTP
confirma conectividad, aunque sea lenta o tenga estado 5xx. Solo un timeout del
cliente o fallo de transporte sera una observacion mala; una cancelacion
iniciada por la aplicacion no participara en la metrica.

La ventana persistida se considerara vigente durante cinco minutos desde su
ultima actualizacion. Una ventana mas antigua no condicionara el modo actual y
se reemplazara con las siguientes observaciones. NetInfo conserva la autoridad
para la desconexion fisica inmediata y `/health` para la recuperacion.

## Alternativas consideradas

- conservar toda respuesta lenta como fallo de conexion;
- degradar ante errores 5xx del servidor;
- descartar toda persistencia del backoff al iniciar la aplicacion;
- ejecutar `/health` antes de cada operacion remota.

## Consecuencias

### Positivas

- disminuyen los falsos cambios a offline por carga del servidor;
- cancelaciones y ciclos abortados no contaminan el diagnostico;
- un estado historico no describe indefinidamente la red actual;
- se preserva el fallback ante timeouts y fallos reales de transporte.

### Negativas y riesgos

- una API alcanzable pero degradada puede seguir mostrando online;
- un error 5xx se presenta como error remoto y no como ausencia de Internet;
- la validacion final en dispositivo sigue siendo necesaria por diferencias de
  NetInfo y `fetch` entre plataformas.

## Verificacion

Pruebas unitarias de clasificacion HTTP, cancelacion, timeout, respuesta lenta y
caducidad; pruebas de sync offline-online; validacion manual en Android.
