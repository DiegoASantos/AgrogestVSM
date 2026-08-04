---
title: Handoff Spec 029 - mezclas y dosificacion de receta
status: temporary
owner: mantenimiento
created: 2026-08-04
related_spec: ../specs/029-mezclas-factor-dosificacion-receta.md
---

# Handoff: Spec 029

## Identificacion

- fecha: 2026-08-04
- responsable: Codex, con aprobacion del usuario
- spec o issue: Spec 029
- alcance del diff: API, PostgreSQL, mobile SQLite/outbox, UI, PDF y documentacion
- criticidad: alta

## Objetivo

Representar cada tanque fitosanitario como una mezcla con productos anidados,
aplicar el factor de incidencia y calcular la dosis comercial mediante
`dosis * volumen * factor`, conservando datos y rollback para clientes
anteriores.

## Cambios realizados

- API: contrato anidado `mezclas[] -> productos[]`, calculos autoritativos y
  lectura/escritura temporal del contrato plano anterior.
- PostgreSQL: migracion 040 aditiva con backfill de mezclas, dosis de producto,
  factores, FK e indices.
- Mobile: migracion SQLite 55, persistencia transaccional del agregado,
  payload anidado, `skipSync` de detalles y confirmacion conjunta.
- UI/PDF: declaracion y configuracion por mezcla, factores derivados, orden con
  marcas comerciales, incompatibilidades por tanque y reporte agrupado.
- Documentacion: modelo de dominio, sync offline, riesgos y extensiones de las
  Specs 009 y 027.

## Contratos y datos afectados

- API: POST/PUT/GET de receta; respuesta plana legacy se conserva temporalmente.
- PostgreSQL/PostGIS: nueva `visita_receta_mezclas`; columnas aditivas en
  fitosanidad y fertilizacion; no cambia PostGIS.
- SQLite/outbox: nueva `visita_receta_mezcla`; migracion 55 y agregado de receta
  anidado bajo una sola operacion de outbox.
- autenticacion y permisos: sin cambios; continúan los guards existentes.
- variables y despliegue: sin variables nuevas. Migrar API antes de distribuir
  la nueva version mobile.

## Secuencia de despliegue y rollback

1. Crear backup verificable de PostgreSQL y confirmar la cohorte SQLite minima.
2. Desplegar la migracion 040 y la API compatible, verificando lectura de
   recetas historicas y nuevas.
3. Distribuir mobile con migracion SQLite 55 y comprobar sync offline-online.
4. Mantener las columnas legacy hasta confirmar adopcion; su retiro exige otra
   spec y migracion de contraccion.

Para rollback, desplegar primero el codigo anterior mientras las columnas
legacy siguen pobladas. Respaldar las mezclas nuevas antes de retirar FK,
columnas aditivas o tablas. No ejecutar contraccion automatica en produccion.

## Validaciones ejecutadas

| Comando o prueba | Resultado |
| ---------------- | --------- |
| Pruebas focalizadas | 9 archivos y 81 casos correctos; suite final incluida abajo |
| `pnpm test` | 104 archivos y 614 casos correctos |
| Lint y typecheck de API/mobile | correcto |
| Build de API/mobile | correcto |
| `pnpm check` | bloqueado por conflicto React/Lucide preexistente en admin-web |
| `pnpm build` | API compila; bloqueado luego por el mismo error de admin-web |
| `pnpm docs:check` | cambios 029 correctos; bloqueado por deuda documental preexistente |
| `pnpm db:smoke` | bloqueado en migracion 001 antes de ejecutar la 040 |
| Revision independiente | por ejecutar sobre este diff congelado |

## Riesgos conocidos y exclusiones

- Las columnas legacy duplican temporalmente parte de la informacion; el riesgo
  y su tratamiento estan registrados como R-021.
- Admin web y la contraccion fisica de columnas quedan fuera de alcance.
- La inspeccion visual en dispositivo y el despliegue productivo requieren
  aprobacion humana y no forman parte de esta implementacion.
- El bootstrap fresco falla en la migracion territorial 001 porque referencia
  `parcelas.sector_id` antes de que exista; esta deuda es anterior y ajena a la
  migracion 040.
- Admin web conserva un conflicto preexistente entre tipos React 18/19 y
  Lucide. La Spec 029 no modifica ese paquete.

## Instrucciones al reviewer

- revisar unicamente el alcance descrito;
- no modificar archivos;
- citar archivo y linea;
- priorizar defectos reproducibles;
- devolver veredicto y hallazgos por severidad.
