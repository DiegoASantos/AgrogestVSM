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

### Catalogos de receta eliminados o con validacion fallida

Este procedimiento aplica a `ingredientes_activos`, `marcas_producto` y
`fertilizantes`. No ejecutar borrados fisicos ni vaciar SQLite, outbox o fallos
durables.

1. Detener nuevas correcciones sobre los registros afectados y registrar
   cantidad, tipo, `public_id`/ID local, propietario y estado de sync sin copiar
   datos personales al incidente.
2. Crear y verificar un backup productivo antes de cualquier mutacion. Confirmar
   tambien la version instalada del mobile y el commit de la API.
3. Consultar en modo lectura si cada `public_id` existe, su valor de `activo` y
   si tiene referencias. No recrear ni desactivar por nombre, porque no es una
   identidad estable.
4. Desplegar primero la API compatible. Verificar health, autenticacion,
   idempotencia de alta por `publicId` y que los endpoints
   `DELETE /ingredientes-activos/:id`, `DELETE /fertilizantes/:id` y
   `DELETE /marcas-producto/:id` exijan rol `ADMIN` y respondan con
   `isActive = false` sin borrar la fila.
5. Publicar despues la version mobile con migracion SQLite 60. Probar una
   actualizacion in-place representativa antes de ampliar la distribucion.
6. En el dispositivo afectado, abrir Errores de sincronizacion y revisar cada
   registro:
   - si la copia SQLite es valida, elegir `Volver a enviar`;
   - si fue un alta equivocada nunca confirmada, elegir `Descartar alta local`
     y confirmar;
   - si ya tenia `server_id` pero fue borrada manualmente en PostgreSQL,
     recrearla por el mismo `publicId`, comprobar la identidad resultante y
     luego desactivarla mediante la API administrativa si no debe seleccionarse.
7. Refrescar catalogos. Comprobar que los inactivos ya no aparecen en
   selectores, que no quedan reencolados automaticamente y que visitas y recetas
   historicas siguen disponibles.
8. Registrar por cada elemento la accion y el resultado. No registrar tokens ni
   payloads completos.

Rollback: una baja equivocada se revierte reactivando la misma fila, no creando
otra. Las columnas SQLite aditivas se conservan. Si falla la OTA, detener su
distribucion y mantener la API compatible; restaurar un backup completo solo
ante corrupcion confirmada y con aprobacion del responsable productivo.
