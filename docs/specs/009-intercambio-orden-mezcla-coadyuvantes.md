---
title: Intercambio manual de posiciones en el orden de mezcla de coadyuvantes
status: implemented
numero: "009"
area: mobile-recipe
created: 2026-07-04
approved_by: usuario, 2026-07-04
implemented_in: apps/mobile/src/modules/visita-recetas/presentation/screens/visita-receta-screen.tsx; apps/mobile/src/modules/visita-recetas/presentation/screens/visita-receta-order.ts; apps/mobile/src/modules/visita-recetas/presentation/screens/visita-receta-order.test.ts
---

# Spec 009: Intercambio manual de posiciones en el orden de mezcla de coadyuvantes

## Contexto

El orden de mezcla actual se genera de forma puramente algorítmica en
`generateOrdenMezcla()` a partir del mapa estático `COADYUVANTE_ORDER`. El usuario no puede modificar la secuencia generada aunque conozca condiciones de campo que justifiquen un orden distinto (compatibilidad entre productos, tipo de agua, temperatura, etc.).

La lista mostrada en `ordenContainer` era de solo lectura. Se requiere que el usuario pueda intercambiar dos posiciones de coadyuvantes en la lista del orden de la mezcla, manteniendo fijos Agua, Corrector de pH y Producto agroquímico.

Se elige el mecanismo de intercambio (no arrastre) porque:
- La lista es corta (máximo 6 coadyuvantes).
- Funciona mejor con guantes, manos mojadas o bajo sol.
- No requiere librerías externas adicionales.
- Es más accesible (compatible con lectores de pantalla) y menos propenso a errores accidentales.

## Alcance

### Incluido

- Interfaz de intercambio de dos elementos en la lista de orden de mezcla dentro de `FitosanidadCard` (mobile).
- Modo "Intercambiar" activable mediante botón, con indicador visual claro.
- Persistencia del orden manual en SQLite (columna `orden_mezcla`, ya
  existente).
- Sincronización del orden personalizado vía outbox y API (contrato ya
  existente).
- Desactivación automática del modo intercambio al guardar la receta o al cambiar de pantalla.

### Excluido

- Arrastre (drag-and-drop) con gestos táctiles.
- Reordenamiento de los elementos fijos (Agua, Corrector de pH, Producto agroquímico).
- Cambios en el panel admin-web.
- Cambios en la API (el campo `ordenMezcla` ya existe y acepta texto arbitrario).
- Mecanismo de "resetear al orden automático" — se deja fuera del alcance inicial pero se documenta como mejora futura.

## Requisitos

- RF-001: La lista "Orden de mezcla" debe incluir un botón "Intercambiar" que
  active el modo intercambio.
- RF-002: En modo intercambio, cada ítem reordenable debe mostrar un indicador
  visual de que es seleccionable.
- RF-003: Al tocar un ítem en modo intercambio, este se resalta como
  seleccionado. Al tocar un segundo ítem, se intercambian sus posiciones en el
  array `ordenMezcla`.
- RF-004: Los elementos fijos (Agua, Corrector de pH, Producto agroquímico) no son seleccionables en modo intercambio.
- RF-005: El botón cambia a "Listo" durante el modo intercambio; al
  presionarlo se desactiva el modo.
- RF-006: El orden de mezcla modificado manualmente se serializa como JSON y se persiste en `visita_receta_fitosanidad.orden_mezcla`.
- RF-007: La generación automática de `ordenMezcla` (`generateOrdenMezcla`) solo se ejecuta cuando el usuario modifica la selección de coadyuvantes (chips). Si el usuario ya reordenó manualmente, el orden manual prevalece.
- RF-008: El orden de mezcla personalizado debe aparecer correctamente en el PDF de receta generado por `visita-receta-pdf-report.service.ts`.
- RNF-001: El modo intercambio debe desactivarse si el usuario cambia de ficha/pestaña, guarda la receta, o navega hacia atrás.
- RNF-002: La funcionalidad debe funcionar offline (el estado vive en React, persiste en SQLite local).
- RNF-003: No se introducen nuevas dependencias.

## Contratos afectados

### Mobile (SQLite)

| Capa | Columna | Cambio |
|------|---------|--------|
| `visita_receta_fitosanidad` | `orden_mezcla` (TEXT) | Ninguno. Sigue almacenando JSON string con el orden final. |
| `sync_outbox` | - | Ninguno. La entidad ya se registra para sincronización. |

### API (PostgreSQL)

| Capa | Columna | Cambio |
|------|---------|--------|
| `visita_receta_fitosanidad` | `orden_mezcla` (text) | Ninguno. Recibe el string JSON como hasta ahora. |

