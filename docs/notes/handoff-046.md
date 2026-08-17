# Handoff: concentraciones ampliadas y permiso para eliminar visitas

## Identificacion

- fecha: 2026-08-17
- responsable: Codex
- spec o issue: `docs/specs/046-concentraciones-ampliadas-permiso-eliminar-visitas.md`
- alcance del diff: API, migracion 050, admin web, mobile offline/sync y documentacion
- criticidad: alta

## Objetivo

Aceptar hasta 300 caracteres en las concentraciones de marcas de producto y
fertilizantes, y permitir que un administrador habilite individualmente a un
agronomo para eliminar desde mobile solo sus propias visitas.

## Cambios realizados

- PostgreSQL/API: concentraciones a `varchar(300)` y permiso
  `usuarios.puede_eliminar_visitas`, falso por defecto.
- API: permiso expuesto en usuarios y auth; baja de visitas autorizada por rol,
  permiso persistido y propiedad, con 404 para una visita ajena.
- Admin web: lectura y edicion del permiso solo para usuarios con rol
  `AGRONOMO`.
- Mobile: accion confirmada en detalle, baja remota previa para visitas
  sincronizadas y purga transaccional del agregado SQLite y sus metadatos.
- Sync: exclusion mutua entre procesamiento de outbox y eliminacion de visitas.
- Documentacion: spec, arquitectura offline, modelo de datos y baseline de
  seguridad.

## Contratos y datos afectados

- API: `canDeleteVisits` en usuarios y perfiles autenticados; autorizacion de
  `DELETE /visitas-campo/:id`.
- PostgreSQL/PostGIS: migracion aditiva 050 y ampliacion no destructiva de dos
  columnas.
- SQLite/outbox: sin cambio de esquema; purga fisica del agregado local, outbox
  y fallos asociados.
- autenticacion y permisos: API autoritativa; `ADMIN` siempre puede eliminar y
  `AGRONOMO` requiere permiso y propiedad.
- variables y despliegue: sin variables nuevas; migrar/API antes de admin y
  mobile.

## Validaciones ejecutadas

| Comando o prueba                          | Resultado |
| ----------------------------------------- | --------- |
| lint de API, mobile y admin web           | pasa      |
| typecheck de API, mobile y admin web      | pasa      |
| 9 archivos / 93 pruebas dirigidas         | pasa      |
| `pnpm test` (194 archivos / 1479 pruebas) | pasa      |
| `pnpm build`                              | pasa      |
| `pnpm docs:check`                         | pasa      |
| Prettier del diff y `git diff --check`    | pasa      |

## Riesgos conocidos y exclusiones

- No se ejecuto la migracion ni `db:smoke` contra PostgreSQL en esta tarea; se
  exige backup y smoke test antes del release.
- No se ejecuto deploy, OTA, APK ni pruebas E2E manuales de interfaz.
- El rollback conserva las concentraciones ampliadas y la columna aditiva para
  no truncar datos.

## Instrucciones al reviewer

- revisar unicamente el alcance descrito;
- no modificar archivos;
- citar archivo y linea;
- priorizar defectos reproducibles;
- devolver veredicto y hallazgos por severidad.
