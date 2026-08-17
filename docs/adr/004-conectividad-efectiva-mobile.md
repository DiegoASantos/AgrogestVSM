---
title: Conectividad efectiva y modo offline controlado en mobile
status: accepted
date: 2026-08-17
decision_makers:
  - usuario
  - mantenimiento
supersedes:
superseded_by:
---

# ADR-004: Conectividad efectiva y modo offline controlado en mobile

## Contexto

La presencia de Internet reportada por NetInfo no garantiza que una request sea
lo bastante rapida o confiable para el trabajo de campo. El backoff del sync
reduce reintentos, pero no expresa un modo efectivo compartido con clima,
catalogos, OTA y la interfaz.

## Decision

Mobile separa la conectividad fisica de la calidad observada y de la preferencia
del usuario. En automatico, dos resultados malos degradan la aplicacion a un
modo offline efectivo y tres resultados buenos la recuperan. El usuario puede
mantener offline manual por cuenta. Requests normales se bloquean antes de la
red; login y sondeos de recuperacion son excepciones explicitas.

`GET /health` se usa solo como sondeo espaciado durante recuperacion, nunca como
preflight de cada request o del outbox.

## Alternativas consideradas

- Confiar exclusivamente en NetInfo.
- Aplicar solamente backoff al sync sin cambiar el resto de consumidores.
- Ejecutar un test de velocidad o health antes de cada operacion.
- Permitir forzar online de forma persistente sobre una red inestable.

## Consecuencias

### Positivas

- Los flujos locales dejan de esperar innecesariamente una red degradada.
- El usuario entiende por que la app trabaja offline y conserva control manual.
- Outbox e idempotencia no cambian.

### Negativas y riesgos

- La calidad puede reflejar lentitud del servidor ademas de la red, aunque el
  fallback offline sigue siendo favorable para la experiencia.
- La recuperacion automatica puede tardar hasta tres sondeos; existe una accion
  manual para comprobarla antes.
- La preferencia persistente exige un recordatorio visible para evitar olvidos.

## Verificacion

Pruebas del gestor de calidad, bloqueo HTTP, persistencia por usuario,
recuperacion por health y flujo offline-online completo, mas validacion manual
con limitacion de red en Android.
