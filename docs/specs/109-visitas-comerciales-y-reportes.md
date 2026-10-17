---
title: Visitas comerciales, filtros de reportes y vista previa de receta
status: implemented
numero: 109
area: api, mobile, admin-web, database, sync, reportes
created: 2026-10-16
approved_by: usuario mediante "Implement the plan", 2026-10-16
implemented_in: PostgreSQL 073, SQLite 078, API visitas-comerciales/dashboard, mobile visitas-comerciales/receta, admin-web Visitas/Reportes/Dashboard
---

# Spec 109: Visitas comerciales y reportes

## Contexto

Las visitas técnicas actuales requieren parcela y datos agronómicos. Se necesita
registrar visitas comerciales breves sin productor registrado, consultarlas junto
con las técnicas y distinguir previsualización de impresión de receta en mobile.

## Alcance

### Incluido

- Selector Técnica/Comercial al iniciar visita, Técnica por defecto.
- Formulario, almacenamiento local y sincronización offline de visitas comerciales.
- Consulta y reporte comercial en mobile y web, filtros de tipo en Visitas,
  Reportes > Visitas y dos gráficos de dashboard.
- Excel técnico, comercial o general de dos hojas; PDF comercial individual de
  descarga directa desde web.
- Vista previa de PDF de receta separada de la impresión nativa.

### Excluido

- Crear productores, parcelas o campañas a partir de una visita comercial.
- Cambiar los datos o el flujo de las visitas técnicas existentes.

## Requisitos

- RF-001: El selector inicia en Técnica; Comercial abre una pantalla propia.
- RF-002: Comercial guarda tipo de sujeto `PERSONA`, `FUNDO`, `ASOCIATIVA` o
  `RECORREDOR`; nombres y apellidos para Persona/Recorredor, solo nombre para
  Fundo/Asociativa; descripción, fecha de captura de Lima y usuario autenticado.
  La fecha es de solo lectura en mobile.
- RF-003: Se intenta capturar ubicación puntual al guardar. Si falla, se informa
  y se guarda con ubicación nula, sin impedir la visita.
- RF-004: El registro local y la API usan un UUID público idempotente. La outbox
  conserva la operación hasta confirmación, incluso tras cierre de la app,
  desconexión y reintentos.
- RF-005: Mobile muestra las visitas comerciales en su historial y detalle, sin
  acciones de receta, evaluaciones ni geodatos de parcela.
- RF-006: En Visitas y Reportes > Visitas, General incluye ambas clases; Técnica
  y Comercial limitan el listado y el reporte. Los filtros de productor,
  parcela y campaña se usan solo en Técnica.
- RF-007: El Excel General tiene hojas Técnica y Comercial; los filtros de tipo
  individual generan el reporte correspondiente. La hoja técnica conserva su
  esquema. Comercial presenta tipo, nombre, fecha, descripción, agrónomo y
  coordenadas disponibles. El PDF comercial individual se descarga directamente.
- RF-008: Dashboard cuenta ambos tipos en Total de visitas y Visitas este mes.
  Visitas por fecha y por agrónomo ofrecen General por defecto, Técnica y
  Comercial. Hectáreas y campañas siguen siendo métricas técnicas.
- RF-009: Receta mobile ofrece Previsualizar reporte (abrir PDF) e Imprimir
  (diálogo nativo) como acciones separadas. Compartir mantiene su flujo.
- RNF-001: API obtiene el usuario del token, autoriza lectura y escritura por rol,
  valida tipo/longitud/fecha/ubicación y no registra descripción ni coordenadas
  en logs. Los agrónomos consultan sus registros; ADMIN/ANALISTA pueden consultar
  en web.

## Contratos afectados

- Nueva tabla PostgreSQL `visitas_comerciales` y tabla SQLite equivalente.
- Nuevo tipo outbox `visitas_comerciales` y endpoints de creación idempotente,
  consulta propia y consulta administrativa combinada.
- Parámetro de tipo `GENERAL|TECNICA|COMERCIAL` en consulta y reportes; ausencia
  del parámetro conserva comportamiento previo para clientes antiguos cuando
  corresponda.
- Respuestas web discriminadas por tipo para evitar tratar comerciales como
  visitas con parcela.

## Seguridad y datos

La ubicación y el nombre pueden identificar a una persona; solo usuarios
autenticados y roles autorizados pueden consultarlos. El agrónomo no puede
suplantar el usuario autor. Se limita tamaño de descripción y nombre. El PDF
se genera para descarga autenticada sin URL pública persistente.

## Migración y rollback

Migraciones aditivas en PostgreSQL y SQLite. Desplegar base/API antes de web y
mobile; clientes anteriores siguen usando endpoints y tablas técnicas. No se
borran pendientes de la outbox en rollback. Revertir web/mobile conserva
registros comerciales existentes; el rollback de API debe mantener lectura de
datos ya persistidos o restaurar la versión compatible. Verificar migración en
base vacía y existente con backup previo.

## Criterios de aceptación

- [x] CA-001: Técnica sigue funcionando y es la opción inicial.
- [x] CA-002: Comercial guarda los cuatro tipos con sus campos condicionales,
  fecha, autor y ubicación opcional.
- [ ] CA-003: Guardado offline, reinicio y reintento sincronizan una sola vez.
- [x] CA-004: Ambas vistas web filtran, exportan y muestran los datos de cada
  tipo; General produce dos hojas y el PDF comercial descarga un archivo.
- [x] CA-005: Dashboard coincide con los conteos por tipo y General es la suma.
- [ ] CA-006: La vista previa de receta no abre impresión; Imprimir sí.
- [x] CA-007: Toda consulta SQLite ejecuta las migraciones pendientes antes de
  devolver una conexión a pantallas o servicios.

## Pruebas

- Migraciones, DTO, autorización e idempotencia de API.
- SQLite/outbox: offline, reintento, reinicio, falta de GPS y propietario.
- Excel, PDF y agregaciones General/Técnica/Comercial.
- Lint, tipos, pruebas y build de los tres proyectos.

La implementación y las pruebas automatizadas de PDF, Excel, filtros, roles,
outbox y fuente de datos del dashboard están completas. CA-003 y CA-006
requieren una prueba física en Android/iOS; la migración 073 requiere smoke en
PostgreSQL/PostGIS porque Docker Desktop no estaba disponible durante esta
implementación. Estos controles quedan antes de distribuir mobile.

## Impacto documental

- [x] Dominio y modelo de datos.
- [x] Arquitectura de sincronización offline.
- [x] Índices de documentación y specs.
- [x] Riesgos y despliegue.
