---
title: Paginación y búsqueda en selector de productor mobile
status: draft
numero: "013"
area: mobile
created: 2026-07-07
approved_by:
implemented_in:
---

# Spec 013: Paginación y búsqueda en selector de productor mobile

## Contexto

Se esta subiendo la data de ~602 productores . El selector de
productor en la pantalla de nueva visita (`new-visita-selector-screen.tsx`) carga todos los productores en memoria mediante `productoresService.getAll()` sin paginación ni virtualización. El
componente `AppSelectField` renderiza todas las opciones con `.map()dentro de un ScrollView, lo que:

1. Degrada el rendimiento al abrir el dropdown con cientos de opciones.
2. Sobrecarga innecesariamente la memoria del dispositivo.
3. Dificulta la navegación del usuario para encontrar un productor específico, incluso con el filtro cliente-side actual.

Ya se aplicó el filtro de productores activos (`is_active = 1`) en el
repositorio SQLite (commit incluido en este mismo entregable), lo que reduce el dataset. Sin embargo, la cantidad de activos sigue siendo lo bastante alta para justificar paginación puesto que los activos son 308.

## Alcance

### Incluido

- Nuevo método `searchByName(query, limit, offset)` en
  `productores.repository.ts` que busque productores activos cuyo nombre, apellido o documento coincida con el texto ingresado.
- Nuevo método `countByName(query)` que devuelva el total de coincidencias para control de paginación.
- Exposición de ambos métodos en `productores.service.ts`.
- Componente `AppSelectField` extendido con modo paginado (`paginated` prop) o nuevo componente `AppSearchablePaginatedList` que:
  - Reciba `onSearch(query, page)` en vez de `options` estáticas.
  - Internamente use FlatList con ventana (`windowSize` `maxToRenderPerBatch`).
  - Soporte carga progresiva (scroll infinito hacia abajo).
  - Muestre indicador de carga al buscar o paginar.
  - Sea retrocompatible: `AppSelectField` sin prop `paginated` funcione igual que hoy.
- Integración del nuevo componente en `new-visita-selector-screen.tsx`
  reemplazando el `AppSelectField` del paso de productor.
- Tests unitarios para los nuevos métodos del repositorio.

### Excluido

- Búsqueda server-side (API `/productores?search=`). La búsqueda se hará contra SQLite local porque los productores ya están descargados vía `downloadAllCatalogs()`.
- Paginación en el endpoint `/productores` de la API. No es necesaria porque mobile no consulta este endpoint para el selector.
- Extender la paginación a otros selectores (parcela, cultivo, etc.). Solo se aborda el selector de productor en este spec.
- Cambios en `visitas-history-screen.tsx`. No usa `getAll()`.
- Migraciones de SQLite. No se altera el esquema.

## Requisitos

- RF-001: El repositorio debe exponer `searchByName(query, limit, offset)` que
  devuelva solo productores activos (`is_active = 1`) cuyas columnas `first_name`,
  `last_name` o `document_number` contengan el texto de búsqueda (LIKE %query%),
  insensible a mayúsculas/minúsculas y acentos.
- RF-002: `searchByName` debe aceptar `limit` y `offset` para control de
  paginación y devolver resultados ordenados alfabéticamente.
- RF-003: El repositorio debe exponer `countByName(query)` que devuelva el
  número total de productores activos que coinciden con la búsqueda.
- RF-004: El componente de UI paginado debe solicitar una página inicial de 10
  resultados cuando se abre el dropdown por primera vez.
- RF-005: Al escribir en el campo de búsqueda, el componente debe reiniciar a
  la página 1 y pedir una nueva búsqueda con el texto ingresado.
- RF-006: El scroll al final de la lista debe disparar la carga de la página
  siguiente (10 items adicionales).
- RF-007: `AppSelectField` con prop `paginated` debe mantener el mismo contrato
  visual y de accesibilidad que la versión sin paginación (etiqueta, error,
  emptyMessage, helper).
- RF-008: Si no hay resultados para una búsqueda, mostrar `emptyMessage` sin
  intentar cargar más páginas.
- RNF-001: La lista virtualizada debe usar FlatList con `removeClippedSubviews`,
  `maxToRenderPerBatch=10`, `windowSize=5`.
- RNF-002: El debounce de búsqueda debe ser de 300 ms para evitar queries
  excesivas a SQLite.
- RNF-003: El componente debe funcionar correctamente offline (sin dependencia
  de red).

## Contratos afectados

| Contrato | Tipo | Cambio |
|----------|------|--------|
| `productores.repository.ts` | SQLite query | Nuevos métodos `searchByName`, `countByName` |
| `productores.service.ts` | Service | Exponer nuevos métodos |
| `AppSelectField` | UI component | Extensión con prop `paginated` o nuevo componente |
| `new-visita-selector-screen.tsx` | Screen | Migrar a componente paginado |

No se modifican DTOs de API, tipos compartidos ni endpoints.

## Seguridad y datos

- No se exponen datos nuevos. La búsqueda opera sobre productores ya
  descargados en SQLite local.
- No hay riesgo de inyección SQL: las queries usan parámetros preparados de SQLite (`?` placeholders).
- El filtro `is_active = 1` ya está aplicado en `getAll()` y `getBySectorId()`. `searchByName` y `countByName` deben incluir la misma condición.

## Migración y rollback

- **Avance**: los nuevos métodos se agregan sin modificar los existentes (`getAll`, `getById`, `getBySectorId`). La pantalla de nueva visita migra al componente paginado. `getAll()` se conserva para otros consumidores potenciales.
- **Compatibilidad**: si el nuevo componente falla, `getAll()` sigue
  disponible. La pantalla puede revertirse al `AppSelectField` no paginado revirtiendo un solo import.
- **Rollback**: revertir el cambio en `new-visita-selector-screen.tsx` para usar `getAll()` como antes. Los métodos nuevos del repositorio no tienen consumidores y no causan efectos laterales si quedan sin uso.

## Criterios de aceptación

- [ ] CA-001: `searchByName("garcia", 10, 0)` devuelve hasta 10 productores
  activos cuyo nombre, apellido o documento contenga "garcia".
- [ ] CA-002: `countByName("garcia")` devuelve el total exacto de productores
  activos que coinciden con "garcia".
- [ ] CA-003: Al abrir el selector con 600 productores activos, se muestran
  solo los primeros 10 y el scroll carga más.
- [ ] CA-004: Al escribir "martinez" en el campo de búsqueda, se reinicia a
  página 1 y se muestran solo productores que contengan "martinez".
- [ ] CA-005: Si no hay coincidencias, se muestra `emptyMessage` sin intentar
  cargar más.
- [ ] CA-006: El selector existente sin prop `paginated` funciona exactamente
  igual que antes (retrocompatibilidad).
- [ ] CA-007: El productor seleccionado se refleja correctamente en el
  formulario de nueva visita.

## Pruebas

- Unitarias: `searchByName` y `countByName` en repositorio con datos seed.
- Integración: selector paginado en `new-visita-selector-screen.tsx` con mock
  del repositorio.
- Manual: scroll infinito con 100+ productores en dispositivo real o emulador.
- Regresión: `AppSelectField` sin paginación en otros consumidores.

## Impacto documental

- [ ] Arquitectura mobile: actualizar `docs/architecture/mobile-offline-sync.md`
      si el cambio afecta el ciclo de catálogos.
- [x] No requiere ADR (no es decisión arquitectónica).
- [x] No requiere cambios en variables de entorno ni despliegue.
