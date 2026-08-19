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
  conserva el orden registrado y evita omitir elementos vigentes;
- pruebas: cubren orden, dosis, datos historicos, contenido permitido y
  secciones excluidas;
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
| Render HTML/PDF e inspeccion visual | OK, una pagina     |
| `pnpm docs:check`                   | 126 documentos, OK |
| `git diff --check`                  | OK                 |

## Riesgos conocidos y exclusiones

- las recetas historicas sin dosis individual de coadyuvante muestran `-`;
- los fertilizantes historicos sin mezcla asignada se muestran como
  `Sin mezcla` para no perder una recomendacion;
- no se modifica el reporte tecnico de diagnostico ni la captura de receta;
- falta validacion humana final con datos reales antes del siguiente release.

## Instrucciones al reviewer

- revisar unicamente el alcance descrito;
- no modificar archivos;
- citar archivo y linea;
- priorizar omision o duplicacion de productos, orden o dosis incorrectos,
  perdida del encabezado/diagnostico y HTML no escapado;
- devolver veredicto y hallazgos por severidad.
