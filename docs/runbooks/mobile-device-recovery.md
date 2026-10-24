---
title: Recuperación de actividad mobile en un dispositivo nuevo
status: active
owner: soporte
last_reviewed: 2026-10-24
---

# Recuperación de actividad mobile en un dispositivo nuevo

## Qué se recupera

La persona inicia sesión con su cuenta en el dispositivo nuevo. El asistente
inicial o la opción **Recuperar últimos 30 días** en Inicio descarga las visitas
técnicas y comerciales, pagos y registros de cosecha que ya estén sincronizados
con la API y atribuidos a esa cuenta. El periodo usa días calendario de
`America/Lima`.

No se recuperan cambios que nunca salieron del dispositivo anterior, fotos,
evidencias ni actividad fuera del periodo. La recuperación no modifica los
registros del servidor.

## Pasos de recuperación

1. Instalar una versión de mobile que incluya la Spec 120 e iniciar sesión con
   la cuenta de trabajo correcta.
2. Conectar el dispositivo a Internet y mantener el modo de conectividad en
   automático u online.
3. En Inicio, pulsar **Recuperar últimos 30 días**.
4. Esperar a que termine la descarga de catálogos y páginas. Se puede cerrar la
   app: el cursor se guarda por cuenta y la siguiente ejecución reanuda el lote.
5. Confirmar el resumen mostrado en pantalla. Los datos quedan disponibles en
   SQLite para el trabajo offline.

## Si la recuperación no termina

- Si no hay conexión, volver a intentarlo al recuperar Internet.
- Si faltan catálogos o una relación, usar **Refrescar catálogos** desde Inicio
  y volver a pulsar **Recuperar últimos 30 días**.
- Un error conserva la página sin confirmar y no avanza el cursor.
- Si se inició sesión con otra cuenta, cerrar sesión y usar la cuenta correcta;
  el progreso y las filas locales están aislados por usuario.
- Si la app indica que terminó, volver a pulsar la opción inicia una nueva
  revisión del periodo móvil actual; filas ya importadas se omiten.

## Soporte

La API autoriza por el JWT: visitas por agrónomo y transacciones por creador.
No pedir ni registrar tokens, documentos, payloads completos ni ubicaciones para
diagnosticar el problema. Registrar únicamente cuenta interna, fecha, versión
de app, tipo de error y si quedó un cursor reintentable. Si falta actividad,
verificar primero que se haya sincronizado desde el dispositivo anterior y que
su fecha esté dentro de la ventana de 30 días.
