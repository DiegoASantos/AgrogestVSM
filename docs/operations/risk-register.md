---
title: Registro de riesgos
status: active
owner: mantenimiento
last_reviewed: 2026-08-17
---

# Registro de riesgos

| ID    | Riesgo                                                                                                                 | Severidad | Estado                 | Tratamiento                                                                                       |
| ----- | ---------------------------------------------------------------------------------------------------------------------- | --------- | ---------------------- | ------------------------------------------------------------------------------------------------- |
| R-001 | El bootstrap vigente crea `parcelas.subsector_id`, pero la migración histórica 001 todavía intenta indexar `sector_id` | Crítica   | Reabierto              | Preparar spec correctiva del bootstrap; el smoke del 2026-08-08 falla antes de migraciones nuevas |
| R-002 | `pnpm check` falla por parsing Flow de React Native en una suite de recetas                                            | Alta      | Cerrado                | Repositorios nativos aislados; suite global verde                                                 |
| R-003 | Login sin rate limiting detectado                                                                                      | Alta      | Cerrado                | 5 intentos/minuto; smoke test confirma HTTP 429                                                   |
| R-004 | Documentación de deploy API no coincide totalmente con `render.yaml`                                                   | Media     | Cerrado                | Runbook reconciliado con migración y seed                                                         |
| R-005 | No existe staging formal ni rollback probado                                                                           | Alta      | Abierto                | Diseñar entornos y simulacro de recuperación                                                      |
| R-006 | Backups y restauración no están documentados ni comprobados                                                            | Crítica   | Cerrado                | Backup y restore local verificados sin Docker                                                     |
| R-007 | Hotspots grandes en visitas, migraciones SQLite, sync y CSS                                                            | Media     | Aceptado temporalmente | Refactorizar por riesgo y cambios reales                                                          |
| R-008 | `packages/contracts` tiene adopción limitada y existe estructura duplicada en admin web                                | Media     | Abierto                | Auditar uso y consolidar                                                                          |
| R-009 | Validación geoespacial autoritativa es parcial                                                                         | Alta      | Abierto                | Completar spec y reglas backend                                                                   |
| R-010 | Configuración y notas de IA podrían duplicar conocimiento                                                              | Media     | Mitigado               | `docs/` es vault único y política documental activa                                               |
| R-011 | Staging todavía no está provisionado                                                                                   | Alta      | Abierto                | Crear recursos separados antes del siguiente piloto                                               |
| R-012 | TLS del pooler no verifica actualmente la CA                                                                           | Media     | Abierto                | Instalar CA de Supabase y activar validación                                                      |
| R-013 | Rate limiting usa memoria de una sola instancia                                                                        | Media     | Aceptado temporalmente | Migrar a almacenamiento compartido al escalar                                                     |
| R-014 | Backups gestionados del proveedor no han sido auditados                                                                | Alta      | Abierto                | Verificar plan, retención y restauración en Supabase                                              |
| R-015 | El bootstrap fresco puede conservar índices únicos equivalentes con nombres distintos                                  | Baja      | Aceptado temporalmente | Auditar catálogo e índices antes de nuevas migraciones                                            |

| R-016 | Integracion Cost-Build expone lectura masiva de datos personales por API key | Alta | Mitigado | API key dedicada, secreto fuera de Git, rotacion si se comparte y endpoint solo lectura |
| R-017 | El macro-score de Enfermedades depende de cuatro códigos canónicos únicos en catálogo | Alta | Mitigado | Migración 035 valida cardinalidad y aborta antes de habilitar el cálculo |
| R-018 | Clientes mobile anteriores no almacenan el grado explícito del catálogo de incidencia | Media | Mitigado | Migración SQLite 45 agrega grado, invalida caché y fuerza descarga del catálogo |
| R-019 | Clientes mobile anteriores identifican las evaluaciones nutricionales solo por texto y una recarga podría cambiar el ID del catálogo | Media | Mitigado | API mantiene lectura compatible; migraciones PostgreSQL 036 y SQLite 46 agregan identidad estable; mobile remapea IDs con UPSERT transaccional y preserva borrados pendientes antes de finalizar |
| R-020 | Una instalacion mobile muy antigua puede atravesar migraciones SQLite historicas que reconstruyen o eliminan datos antes de llegar a la version vigente | Alta | Abierto | Confirmar `user_version = 53` en la cohorte productiva y aprobar una prueba de actualizacion in-place con datos sinteticos antes de distribuir nuevos APK; diseñar ruta preservadora separada para cohortes antiguas |

