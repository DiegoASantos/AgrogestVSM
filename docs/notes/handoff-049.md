# Handoff: Spec 049 - borradores persistentes de visitas mobile

## Identificacion

- fecha: 2026-08-18
- responsable: Codex
- spec o issue: Spec 049
- alcance del diff: persistencia y restauracion silenciosa de borradores para
  los siete formularios del flujo de visita, migracion SQLite 63, pruebas y
  documentacion
- criticidad: alta

## Objetivo

Evitar que el tecnico pierda datos todavia no guardados al navegar hacia atras,
volver al modulo o reiniciar la aplicacion, sin convertir el borrador en un
registro operativo ni sincronizarlo.

## Cambios realizados

- `visit-form-drafts.ts` y `use-visit-form-draft.ts`: repositorio aislado por
  usuario, serializacion versionada, debounce y vaciado por desmontaje o segundo
  plano.
- `schema.ts` y `migrations.ts`: tabla aditiva `visit_form_drafts` e indice en
  la migracion SQLite 63.
- pantallas de Datos, Plagas, Enfermedades, Nutricion, Riego, Labores y Receta:
  restauracion despues de los datos oficiales y limpieza tras guardado exitoso.
- repositorio de visitas: limpieza de todos los borradores al eliminar el
  agregado local.
- spec 049, arquitectura offline, seguridad y riesgos actualizados.

## Contratos y datos afectados

- API: sin cambios.
- PostgreSQL/PostGIS: sin cambios.
- SQLite/outbox: tabla local aditiva; sin nuevos tipos de sync ni escrituras en
  outbox.
- autenticacion y permisos: cada operacion usa el `publicId` de la sesion como
  propietario.
- variables y despliegue: sin variables ni codigo nativo; compatible con OTA
  del runtime actual.

## Validaciones ejecutadas

| Comando o prueba | Resultado |
| ---------------- | --------- |
| pruebas dirigidas de migracion, repositorio y Receta | 54/54 correctas |
| `pnpm lint` | correcto |
| `pnpm typecheck` | correcto |
| `pnpm test` | 196 archivos, 1497 pruebas correctas |
| `pnpm docs:check` | 107 documentos correctos |
| `pnpm build` | correcto en los seis proyectos |
| `git diff --check` | correcto |

## Disposicion de la primera revision

- REV-001, restauracion antes de hidratar la sesion: aceptado. Datos,
  Plagas/Enfermedades, Nutricion, Riego, Labores y Receta vuelven a cargar al
  cambiar `draftIdentity`.
- Validacion posterior: lint y typecheck mobile correctos, pruebas dirigidas
  38/38, suite global 1496/1496 y documentacion correcta.

## Disposicion de la revision final

- F-01, referencias obsoletas en Receta: aceptado y corregido. La restauracion
  conserva el resto del formulario, pero limpia selecciones ausentes de los
  catalogos vigentes y repara el orden de mezcla relacionado. Se agrego una
  prueba de regresion.
- F-02, cambio de identidad con escritura pendiente: aceptado y corregido. El
  hook conserva una instantanea de identidad y valor, y la vacia antes de
  adoptar la identidad nueva.
- F-03, borrador `new:` sin expiracion: no requiere cambio. RF-004 exige
  conservarlo hasta un guardado exitoso; la clave usuario-parcela se reutiliza
  y sobrescribe, por lo que no crece por cada intento abandonado.
- F-04, lectura SQLite sincrona: riesgo bajo aceptado. Es el patron vigente de
  los repositorios mobile y no se observo bloqueo en las pruebas; se controlara
  en el piloto de dispositivo junto con R-031.
- Validacion posterior: lint, tipos y build globales correctos; 54/54 pruebas
  dirigidas, 196 archivos y 1497 pruebas globales, y 107 documentos validos.

## Riesgos conocidos y exclusiones

- El cierre forzado real depende del lifecycle de Android; queda una validacion
  manual de dispositivo antes del release piloto, registrada como R-031.
- Los formularios de productor, parcela y alta de productos estan fuera del
  alcance.
- El chequeo global de Prettier falla sobre una deuda preexistente de cientos
  de archivos; no se reformatearon archivos ajenos.
- Revisar tambien los archivos no rastreados listados por `git status`, porque
  `git diff` no los incluye sin staging.

## Instrucciones al reviewer

- revisar unicamente el alcance descrito;
- no modificar archivos;
- citar archivo y linea;
- priorizar defectos reproducibles;
- devolver veredicto y hallazgos por severidad.
