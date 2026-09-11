# Handoff: Recuperacion de sincronizacion de visitas mobile

## Identificacion

- fecha: 2026-09-10
- responsable: Codex
- spec o issue: Spec 081
- alcance del diff: mobile sync, outbox, estado de Inicio, pruebas y documentacion
- criticidad: alta

## Objetivo

Corregir actualizaciones de visitas confirmadas mediante el endpoint equivocado,
evitar que una cola superior a 100 elementos postergue los hijos y recuperar una
vez las visitas locales que pudieron quedar desactualizadas en el servidor.

## Cambios realizados

- El handler separa POST/PATCH y traduce el ID local de parcela a `server_id`.
- La cola completa se ordena por dependencias y agregado de visita.
- Una reparacion transaccional por usuario reencola visitas con identidad remota.
- Inicio diferencia intentos parciales de sincronizaciones completas.
- Se agregan pruebas de 328 entradas, aislamiento, reinicio y update posterior.

## Contratos y datos afectados

- API: sin cambios; reutiliza POST y PATCH vigentes.
- PostgreSQL/PostGIS: sin cambios.
- SQLite/outbox: sin esquema nuevo; marcador por usuario en `app_meta` y
  reencolado preservador.
- autenticacion y permisos: sin cambios; todas las consultas se limitan al
  usuario de la sesion.
- variables y despliegue: sin variables ni dependencias nativas; candidato OTA
  para runtime 0.2.0, todavia no publicado.

## Validaciones ejecutadas

| Comando o prueba                         | Resultado                  |
| ---------------------------------------- | -------------------------- |
| Pruebas focalizadas de sync              | 63 pruebas aprobadas       |
| `pnpm check`                             | 239 archivos, 1878 pruebas |
| `pnpm build`                             | aprobado                   |
| `git diff --check`                       | aprobado                   |
| Validacion Android con copia anonimizada | pendiente de responsable   |

## Riesgos conocidos y exclusiones

- La primera ejecucion aumenta una sola vez el contador al reencolar visitas.
- La reparacion excluye visitas ya marcadas `error`, ademas de outbox y fallos
  durables existentes; esos casos requieren correccion explicita.
- El reenvio total fue una decision explicita de recuperacion. Mobile es la
  fuente de edicion de cabeceras de visita y admin web no expone PATCH para
  ellas; si la API devuelve 404, se conserva como fallo durable visible.
- La cola se carga completa en memoria para eliminar starvation; su costo es
  lineal y el escenario objetivo verificado contiene 328 elementos.
- No se realizo una prueba sobre dispositivos ni datos productivos.
- No se hizo commit, push ni publicacion OTA.
- El rollback debe conservar PATCH y desactivar solo la reparacion automatica.

## Revision independiente

DeepSeek aprobo el cierre sin defectos bloqueantes. Sus correcciones aceptadas
fueron impedir un falso exito si persisten errores durables, excluir de la
reparacion visitas antiguas ya marcadas `error` y permitir que el outbox normal
siga drenando si esa reparacion se difiere por un fallo local. Tambien se aislo
por usuario el conteo y detalle de errores legados que decide si el ciclo esta
completo. Los demas puntos quedaron clasificados como decisiones explicitas o
mejoras cosmeticas fuera del alcance.

## Instrucciones al reviewer

- revisar unicamente el alcance descrito;
- no modificar archivos;
- citar archivo y linea;
- priorizar perdida, duplicacion, starvation, mezcla entre usuarios y falsos
  estados de exito;
- devolver veredicto y hallazgos por severidad.