### Tipos

| Tipo | Campo | Cambio |
|------|-------|--------|
| `AppFitosanidad` (local) | `ordenMezcla: string[]` | Ninguno. |
| `RecetaFitosanidad` (DB) | `ordenMezcla: string \| null` | Ninguno. |
| `SaveRecetaData.fitosanidad[].ordenMezcla` | `string \| null` | Ninguno. |

No hay cambios en contratos de API ni en tipos compartidos. El contrato `string
&vert; null` para `ordenMezcla` ya soporta cualquier orden.

## Seguridad y datos

- **Roles**: No aplica. El orden de mezcla es un dato editorial de la receta,
  sin impacto en autorización.
- **Datos sensibles**: Ninguno. Los nombres de coadyuvantes son catálogos
  públicos.
- **Inyección**: El contenido de `ordenMezcla` se escribe como JSON string en
  SQLite con parámetros preparados (prepared statements de expo-sqlite). En el
  PDF se escapa con `escapeHtml()`. Sin riesgo nuevo.
- **Compatibilidad**: Una receta guardada con orden personalizado en una versión
  nueva se lee correctamente en versiones anteriores (el campo es el mismo
  string JSON). La versión anterior simplemente muestra el orden sin permitir
  editarlo.

## Migración y rollback

- **Avance**: La migración es puramente de UI. No hay cambios de esquema ni de datos.
- **Rollback**: Revertir el código del screen restaura el comportamiento
  anterior. Las recetas ya guardadas con orden personalizado se seguirán
  mostrando correctamente (solo lectura).
- **Compatibilidad hacia atrás**: Total. El formato de `orden_mezcla` no cambia.
  Recetas existentes sin orden personalizado (`null`) se comportan igual.

## Criterios de aceptación

- [x] CA-001: Existe un botón "Intercambiar" visible cuando la lista de orden de
  mezcla tiene al menos 2 coadyuvantes.
- [x] CA-002: Al activar el modo intercambio, los coadyuvantes muestran un
  indicador visual de selección (borde punteado, icono) y los elementos fijos
  permanecen sin dicho indicador.
- [x] CA-003: Tocar coadyuvante A lo resalta; tocar coadyuvante B intercambia
  sus posiciones y limpia la selección.
- [x] CA-004: El botón muestra "Listo" en modo intercambio; al presionarlo se
  desactiva el modo y vuelve a mostrar "Intercambiar".
- [x] CA-005: Agua, Corrector de pH y Producto agroquímico no son seleccionables
  ni intercambiables.
- [x] CA-006: Al guardar la receta, el orden manual persiste en SQLite y se
  serializa correctamente como JSON array.
- [x] CA-007: El PDF generado refleja el orden de mezcla personalizado.
- [x] CA-008: Si el usuario modifica los chips de coadyuvantes después de un
  reordenamiento manual, el orden se regenera automáticamente.
- [x] CA-009: El modo intercambio se desactiva al cambiar de ficha de
  fitosanidad, al guardar, o al navegar hacia atrás.

## Pruebas

- **Unitarias**: Se agregó `visita-receta-order.test.ts` para generación,
  detección de elementos fijos e intercambio sin mutar el orden original.
- **Integración**: El flujo existente de `saveReceta` mantiene
  `JSON.stringify(app.ordenMezcla)` hacia `orden_mezcla`; no cambió contrato.
- **Offline**: El flujo SQLite/outbox existente conserva el mismo campo
  `ordenMezcla`; no cambiaron `sync_outbox`, handlers ni API.
- **Validaciones ejecutadas**:
  - `pnpm.cmd exec vitest run apps/mobile/src/modules/visita-recetas/presentation/screens/visita-receta-order.test.ts`
  - `pnpm.cmd exec vitest run apps/mobile/src/modules/visita-recetas/services/visita-recetas.service.test.ts`
  - `pnpm.cmd exec vitest run apps/mobile/src/shared/sync/sync-offline-online.test.ts`
  - `pnpm.cmd --filter @agrogest/mobile typecheck`
  - `pnpm.cmd --filter @agrogest/mobile lint`
- **Validación manual**:
  - Crear receta con 3+ coadyuvantes, intercambiar dos, guardar, reabrir y
    verificar orden.
  - Intercambiar, luego agregar/quitar un coadyuvante, verificar que el orden
    se regenera.
  - Verificar PDF con orden personalizado.

## Impacto documental

- [x] Arquitectura — sin cambios.
- [x] Dominio — sin cambios.
- [x] Runbook — sin cambios.
- [x] ADR — sin cambios.
- [x] Variables o despliegue — sin cambios.
