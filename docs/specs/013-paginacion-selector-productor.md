---
title: Paginación y búsqueda de productores en mobile y web
status: implemented
numero: "013"
area: mobile, admin-web, api
created: 2026-07-07
approved_by: usuario
implemented_in: apps/api/src/modules/productores; apps/admin-web/src/modules/productores; apps/mobile/src/modules/productores; apps/mobile/src/shared/components/app-paginated-select-field.tsx; apps/mobile/src/modules/visitas-campo/presentation/screens/new-visita-selector-screen.tsx
---

# Spec 013: Paginación y búsqueda de productores en mobile y web

## Contexto

Se esta subiendo la data de ~602 productores. El selector de
productor en la pantalla de nueva visita (`new-visita-selector-screen.tsx`) carga todos los productores en memoria mediante `productoresService.getAll()` sin paginación ni virtualización. El
componente `AppSelectField` renderiza todas las opciones con `.map()` dentro de un contenedor, lo que:

1. Degrada el rendimiento al abrir el dropdown con cientos de opciones.
2. Sobrecarga innecesariamente la memoria del dispositivo.
3. Dificulta la navegación del usuario para encontrar un productor específico, incluso con el filtro cliente-side actual.

Ya se aplicó el filtro de productores activos (`is_active = 1`) en el
repositorio SQLite, lo que reduce el dataset. Sin embargo, la cantidad de activos sigue siendo lo bastante alta para justificar paginación puesto que los activos son 308.

El panel web también debe mostrar productores en páginas de 10 filas. En esta
entrega el alcance se enfoca en productores; la reutilización para otros
listados o selectores queda como criterio de diseño posterior, no como
implementación amplia.

## Alcance

### Incluido

- Nuevo método `searchByName(query, limit, offset)` en
  `productores.repository.ts` que busque productores activos cuyo nombre, apellido o documento coincida con el texto ingresado.
- Nuevo método `countByName(query)` que devuelva el total de coincidencias para control de paginación.
- Exposición de ambos métodos en `productores.service.ts`.
- Componente mobile paginado, retrocompatible con los selectores existentes, que:
  - Reciba `onSearch(query, page)` en vez de `options` estáticas.
  - Internamente use FlatList con ventana (`windowSize` `maxToRenderPerBatch`).
  - Soporte carga progresiva (scroll infinito hacia abajo).
  - Muestre indicador de carga al buscar o paginar.
- Integración del nuevo componente en `new-visita-selector-screen.tsx`
  reemplazando el `AppSelectField` del paso de productor.
- Filtros compatibles en `GET /productores` para que el admin web pueda pedir
  páginas de 10 filas con búsqueda y estado sin descargar todas las páginas.
- Listado web de productores con paginación de 10 filas.
- Tests unitarios para los nuevos métodos del repositorio.

### Excluido

- Extender la paginación a otros selectores (parcela, cultivo, etc.). Solo se aborda el selector de productor en este spec.
- Cambios en `visitas-history-screen.tsx`. No usa `getAll()`.
- Migraciones de SQLite. No se altera el esquema.
- Búsqueda acento-insensible. Se acepta `LIKE`/`LOWER` simple para evitar
  sobreingeniería en esta entrega.

## Requisitos

- RF-001: El repositorio mobile debe exponer `searchByName(query, limit, offset)` que
  devuelva solo productores activos (`is_active = 1`) cuyas columnas `first_name`,
  `last_name` o `document_number` contengan el texto de búsqueda con `LIKE`
  simple, insensible a mayúsculas/minúsculas.
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
- RF-007: El nuevo componente mobile paginado debe mantener el mismo contrato
  visual y de accesibilidad básico que la versión sin paginación (etiqueta,
  error, emptyMessage, helper).
- RF-008: Si no hay resultados para una búsqueda, mostrar `emptyMessage` sin
  intentar cargar más páginas.
- RF-009: El admin web debe listar productores con `limit=10`, controles de
  página y búsqueda aplicada desde el servidor.
- RF-010: `GET /productores` debe aceptar filtros opcionales compatibles:
  `search` y `activo`, además de `page` y `limit`.
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
| `GET /productores` | API query | Filtros opcionales `search` y `activo` |
| `ProductoresOverview` | Admin web | Paginación server-side de 10 filas |
| `AppPaginatedSelectField` | UI component mobile | Nuevo componente paginado |
| `new-visita-selector-screen.tsx` | Screen | Migrar a componente paginado |

No se modifican tipos compartidos ni se crean endpoints nuevos.

## Seguridad y datos

- No se exponen datos nuevos. Mobile busca sobre productores ya descargados en
  SQLite local; web consulta el endpoint autenticado existente.
- No hay riesgo de inyección SQL: las queries usan parámetros preparados de SQLite (`?` placeholders).
- El filtro `is_active = 1` ya está aplicado en `getAll()` y `getBySectorId()`. `searchByName` y `countByName` deben incluir la misma condición.

## Migración y rollback

- **Avance**: los nuevos métodos se agregan sin modificar los existentes (`getAll`, `getById`, `getBySectorId`). La pantalla de nueva visita migra al componente paginado. `getAll()` se conserva para otros consumidores potenciales. El admin web deja de descargar todas las páginas solo en el listado de productores.
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
- [ ] CA-008: El admin web muestra 10 productores por página y permite navegar
  con controles de paginación.
- [ ] CA-009: La búsqueda web de productores se aplica contra el total del
  servidor y no solo contra la página actual.

## Pruebas

- Unitarias: `searchByName` y `countByName` en repositorio con datos seed.
- Integración: selector paginado en `new-visita-selector-screen.tsx` con mock
  del repositorio.
- Manual: scroll infinito con 100+ productores en dispositivo real o emulador.
- Regresión: `AppSelectField` sin paginación en otros consumidores.
- API: `ProductoresService.findAll` con `search`, `activo`, `limit` y `page`.

## Impacto documental

- [ ] Arquitectura mobile: actualizar `docs/architecture/mobile-offline-sync.md`
      si el cambio afecta el ciclo de catálogos.
- [x] No requiere ADR (no es decisión arquitectónica).
- [x] No requiere cambios en variables de entorno ni despliegue.
