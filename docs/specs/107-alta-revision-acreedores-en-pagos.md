---
title: Alta y revisión de productores y acreedores desde pagos
status: implemented
numero: 107
area: api, admin-web, comercial, seguridad
created: 2026-10-14
approved_by: usuario mediante "Implement the plan", 2026-10-14
implemented_in: API Comercial y filtro de errores; admin-web Pagos, Mantenimiento y Productores; documentación de dominio y riesgos
---

# Spec 107: Alta y revisión de productores y acreedores desde pagos

## Contexto

Un pago completo requiere un acreedor aprobado. El formulario no permite crearlo
ni aprobarlo, y Mantenimiento muestra su estado sin acciones de revisión. Los
errores de validación del pago no identifican el campo incorrecto. Se requiere
resolver estas tareas sin perder el borrador del pago.

## Alcance

### Incluido

- Reutilizar los formularios web de productor y acreedor dentro de Nuevo pago.
- Buscar perfiles de acreedor por DNI/RUC completo entre productores y precargar
  campos editables; elegir coincidencia si hay varias.
- Aprobar u observar acreedores en Mantenimiento y aprobarlos explícitamente
  desde Nuevo pago, con la auditoría actual.
- Reproducir y corregir el rechazo del pago precargado desde Systrace y mostrar
  errores útiles sin exponer datos sensibles.

### Excluido

- Cambios de la app móvil, aprobación automática, despliegue y modificación de
  datos históricos de otros productores.

## Requisitos

- RF-001: El alta de productor desde Nuevo pago selecciona el productor creado
  y refresca los catálogos sin borrar cabecera ni detalles.
- RF-002: El modal de acreedor busca por tipo y número completos mediante cuerpo
  POST. Una coincidencia precarga sus datos; varias requieren selección. Los
  campos siguen editables. El formulario no consulta documentos incompletos.
- RF-003: Un perfil hallado de otro productor solo sirve como plantilla: guardar
  crea un perfil del productor actual y conserva el original. Un perfil del
  mismo productor se selecciona si no cambió o se actualiza si cambió.
- RF-004: Los perfiles nuevos o editados quedan PENDING. ADMIN/ANALISTA pueden
  aprobar explícitamente desde el pago o aprobar/observar desde Mantenimiento;
  la API conserva actor, fecha e historial. Solo APPROVED participa en pagos.
- RF-005: El formulario conserva su borrador al crear o revisar y permite
  seleccionar inmediatamente el acreedor aprobado.
- RF-006: Los errores de guardado indican sección, detalle y campo seguro; la
  API no devuelve valores de DNI, cuenta ni payloads financieros. Un fallo de
  persistencia no se presenta como error en los datos del acreedor; la falta de
  tabla o columna de pagos señala que el esquema del servidor requiere actualización.
- RNF-001: Búsqueda y revisión usan guard de API ADMIN/ANALISTA,
  Cache-Control no-store y no ponen documentos ni cuentas en URL o logs.

## Contratos afectados

- POST `comercial/mantenimiento/acreedores-cosecha/buscar-documento` con
  `{tipoDocumento,nroDocumento}` y respuesta de perfiles no fusionados.
- POST `comercial/mantenimiento/acreedores-cosecha/:id/revision` con el UUID
  público y `{decision,observation?}`; delega en la revisión auditada vigente.
- Los contratos de pago y creación de productor/acreedor conservan su formato.
  No cambia el esquema PostgreSQL ni SQLite.

## Seguridad y datos

Limitar la búsqueda a ADMIN/ANALISTA y documento completo. No escribir datos
bancarios, documento ni cuerpo de la petición en errores o logs. Presentar
solo nombres de campos y mensajes de reglas al reportar validación. Mantener
la aprobación explícita y las verificaciones de API antes del pago.

## Migración y rollback

No hay migración. API y web deben desplegarse juntos para la búsqueda y revisión
por UUID; los endpoints previos siguen disponibles. Rollback mediante el commit
estable anterior, sin revertir perfiles ni revisiones ya creados.

## Criterios de aceptación

- [x] CA-001: El contrato de pago Systrace válido con acreedor aprobado se acepta;
  el guardado transaccional conserva la regla existente. Queda pendiente un
  ensayo integrado contra el entorno desplegado con un caso real anonimizado.
- [x] CA-002: Un rechazo indica el campo o regla sin datos sensibles y no deja
  cabecera ni detalles parciales.
- [x] CA-003: Ambos modales se comparten entre Nuevo pago y sus vistas originales.
- [x] CA-004: La búsqueda entre productores conserva el perfil original y
  permite varias coincidencias.
- [x] CA-005: Aprobación y observación se delegan en la revisión auditada; solo
  APPROVED es seleccionable.

## Pruebas

- DTO y servicio de búsqueda, revisión por UUID, permisos y auditoría.
- Flujo de pago completo con recepción precargada, acreedor creado y aprobado.
- Rollback y mensaje de fallo por esquema desactualizado; fallos inesperados no
  se convierten en errores de captura del usuario.
- Lint, tipos, pruebas y build de API y admin-web; validación documental.

## Impacto documental

- [x] Dominio y flujo comercial.
- [x] Índices de specs y documentación.
- [x] Riesgos de validación y datos sensibles.
