# Handoff: Receta para productor resumida por mezclas

## Identificacion

- fecha: 2026-08-19
- responsable: Codex
- spec o issue: Spec 061
- alcance del diff: proyeccion PDF de receta para productor en mobile y admin
  web, tipos de lectura, pruebas y documentacion
- criticidad: media

## Objetivo

Reducir la receta entregada al productor al encabezado y resumen del diagnostico
vigentes, seguidos por una tabla que indique la mezcla, los productos y
coadyuvantes en su orden de preparacion, y la dosis correspondiente.

## Cambios realizados

- mobile: el reporte elimina las secciones tecnicas posteriores al diagnostico
  y usa un armador puro de filas por mezcla;
- admin web: el reporte aplica la misma proyeccion y mantiene lectura de recetas
  historicas que todavia solo incluyen `fitosanidad`;
- tabla: incluye fitosanitarios, fertilizantes y coadyuvantes, excluye `Agua`,
  conserva el orden registrado, agrupa el numero en una sola celda vertical y
  muestra el ingrediente activo de cada fitosanitario;
- pruebas: cubren orden, ingrediente activo, dosis, datos historicos, contenido
  permitido y secciones excluidas;
- documentacion: Spec 061, indices y modelo de dominio.

## Contratos y datos afectados

- API: sin cambios de endpoint, DTO ni respuesta;
- PostgreSQL/PostGIS: sin cambios;
- SQLite/outbox: sin cambios de esquema, persistencia o sincronizacion;
- autenticacion y permisos: sin cambios;
- variables y despliegue: sin cambios; el resultado requiere una nueva entrega
  del cliente mobile o admin web correspondiente.

## Validaciones ejecutadas

| Comando o prueba                    | Resultado          |
| ----------------------------------- | ------------------ |
| Vitest mobile `visita-recetas`      | 127/127            |
| Vitest admin web `visitas/services` | 30/30              |
| Typecheck mobile y admin web        | OK                 |
| ESLint focalizado                   | OK                 |
| Render HTML/PDF e inspeccion visual | OK, celda agrupada |
| `pnpm docs:check`                   | 126 documentos, OK |
| `git diff --check`                  | OK                 |

## Riesgos conocidos y exclusiones

- las recetas historicas sin dosis individual de coadyuvante muestran `-`;
- los fertilizantes historicos sin mezcla asignada se muestran como
  `Sin mezcla` para no perder una recomendacion;
- no se modifica el reporte tecnico de diagnostico ni la captura de receta;
- falta validacion humana final con datos reales antes del siguiente release.

## Resultado de la revision independiente

- modelo: `deepseek/deepseek-v4-pro`;
- sesion: `ses_fe40f428cffeUsula9Ms3p2CTB`;
- veredicto inicial: aprobado con observaciones;
- aceptado: escapar el nombre del productor y unificar el escape de apostrofes
  entre mobile y admin web;
- diferido: semantica de dosis en el fallback historico y duplicados invalidos
  dentro de `ordenMezcla`;
- ajuste posterior: por validacion humana, el numero de mezcla se agrupa en una
  sola celda vertical; requiere revision focalizada final del delta.

## Instrucciones al reviewer

- revisar unicamente el alcance descrito;
- no modificar archivos;
- citar archivo y linea;
- priorizar omision o duplicacion de productos, orden o dosis incorrectos,
  perdida del encabezado/diagnostico y HTML no escapado;
- devolver veredicto y hallazgos por severidad.
