---
title: Receta para productor resumida por mezclas
status: implemented
numero: "061"
area: mobile-admin-reportes
created: 2026-08-19
approved_by: Usuario via Codex, 2026-08-19
implemented_in: apps/mobile/src/modules/visita-recetas/services/producer-recipe-mixture-plan.ts; apps/mobile/src/modules/visita-recetas/services/visita-receta-pdf-report.service.ts; apps/admin-web/src/modules/visitas/services/visita-pdf-web.service.ts
---

# Spec 061: Receta para productor resumida por mezclas

## Contexto

La receta compartida con el productor contiene detalles tecnicos, calculos y
secciones que dificultan una lectura rapida. El encabezado y el resumen del
diagnostico ya son utiles; la recomendacion operativa puede expresarse con una
sola tabla que indique que preparar, en que orden y con que dosis.

## Alcance

### Incluido

- conservar el encabezado vigente con titulo, productor cuando corresponda,
  AgroGest VSM y fecha;
- conservar sin cambios el `Resumen del Diagnostico`;
- reemplazar el resto del cuerpo por una tabla de mezclas;
- mostrar numero de mezcla, productos y coadyuvantes en el orden registrado, y
  la dosis de cada elemento;
- incluir en la misma mezcla productos fitosanitarios y fertilizantes
  asignados;
- aplicar el mismo contenido al reporte generado desde mobile y admin web.

### Excluido

- modificar el diagnostico, la captura de receta o el formulario de mezclas;
- cambiar calculos, persistencia, SQLite, PostgreSQL, API u outbox;
- mostrar totales por hectarea, concentraciones, factores, riego, labores o
  tarjetas tecnicas adicionales en la receta para productor;
- redisenar el reporte tecnico de diagnostico.

## Requisitos

- RF-001: despues del encabezado se mostrara el resumen del diagnostico vigente.
- RF-002: la unica seccion posterior sera `Mezclas y dosis`, con columnas
  `Mezcla`, `Productos y coadyuvantes (en orden)` y `Dosis`.
- RF-003: cada producto fitosanitario mostrara nombre comercial, o ingrediente
  activo cuando no exista marca, junto con su dosis comercial y unidad.
- RF-004: cada fertilizante asignado mostrara su nombre y dosis con unidad.
- RF-005: cada coadyuvante mostrara el nombre del catalogo y la dosis libre
  registrada en la mezcla.
- RF-006: el orden persistido prevalecera; `Agua` no se mostrara como producto
  y cualquier elemento no reconocido conservara su posicion con dosis `-`.
- RF-007: un elemento vigente que no figure en un orden historico se agregara al
  final para no omitir una recomendacion.
- RF-008: mobile y admin web generaran el mismo contenido funcional.
- RNF-001: el cambio sera una proyeccion de reporte y no modificara datos,
  sincronizacion ni contratos HTTP.
- RNF-002: todos los valores dinamicos continuaran escapandose antes de
  insertarse en HTML.

## Contratos afectados

No cambia el contrato de API. Admin web tipa el arreglo `mezclas` que la API ya
entrega para poder renderizar la proyeccion vigente; el cambio es aditivo y
local al cliente.

## Seguridad y datos

No se agregan datos personales. Se reduce la informacion compartida y se
mantiene el escape HTML de nombres y dosis.

## Migracion y rollback

No hay migracion. El rollback consiste en restaurar los renderizadores
anteriores de mobile y admin web.

## Criterios de aceptacion

- [x] CA-001: encabezado y resumen del diagnostico siguen presentes.
- [x] CA-002: la tabla muestra mezcla, elementos ordenados y dosis alineadas.
- [x] CA-003: productos, fertilizantes y coadyuvantes aparecen una sola vez.
- [x] CA-004: no aparecen las secciones detalladas de fitosanidad,
      fertilizacion, riego, labores, calculos ni resumen duplicado.
- [x] CA-005: mobile y admin web pasan pruebas, tipos y lint.

## Pruebas

- unitarias del armado y orden de filas;
- salida HTML mobile y admin web;
- regresion de valores historicos o faltantes;
- validacion visual manual del PDF antes del siguiente release.

## Impacto documental

- [ ] Arquitectura.
- [x] Dominio.
- [ ] Runbook.
- [ ] ADR.
- [ ] Variables o despliegue.
