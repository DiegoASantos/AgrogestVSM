---
title: Respuesta a incidentes y soporte
status: active
owner: mantenimiento
last_reviewed: 2026-06-26
---

# Respuesta a incidentes y soporte

## Canales

La empresa debe definir un canal único para reportar incidencias. Cada reporte
debe convertirse en un registro trazable, no quedar únicamente en mensajería.

Datos mínimos:

- fecha y usuario;
- entorno y versión;
- módulo afectado;
- pasos para reproducir;
- resultado esperado y observado;
- captura sin secretos ni datos innecesarios;
- conectividad y estado de sincronización cuando sea mobile.

## Severidad

| Nivel      | Ejemplo                                                 | Respuesta inicial objetivo |
| ---------- | ------------------------------------------------------- | -------------------------: |
| S1 crítica | pérdida de datos, acceso indebido, sistema indisponible |                     30 min |
| S2 alta    | operación principal bloqueada sin alternativa           |                        2 h |
| S3 media   | función degradada con alternativa                       |                1 día hábil |
| S4 baja    | defecto visual o mejora                                 |       planificación normal |

Los tiempos son objetivos iniciales y deben acordarse formalmente con la
empresa.

## Flujo

1. Recibir y registrar.
2. Clasificar severidad y alcance.
3. Preservar evidencia.
4. Buscar `requestId`, ruta, `statusCode`, `errorCode` y versión desplegada en
   los logs estructurados.
5. Mitigar sin destruir datos.
6. Comunicar estado y siguiente actualización.
7. Corregir y validar.
8. Documentar causa, impacto y prevención.

Guía de logs: `docs/runbooks/observability-logs.md`.

## Incidentes de seguridad

- no compartir tokens, contraseñas o backups en el reporte;
- rotar credenciales comprometidas;
- conservar logs relevantes;
- compartir con IA solo extractos anonimizados de logs;
- limitar accesos;
- notificar al responsable empresarial;
- no ocultar ni alterar evidencia.

## Incidentes de sincronización

Antes de borrar datos locales:

1. registrar estado de conexión;
2. revisar cantidades pending/error;
3. conservar identificadores locales;
4. intentar reautenticación y reintento controlado;
5. exportar evidencia técnica cuando sea posible.

Nunca indicar al usuario reinstalar la aplicación como primera medida si hay
datos pendientes.