| R-021 | Las columnas legacy de receta deben mantenerse durante la ventana de compatibilidad con clientes mobile anteriores | Media | Mitigado | API y SQLite siguen poblándolas; monitorear adopción, respaldar y aprobar una spec de contracción separada antes de eliminarlas |
| R-022 | Mobile nuevo puede enviar `parcelReferencePoint` antes de que la API compatible esté desplegada | Media | Mitigado | Desplegar migración 042 y API antes de la OTA/APK; el outbox preserva la parcela pendiente para reintento |
| R-023 | El catálogo productivo puede no tener exactamente un Mango activo o un nivel único por tipo y grado 0..3 | Alta | Mitigado | La migración 043 valida cardinalidades dentro de la transacción y aborta sin carga parcial; ejecutar preflight y backup antes del deploy |
| R-024 | Un dispositivo con catálogos descargados hace menos de 24 horas puede conservar temporalmente las relaciones sanitarias anteriores | Media | Mitigado | Forzar actualización de catálogos en el smoke y comunicarla a dispositivos piloto; instalaciones nuevas descargan el conjunto completo |
| R-025 | Credenciales WeatherLink expuestas, cuota agotada o estaciones compartidas sin GPS/historico autorizado | Alta | Mitigado | Rotar el API Secret y guardarlo solo en Render; limitar rangos a siete dias, cachear por estacion/dia y limitar consultas por usuario; conservar estaciones sin GPS fuera del mapa y sanitizar errores de permisos |
| R-026 | Borrados fisicos de catalogos de receta dejan identidades y fallos huerfanos en dispositivos offline | Alta | Mitigado | Spec 042: baja logica ADMIN, idempotencia por `publicId`, recuperacion explicita desde SQLite, visibilidad preservadora y runbook con backup y verificacion |
| R-027 | Recetas fitosanitarias historicas no permiten inferir una unidad concreta entre masa y volumen | Baja | Mitigado | Spec 043 conserva `NULL` y muestra `mg o ml` como texto de compatibilidad; no inventa ni convierte datos historicos |
| R-028 | Mobile puede sincronizar enfoques preventivos antes de que PostgreSQL y API acepten el nuevo contrato, o usar un catalogo sanitario desactualizado | Media | Mitigado | Desplegar migracion 049 y API antes de la OTA; mobile conserva el agregado en outbox y API revalida objetivo activo, tipo e incidencia positiva antes de persistir |
| R-029 | Un usuario puede olvidar que selecciono offline manual y retrasar la publicacion de pendientes | Baja | Mitigado | La preferencia se muestra en la tarjeta y en una franja persistente con recordatorio; cambiar a automatico programa recuperacion y sync sin alterar el outbox |
| R-030 | Los modelos locales de voz aumentan el APK y pueden exceder memoria, latencia o precision aceptable en equipos de campo | Alta | Abierto | Modelos INT8, motores alternados y formulario manual; bloquear el release hasta superar modo avion, diez recorridos y piloto Android 10/4 GB de la spec 048 |

## Revisión

Actualizar este registro cuando:

- aparezca una incidencia;
- se acepte deuda técnica;
- cambie un entorno;
- se cierre una mitigación;
- una spec introduzca un riesgo temporal.
