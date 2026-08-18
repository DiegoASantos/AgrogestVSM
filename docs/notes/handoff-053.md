# Handoff: Spec 053 - fertilizantes por deficiencia nutricional

## Identificacion

- fecha: 2026-08-18
- responsable: Codex
- spec o issue: Spec 053
- alcance del diff: migraciones PostgreSQL/SQLite, contrato y validacion API,
  receta/sync/historial/PDF mobile, PDF admin, pruebas y documentacion
- criticidad: alta

## Objetivo

Relacionar cada producto fertilizante con el nutriente que atiende, agrupar uno
o mas productos por deficiencia y clasificar automaticamente como curativo si
existe una evaluacion en la visita —incluido grado 0— o preventivo si no existe.

## Cambios realizados

- PostgreSQL agrega `nutriente_id` nullable, FK, instantanea de nombre e indice.
- API valida nutriente activo, cultivo, existencia de evaluacion, enfoque y
  factor; conserva clientes legacy sin nutriente.
- La consolidacion local y remota expone el identificador estable del nutriente.
- SQLite 64 agrega las columnas sin recrear tablas; el agregado sigue viajando
  mediante la operacion padre `visita_recetas`.
- Mobile proyecta tarjetas por nutriente, varios productos por tarjeta y alta
  preventiva solo sobre nutrientes del cultivo no evaluados.
- Historial y PDFs mobile/web muestran deficiencia, enfoque y producto; las
  recetas legacy indican `Deficiencia no registrada`.
- Spec 053, modelo de dominio, arquitectura de sync e indices documentales se
  actualizaron.

## Contratos y datos afectados

- API: `fertilizacion[].nutrienteId` en entrada; `nutrienteId` y
  `nutrienteNombre` en respuesta; consolidacion agrega `nutrienteId`.
- PostgreSQL/PostGIS: migracion 052 aditiva sobre
  `visita_receta_fertilizacion`.
- SQLite/outbox: migracion 64 aditiva; sin nuevo tipo de outbox.
- autenticacion y permisos: sin cambios.
- variables y despliegue: sin variables; orden requerido migracion PostgreSQL,
  API compatible y luego mobile/admin.

## Validaciones ejecutadas

| Comando o prueba | Resultado |
| ---------------- | --------- |
| `pnpm.cmd test` | 199 archivos y 1530 pruebas pasan |
| pruebas focalizadas finales de receta/API/migracion/sync | 77 pruebas pasan; despues 38 pruebas afectadas pasan |
| `pnpm.cmd typecheck` | pasa en los seis paquetes aplicables |
| lint mobile, API y admin | pasa |
| `pnpm.cmd docs:check` | pasa, 114 documentos validados |
| `git diff --check` | pasa |
| `pnpm.cmd format:check` | falla por deuda global preexistente de 782 archivos; los archivos nuevos se formatearon individualmente |

## Riesgos conocidos y exclusiones

- No se ejecutaron migraciones contra una base PostgreSQL externa ni una
  validacion visual manual del dispositivo; se cubrieron con pruebas de SQL,
  repositorio, sync, tipos y funciones puras.
- No se hace backfill de recetas historicas porque inferir el nutriente por
  posicion produciria asociaciones falsas.
- El diff contiene cambios locales previos de las Specs 051/052 y del scroll de
  visitas. Deben ignorarse salvo cuando el archivo compartido de receta sea
  necesario para evaluar la integracion de la Spec 053.
- El reviewer DeepSeek se inicio mediante el runbook, pero excedio el timeout de
  120 segundos y continuo como proceso externo sin emitir un veredicto
  recuperable. La revision independiente queda pendiente; Codex completo la
  revision local, pruebas y gates documentados.

## Instrucciones al reviewer

- revisar unicamente el alcance descrito;
- no modificar archivos;
- citar archivo y linea;
- priorizar defectos reproducibles;
- devolver veredicto y hallazgos por severidad.
