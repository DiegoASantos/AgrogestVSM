---
title: Acordeones exclusivos en receta mobile
status: implemented
numero: "055"
area: mobile, recetas, fitosanidad, mezclas, fertilizacion, ux
created: 2026-08-19
approved_by: usuario, 2026-08-19
implemented_in: apps/mobile/src/modules/visita-recetas/presentation/screens; docs/architecture/mobile-offline-sync.md, 2026-08-19
---

# Spec 055: Acordeones exclusivos en receta mobile

## Contexto

La receta muestra simultaneamente todas las recomendaciones fitosanitarias,
mezclas y fertilizaciones, lo que produce una pantalla extensa. Ademas, cada
recomendacion fitosanitaria muestra un input Disolvente aunque Agua ya es el
valor por defecto y aparece en el orden de mezcla.

## Alcance

### Incluido

- Ocultar el input Disolvente sin retirar el valor persistido.
- Comprimir objetivos fitosanitarios, mezclas y grupos de fertilizacion.
- Mantener una sola tarjeta de recomendacion abierta en toda la receta.
- Abrir inicialmente la primera tarjeta incompleta y abrir la contenedora del
  elemento que se acaba de agregar.

### Excluido

- Comprimir productos internos, formularios de prevencion, Riego, Labores,
  Cierre o el resumen consolidado.
- Cambiar SQLite, PostgreSQL, API, tipos de receta, borradores u outbox.
- Modificar validaciones obligatorias o formulas de dosificacion.

## Requisitos

- RF-001: Una cabecera colapsada identifica la recomendacion, resume productos
  y muestra estado Pendiente o Completo.
- RF-002: Solo una tarjeta entre Fitosanidad, Mezclas y Fertilizacion puede
  estar abierta; abrir otra cierra la anterior y cualquier dropdown activo.
- RF-003: Al cargar se abre la primera tarjeta incompleta en ese orden visual;
  si todas estan completas, todas quedan cerradas.
- RF-004: Agregar una recomendacion, mezcla o producto abre su tarjeta
  contenedora; eliminar la activa selecciona la siguiente incompleta o ninguna.
- RF-005: Los productos internos permanecen desplegados dentro de su tarjeta
  contenedora.
- RF-006: El input Disolvente no se renderiza. Nuevas recomendaciones conservan
  `Agua` y valores historicos diferentes se restauran y guardan sin sobrescribir.
- RNF-001: El identificador de tarjeta activa es estado efimero y no se incluye
  en el borrador, SQLite ni el payload de sincronizacion.

## Contratos afectados

Solo se agregan contratos internos de presentacion para clave, expansion,
resumen y estado de cada acordeon. No cambian contratos publicos ni datos.

## Seguridad y datos

No cambian permisos, secretos ni datos personales. Colapsar una tarjeta no
descarta estado ni contenido del borrador.

## Migracion y rollback

No hay migraciones ni orden especial de despliegue. El rollback vuelve al
render expandido; las recetas creadas durante esta version siguen siendo
compatibles porque su representacion persistida no cambia.

## Criterios de aceptacion

- [x] CA-001: Disolvente no aparece y Agua permanece en el orden de mezcla.
- [x] CA-002: Solo una tarjeta de recomendacion permanece abierta.
- [x] CA-003: La primera tarjeta incompleta se abre al cargar.
- [x] CA-004: Agregar o eliminar elementos actualiza la tarjeta activa.
- [x] CA-005: Los productos internos siguen disponibles al abrir su contenedora.
- [x] CA-006: Guardar, cerrar y reabrir conserva exactamente la receta offline.

## Pruebas

- unitarias de claves, completitud y seleccion de tarjeta activa;
- regresion de Agua en creacion, restauracion y serializacion;
- pruebas de receta y flujo offline-online existentes;
- lint, typecheck, test, docs check y build mobile;
- validacion visual final en dispositivo.

## Impacto documental

- [x] Arquitectura: actualizado `docs/architecture/mobile-offline-sync.md`.
- [x] Dominio: sin cambios.
- [x] Runbook: no aplica.
- [x] ADR: no aplica.
- [x] Variables o despliegue: sin cambios.
