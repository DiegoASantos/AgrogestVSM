---
title: Evaluacion asistida por voz completamente offline
status: implementing
numero: "048"
area: mobile, accesibilidad, voz, offline, visitas
created: 2026-08-17
approved_by: usuario, 2026-08-17
implemented_in:
---

# Spec 048: Evaluacion asistida por voz completamente offline

## Contexto

Parte de los usuarios de mobile son adultos mayores y registran visitas en
campos agricolas sin conectividad confiable. El paso 1 combina selectores,
numeros, fechas, horas, porcentaje y observacion libre. La entrada manual debe
seguir disponible, pero se necesita una guia hablada que no dependa de Google,
de la API ni de otro servicio remoto.

## Alcance

### Incluido

- Asistente hablado para todos los campos editables del paso 1.
- Reconocimiento y sintesis de voz mediante modelos incluidos en Android.
- Confirmacion de cada respuesta antes de modificar el formulario.
- Compatibilidad objetivo con Android 10 o superior y 4 GB de RAM.
- Formulario manual como contingencia y revision antes de continuar.
- Pruebas de parsers, dialogo, modo avion, permisos y recursos nativos.

### Excluido

- Pasos 2 a 6 de la visita.
- Procesamiento cloud, almacenamiento de grabaciones o historial de voz.
- Cambios de API, PostgreSQL, SQLite, outbox o contratos compartidos.
- Publicacion OTA, APK o despliegue productivo en este cambio.

## Requisitos

- RF-001: El asistente debe funcionar con el dispositivo en modo avion.
- RF-002: Debe leer las opciones locales de cada selector y aceptar nombre o
  codigo sin depender de tildes o mayusculas.
- RF-003: Debe interpretar numeros, decimales, porcentajes, fechas y horas en
  espanol y rechazar valores invalidos.
- RF-004: Cada valor reconocido debe leerse y confirmarse con `si` antes de
  aplicarlo; `no` repite el campo.
- RF-005: Debe aceptar `repetir`, `corregir`, `conservar`, `omitir` en campos
  opcionales y `cancelar`.
- RF-006: Al terminar debe mostrar el formulario completo sin guardarlo ni
  navegar automaticamente.
- RNF-001: Las muestras PCM viven solo en memoria y se liberan al terminar,
  cancelar o enviar la app a segundo plano.
- RNF-002: El modulo de voz no realiza solicitudes de red ni registra audio o
  transcripciones.
- RNF-003: Los motores nativos se destruyen entre escucha y lectura para
  limitar memoria.
- RNF-004: El formulario y guardado existentes conservan su comportamiento.

## Contratos afectados

- Mobile nativo: permiso Android `RECORD_AUDIO`, runtime Sherpa-ONNX y modelos
  Whisper/Piper empaquetados como assets.
- Formulario: interfaces internas para aplicar valores reconocidos.
- API, SQLite, outbox y tipos compartidos: sin cambios.

## Seguridad y datos

El permiso se solicita al iniciar el asistente. El audio no sale del proceso,
no se persiste y no aparece en logs. Los errores mostrados son genericos y no
incluyen la transcripcion. El usuario puede denegar el permiso y continuar con
el formulario manual.

## Migracion y rollback

No existe migracion de datos. Se incrementan version mobile, runtime y
`versionCode`; el APK debe instalarse encima del anterior conservando package,
firma, SQLite y outbox. Rollback mediante reinstalacion in-place del ultimo APK
estable compatible; nunca desinstalar para resolver una falla.

## Criterios de aceptacion

- [ ] CA-001: Un recorrido completo funciona en modo avion.
- [ ] CA-002: Selectores y numeros alcanzan al menos 95 % de reconocimiento en
      el piloto de campo.
- [ ] CA-003: La observacion libre alcanza al menos 80 % de palabras correctas.
- [ ] CA-004: La respuesta final aparece en menos de tres segundos en el equipo
      minimo soportado.
- [ ] CA-005: Diez recorridos consecutivos no cierran ni bloquean la app.
- [ ] CA-006: Cancelar, denegar permiso o enviar a segundo plano libera audio y
      conserva el formulario.
- [ ] CA-007: El guardado crea la misma visita y outbox que la entrada manual.

## Pruebas

- unitarias de comandos, catalogos, numeros, fechas, horas y porcentaje;
- unitarias de transiciones confirmar, repetir, omitir y cancelar;
- build Android nativo y smoke de modelos incluidos;
- modo avion, permiso denegado, silencio, ruido, interrupcion y segundo plano;
- actualizacion in-place con visita y outbox pendientes;
- piloto en campo sobre el dispositivo minimo soportado.

## Impacto documental

- [x] Arquitectura mobile offline.
- [x] Dominio: sin cambios.
- [x] Runbook de deploy mobile.
- [x] ADR: no corresponde.
- [x] Registro de riesgos y release nativo.

## Estado de implementacion

El asistente, parsers, modelos, permiso y plugin nativo estan implementados. La
spec permanece en `implementing` hasta completar el build Android y los
criterios que requieren dispositivo fisico, modo avion y piloto de campo. No se
ha publicado APK ni OTA.
