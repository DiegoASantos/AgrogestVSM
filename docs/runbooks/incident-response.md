---
title: Respuesta a incidentes y soporte
status: active
owner: mantenimiento
last_reviewed: 2026-10-19
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

## Cierre al abrir una instalación nueva de iOS

1. Registrar versión/build, hora y si llegó a mostrar login. Conservar el crash
   report de iOS, sin publicar datos personales, tokens ni payloads.
2. No desinstalar, borrar almacenamiento ni forzar `PRAGMA user_version`.
3. Contrastar con el bootstrap SQLite real. La spec 112 reproduce la colisión
   de `approval_status` en migración 75 sobre una base vacía, detenida en 74;
   ese hallazgo local no sustituye la evidencia del dispositivo.
4. Aplicar la entrega iOS compatible indicada en el
   [runbook mobile](deploy-mobile-expo.md#recuperación-del-arranque-ios-spec-112).
   Si el cierre impide activar la OTA, revisar un IPA correctivo para instalar
   encima con la misma identidad y firma, conservando el almacenamiento.
5. Confirmar login, reinicio y datos pendientes en el iPhone. Si sigue cerrándose,
   investigar el crash nuevo antes de dar por resuelta la incidencia.

## Incidentes de sincronización

Antes de borrar datos locales:

1. registrar estado de conexión;
2. revisar cantidades pending/error;
3. conservar identificadores locales;
4. intentar reautenticación y reintento controlado;
5. exportar evidencia técnica cuando sea posible.

Nunca indicar al usuario reinstalar la aplicación como primera medida si hay
datos pendientes.

### Recetas antiguas sin frecuencia de dosis

Si el dialogo muestra `Completa la frecuencia de dosis de la mezcla N.`,
registrar la version mobile y los conteos por agronomo sin copiar la receta.
La spec 097 repara este caso al abrir la version corregida con la sesion del
dueno: cambia la hora final a inicio mas diez minutos y pasa visita y receta a
pendientes. La receta conserva sus productos y la frecuencia figura como
`Pendiente` en los PDF. El dispositivo necesita volver a conectarse para que
ambas entidades queden sincronizadas y el contador de pendientes llegue a
cero. Mantener la app instalada y abierta durante ese proceso.

Aplicar primero la API que acepta el cruce de medianoche de diez minutos y
despues distribuir mobile y web. Si aparece un mensaje distinto tras el
reintento, tratarlo como un error nuevo y conservar su evidencia. Repetir la
revision en cada dispositivo de los agronomos; la API no puede recuperar por
si sola recetas que solo existen en SQLite.

### Cola de visitas que baja y vuelve a subir

Si Inicio muestra cero errores pero cientos de pendientes, la reconciliacion
puede estar reconstruyendo operaciones que faltaban en outbox. La hora comun de
varios elementos corresponde al encolado y no demuestra una edicion masiva.

1. No desinstalar la app, borrar almacenamiento ni retirar filas de SQLite.
2. Registrar version mobile, usuario, pendientes, errores y hora del ultimo
   intento, sin copiar payloads ni datos personales.
3. Confirmar que la API compatible responde en `/health` y que el usuario esta
   en modo online con sesion valida.
4. Aplicar la OTA de la spec 081. El primer arranque puede aumentar una sola vez
   el contador porque reencola visitas previamente confirmadas en falso.
5. Mantener la app abierta y conectada. Cada ciclo es parcial si vence el
   deadline; el contador debe disminuir sin que aparezcan fallos durables.
6. Comprobar en la web una visita completa por usuario antes de declarar
   recuperada la cohorte y registrar los conteos finales.

Cancelar la distribucion si aparecen errores generalizados o si varios ciclos
con red estable no procesan ningun registro. El rollback debe ser otra OTA que
desactive el reencolado y conserve el handler `PATCH`; nunca volver al handler
que trataba un update como creacion.

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
