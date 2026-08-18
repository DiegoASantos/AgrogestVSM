---
title: Fertilizantes por deficiencia nutricional
status: implemented
numero: "053"
area: mobile, api, database, sync, recetas, nutricion, reportes
created: 2026-08-18
approved_by: usuario, 2026-08-18
implemented_in: apps/api/src/database/migrations/052-fertilizacion-deficiencia-nutricional.ts; apps/api/src/modules/visita-recetas; apps/mobile/src/modules/visita-recetas; apps/mobile/src/shared/database/migrations.ts; apps/admin-web/src/modules/visitas, 2026-08-18
---

# Spec 053: Fertilizantes por deficiencia nutricional

## Contexto

La fertilizacion de una receta se registra como una lista plana de productos.
Esto impide identificar que fertilizantes se recomendaron para una deficiencia
nutricional concreta y obliga al tecnico a clasificar manualmente el enfoque.

## Alcance

### Incluido

- Agrupar visualmente la fertilizacion en una tarjeta por nutriente objetivo.
- Permitir uno o mas productos fertilizantes dentro de cada tarjeta.
- Clasificar automaticamente como curativa una tarjeta cuyo nutriente fue
  evaluado en la visita, incluso cuando su incidencia sea grado 0.
- Clasificar automaticamente como preventiva una tarjeta agregada desde receta
  para un nutriente del cultivo que no fue evaluado en la visita.
- Persistir el identificador del nutriente y una instantanea de su nombre en
  PostgreSQL y SQLite, usando filas de producto compatibles con el contrato
  actual.
- Exponer la relacion en API, sincronizacion, historial, PDF mobile y PDF web.
- Conservar legibles las recetas historicas sin nutriente asociado.

### Excluido

- Inferir o rellenar automaticamente el nutriente de recetas historicas.
- Crear un nuevo tipo de entidad en el outbox.
- Cambiar el catalogo o la composicion quimica de los fertilizantes.
- Permitir que una misma tarjeta mezcle los enfoques curativo y preventivo.

## Requisitos

- RF-001: Cada evaluacion nutricional produce una tarjeta curativa identificada
  por `nutrienteId`, aunque el grado calculado sea 0.
- RF-002: El enfoque se persiste internamente como `reactivo` por compatibilidad,
  pero la interfaz lo presenta como `Curativo`.
- RF-003: Una tarjeta preventiva solo puede apuntar a un nutriente activo del
  cultivo de la visita que no tenga una evaluacion en esa visita.
- RF-004: No puede existir mas de una tarjeta para el mismo nutriente y enfoque.
- RF-005: Cada tarjeta admite uno o mas productos y al guardar se serializa una
  fila por producto con el mismo nutriente, enfoque y factor.
- RF-006: El factor curativo se deriva del grado de la evaluacion; grado 3 sigue
  siendo editable. El factor preventivo es 1 y no es editable.
- RF-007: Si los hallazgos se actualizan, la clasificacion y el factor se
  reconcilian sin perder los productos ya ingresados.
- RF-008: Un producto puede aparecer en tarjetas distintas cuando atiende fines
  curativos y preventivos diferentes.
- RF-009: API valida existencia, vigencia, cultivo y coherencia entre evaluacion
  y enfoque cuando se recibe `nutrienteId`.
- RF-010: Clientes anteriores que omiten `nutrienteId` siguen siendo aceptados
  durante la ventana de compatibilidad.
- RF-011: Las recetas historicas sin relacion se muestran como `Deficiencia no
registrada` y nunca se asocian por posicion.
- RNF-001: El guardado offline conserva idempotencia y usa la operacion padre
  `visita_recetas` ya existente.
- RNF-002: La migracion es aditiva, nullable y no elimina datos pendientes.

## Contratos afectados

- `fertilizacion[]` agrega `nutrienteId?: string | null` y la respuesta agrega
  `nutrienteNombre?: string | null`.
- La consolidacion nutricional agrega `nutrienteId` estable.
- PostgreSQL `visita_receta_fertilizacion` agrega `nutriente_id` y
  `nutriente_nombre`.
- SQLite `visita_receta_fertilizacion` agrega las mismas columnas en snake_case.
- No cambia el tipo de operacion ni el orden padre-hijos del outbox.

## Seguridad y datos

El servidor obtiene el nombre canonico del catalogo y no confia en el nombre
enviado por el cliente. Se valida que el nutriente corresponda al cultivo de la
visita. No se incorporan datos personales ni permisos nuevos.

## Migracion y rollback

Avance: ejecutar primero la migracion PostgreSQL aditiva, desplegar la API
compatible y despues distribuir mobile/admin. SQLite migra localmente sin
recrear tablas. No se realiza backfill porque una inferencia por orden no es
confiable.

Rollback: la API y los clientes anteriores pueden ignorar las columnas nuevas.
La migracion `down` elimina indice, FK y columnas solo despues de retirar las
versiones que escriben la relacion; el rollback operativo preferido conserva
las columnas nullable.

## Criterios de aceptacion

- [x] CA-001: Boro evaluado aparece como tarjeta Curativa aun con grado 0.
- [x] CA-002: Una tarjeta permite agregar, editar y quitar varios fertilizantes.
- [x] CA-003: Un nutriente no evaluado puede agregarse como Preventivo y usa
      factor 1.
- [x] CA-004: Guardar, cerrar y reabrir conserva la agrupacion exacta offline.
- [x] CA-005: La sincronizacion y la API conservan ID y nombre del nutriente.
- [x] CA-006: Historial y PDFs muestran deficiencia, enfoque y productos.
- [x] CA-007: Una receta historica sin nutriente sigue siendo legible sin
      asociaciones inventadas.

## Pruebas

- Unitarias de clasificacion, agrupacion, serializacion y reconciliacion.
- Integracion de validaciones y respuesta de API.
- Migraciones PostgreSQL y SQLite desde la version anterior.
- Repositorio local y flujo offline-online.
- Render de historial y reportes.

## Impacto documental

- [x] Arquitectura.
- [x] Dominio.
- [ ] Runbook.
- [ ] ADR.
- [x] Variables o despliegue.
