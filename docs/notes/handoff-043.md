# Handoff: Selector de unidad para dosis de receta

## Identificacion

- fecha: 2026-08-17
- responsable: Codex
- spec o issue: Spec 043
- alcance del diff: API y persistencia de recetas, migraciones PostgreSQL y
  SQLite, sync offline, formulario mobile, PDF, pruebas y documentacion activa
- criticidad: alta

## Objetivo

Permitir que el usuario seleccione la unidad abreviada de cada dosis
fitosanitaria o fertilizante, conservarla offline y en API, y mostrarla en el
PDF compartido sin modificar formulas ni convertir valores.

## Cambios realizados

- API: `unidadDosis` fitosanitaria opcional, validacion de valores y
  persistencia/respuesta.
- PostgreSQL: migracion aditiva 048 con columna nullable y constraint.
- Mobile: selector fitosanitario `mg`, `g`, `kg`, `ml`, `l`; selector de
  fertilizacion restringido por estado fisico.
- SQLite/sync: migracion 61, repositorio y payload anidado de receta.
- PDF y resumen previo: unidad persistida y fallback historico `mg o ml`.
- Revision DeepSeek: se corrigio el fallback del total agregado historico y el
  total fertilizante legacy; las mezclas con unidades heterogeneas mantienen
  solamente totales individuales para no sumar magnitudes incompatibles.
- Documentacion: modelo de dominio, arquitectura de sync, riesgo historico y
  Spec 043 implementada.

## Contratos y datos afectados

- API: `mezclas[].productos[].unidadDosis` opcional; `fertilizacion[].unidadDosis`
  valida tipo y via cuando ambos estan presentes.
- PostgreSQL/PostGIS: `visita_receta_fitosanidad.unidad_dosis varchar(30) NULL`.
- SQLite/outbox: `visita_receta_fitosanidad.unidad_dosis TEXT NULL`; no se
  agregan operaciones de outbox y la receta sigue siendo un solo agregado.
- autenticacion y permisos: sin cambios.
- variables y despliegue: sin variables nuevas; desplegar migracion/API antes
  de distribuir mobile nuevo.

## Validaciones ejecutadas

| Comando o prueba | Resultado |
| ---------------- | --------- |
| `pnpm.cmd --filter @agrogest/api lint` | correcto |
| `pnpm.cmd --filter @agrogest/mobile lint` | correcto |
| `pnpm.cmd --filter @agrogest/api typecheck` | correcto |
| `pnpm.cmd --filter @agrogest/mobile typecheck` | correcto |
| pruebas dirigidas de API, DB, mobile, PDF y sync | correctas |
| `pnpm.cmd test` | 184 archivos, 1430 pruebas correctas |
| build API y mobile | correcto |
| `pnpm.cmd docs:check` | 95 documentos correctos |
| `pnpm.cmd format:check` | falla por baseline de 803 archivos fuera del alcance |

## Disposicion de la primera revision independiente

- Corregido: las recetas fitosanitarias historicas sin unidad vuelven a
  mostrar el total agregado con el fallback `mg o ml/ha`.
- Corregido: los totales fertilizantes historicos usan `l` para liquidos y
  `kg` para solidos.
- Conservado por compatibilidad: la API admite dosis sin unidad cuando el
  cliente legacy omite el campo; la UI nueva si exige seleccionarla.
- Conservado por alcance: no se refactorizaron helpers duplicados de formato ni
  campos historicos ajenos a la unidad de dosis.

## Riesgos conocidos y exclusiones

- Recetas fitosanitarias historicas no permiten inferir masa o volumen; se
  conserva `NULL` y se muestra `mg o ml` sin inventar datos.
- No se ejecuto `pnpm db:smoke`: el riesgo R-001 documenta un fallo previo del
  bootstrap historico antes de migraciones nuevas.
- No incluye admin-web ni conversion automatica entre unidades.

## Instrucciones al reviewer

- revisar unicamente el alcance descrito;
- no modificar archivos;
- citar archivo y linea;
- priorizar defectos reproducibles;
- devolver veredicto y hallazgos por severidad.
