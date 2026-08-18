# Handoff: Spec 051 - tutorial visual guiado del paso 1

## Identificacion

- fecha: 2026-08-18
- responsable: Codex
- spec o issue: Spec 051
- alcance del diff: retiro completo de la asistencia por voz del paso 1 y
  sustitucion por tutorial visual local; validaciones obligatorias de plantas,
  area y fecha de siembra; retiro de Hora de fin de Datos basicos
- criticidad: media

## Objetivo

Ayudar al tecnico a completar los campos pendientes del paso 1 en condiciones
de ruido mediante una guia visual manual, sin permisos, red ni dependencias
nativas, y mantener Hora de fin exclusivamente en el cierre de Receta.

## Cambios realizados

- `step-one-tutorial.ts` y pruebas: orden, pendientes, validez, dependencias,
  historial y restauracion segura de borradores anteriores.
- `guided-form-tutorial.tsx`: atenuacion, campo interactivo resaltado, flecha,
  instrucciones, desplazamiento, Anterior, Siguiente, Omitir y Salir.
- `new-visita-campo-screen.tsx`: boton Tutorial, referencias a campos,
  obligatoriedad de plantas/area/siembra y retiro de Hora de fin.
- `form-scroll-view.tsx`: referencia aditiva al `ScrollView` para enfocar el
  campo activo.
- `visitas-campo.repository.test.ts`: regresion que prueba que una actualizacion
  de Datos basicos no sobrescribe `end_visit_time`.
- `app.json`, `package.json`, `pnpm-lock.yaml`, assets/modelos y archivos de voz:
  retiro del permiso, plugin, librerias, modelos y codigo de reconocimiento/TTS.
- spec 051, spec 048 cancelada, indices y arquitectura mobile actualizados.

## Contratos y datos afectados

- API: sin cambios.
- PostgreSQL/PostGIS: sin cambios.
- SQLite/outbox: sin cambios; Datos basicos envia una actualizacion parcial sin
  `endVisitTime`.
- autenticacion y permisos: se elimina `RECORD_AUDIO`; no se agregan permisos.
- variables y despliegue: sin variables ni dependencias nuevas; el retiro de
  codigo nativo requiere un nuevo APK/AAB para reflejarse en una instalacion.

## Validaciones ejecutadas

| Comando o prueba | Resultado |
| ---------------- | --------- |
| `pnpm --filter @agrogest/mobile lint` | correcto |
| `pnpm --filter @agrogest/mobile typecheck` | correcto |
| `pnpm test` | 197 archivos, 1510 pruebas correctas |
| `pnpm docs:check` | 110 documentos correctos |
| `git diff --check` | correcto; solo avisos CRLF del entorno |

## Riesgos conocidos y exclusiones

- Falta smoke visual en dispositivo Android real con teclado, listas largas,
  calendario y anchos de una y dos columnas.
- No se publica APK, AAB ni OTA en este cambio.
- El arbol contiene cambios ajenos de las specs 049 y 050; deben ignorarse y
  revisarse unicamente los archivos enumerados en este handoff y la spec 051.

## Instrucciones al reviewer

- revisar unicamente el alcance descrito;
- no modificar archivos;
- citar archivo y linea;
- priorizar defectos reproducibles;
- devolver veredicto y hallazgos por severidad.

## Resultado de la revision independiente

- intento del runbook: el agente configurado fue rechazado como subagente y la
  sesion termino al solicitar un comando no permitido, sin veredicto;
- segundo intento acotado: sesion `ses_fea49f696ffe6QZfqMJrnsHr8k`, modelo
  `deepseek-v4-pro`, solo lectura, sin archivos modificados; agoto cinco minutos
  durante la inspeccion y no emitio texto final ni hallazgos clasificables;
- limitacion pendiente: repetir la revision cuando el runner pueda invocar
  `deepseek-reviewer` como agente primario o completar la sesion sin timeout.
