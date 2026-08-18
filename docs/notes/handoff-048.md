# Handoff: Spec 048 - evaluacion asistida por voz offline

## Identificacion

- fecha: 2026-08-17
- responsable: Codex
- spec o issue: Spec 048
- alcance del diff: asistente de voz local para todos los campos editables del
  paso 1 de visita, modelos Android, permiso, pruebas y documentacion
- criticidad: alta

## Objetivo

Permitir que usuarios mayores completen el paso 1 mediante preguntas y
respuestas habladas sin conectividad, confirmando cada dato y conservando el
formulario manual y su guardado SQLite/outbox existente.

## Cambios realizados

- `offline-voice-input.ts`: comandos, coincidencia de catalogos y parsers de
  numeros, fechas, horas y porcentajes.
- `offline-voice.service.ts`: captura PCM, STT Whisper Tiny INT8 y TTS Piper
  mediante Sherpa-ONNX, con limpieza al cancelar o pasar a segundo plano.
- `voice-visit-assistant-modal.tsx` y `new-visita-campo-screen.tsx`: dialogo de
  diez preguntas, confirmacion y aplicacion sobre el formulario existente.
- `with-offline-voice-models.js`, `app.json` y assets: empaquetado nativo,
  `RECORD_AUDIO` y version 0.2.0/versionCode 10.
- spec 048, arquitectura, seguridad, riesgos y runbook mobile actualizados.

## Contratos y datos afectados

- API: sin cambios.
- PostgreSQL/PostGIS: sin cambios.
- SQLite/outbox: sin cambios; la voz solo actualiza estado del formulario.
- autenticacion y permisos: nuevo permiso Android `RECORD_AUDIO`, solicitado al
  iniciar el asistente.
- variables y despliegue: sin variables; exige APK/AAB nuevo y no es OTA.

## Validaciones ejecutadas

| Comando o prueba | Resultado |
| ---------------- | --------- |
| typecheck mobile | correcto |
| lint mobile | correcto |
| parsers y flujo de visita | 10/10 |
| docs:check | 104 documentos correctos |
| Expo config | correcto |
| prebuild Android temporal | modelos, permiso y versiones correctos |
| Expo Doctor | 17/18; cuatro patches Expo preexistentes pendientes |

## Riesgos conocidos y exclusiones

- No se puede validar STT/TTS ni consumo real sin build y dispositivo Android.
- Faltan modo avion, latencia, diez recorridos, ruido y piloto de precision.
- Los modelos agregan 142,185,446 bytes antes del empaquetado.
- No se publica APK, AAB ni OTA en este cambio.
- Revisar tambien todos los archivos no rastreados listados por `git status`,
  ya que `git diff` no los muestra.

## Instrucciones al reviewer

- revisar unicamente el alcance descrito;
- no modificar archivos;
- citar archivo y linea;
- priorizar defectos reproducibles;
- devolver veredicto y hallazgos por severidad.
