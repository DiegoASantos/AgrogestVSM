---
title: Exportacion protegida para Cost-Build
status: implemented
numero: 014
area: api, database, seguridad, integraciones, productores, parcelas, catalogos
created: 2026-07-08
approved_by: usuario CLI
implemented_in: apps/api/src/modules/integraciones; apps/api/src/database/migrations/029-cost-build-public-ids.ts; apps/api/src/config; render.yaml; docs/architecture/overview.md; docs/domain/data-model.md; docs/domain/cultivos.md; docs/operations/security-baseline.md; docs/runbooks/deploy-api-render.md
---

# Spec 014: Exportacion protegida para Cost-Build

## Contexto

Cost-Build necesita consumir datos maestros de AgroGest VSM para ingresarlos en
su propia base de datos. El ingreso y transformacion final queda fuera de
AgroGest; este cambio solo expone una lectura protegida desde la API.

Las entidades evaluadas para integracion son:

- cultivos;
- variedades;
- campanias;
- productores;
- sectores;
- subsectores;
- parcelas.

Cost-Build espera identificar el origen de cada registro con:

- `sistema_origen = "AGROGEST_VSM"`;
- `id_origen = publicId`.

Actualmente productores, subsectores y parcelas ya tienen `public_id`.
`cultivos`, `variedades`, `campanias` y `sectores` no lo tienen, por lo que
requieren una migracion aditiva compatible antes de exponerlos como origen
estable.

## Alcance

### Incluido

- Agregar `public_id uuid NOT NULL DEFAULT gen_random_uuid()` a las tablas
  `cultivos`, `variedades`, `campanias` y `sectores`.
- Agregar constraints `UNIQUE` para los `public_id` nuevos.
- Alinear entidades TypeORM de esas cuatro tablas.
- Crear un endpoint unificado de solo lectura para Cost-Build.
- Proteger el endpoint con API key de integracion, no con sesion de usuario.
- Exponer todos los campos necesarios para Cost-Build en productores,
  incluyendo tipo de documento como texto, numero de documento, nombres,
  apellidos, telefono, email y direccion.
- Exponer campos de catalogos, territorio y parcelas necesarios para reconstruir
  relaciones por `publicId`.
- Registrar variable de entorno en `.env.example` sin incluir valores reales.
- Agregar pruebas de migracion, autorizacion y forma basica de respuesta.

### Excluido

- Crear, actualizar o eliminar datos desde Cost-Build.
- Ejecutar migraciones contra produccion desde la IA.
- Guardar la API key real en Git, tests, logs o documentacion.
- Cambiar los endpoints existentes de AgroGest.
- Reemplazar los `id` internos usados por admin web o mobile.
- Sincronizar estos `public_id` nuevos hacia SQLite mobile en este cambio.
- Crear tablas de control de sincronizacion en AgroGest.

## Requisitos

- RF-001: La API debe exponer un endpoint unificado `GET
  /integraciones/cost-build/export`.
- RF-002: El endpoint debe devolver datos de cultivos, variedades, campanias,
  productores, sectores, subsectores y parcelas.
- RF-003: Cada registro exportado debe incluir `sistema_origen:
  "AGROGEST_VSM"` e `id_origen` igual al `publicId` de AgroGest.
- RF-004: La respuesta debe incluir `publicId` y conservar `id` interno solo
  cuando sea necesario para compatibilidad tecnica interna del payload.
- RF-005: Productores debe exponer tipo de documento como texto, no solo
  `tipo_documento_id`.
- RF-006: El endpoint debe ser de solo lectura y no debe modificar datos ni
  estado de sincronizacion.
- RF-007: El endpoint debe rechazar requests sin API key o con API key invalida.
- RF-008: La API key debe leerse desde variable de entorno y nunca hardcodearse.
- RNF-001: La migracion debe ser expansiva y compatible con codigo anterior.
- RNF-002: La respuesta debe ser deterministica por orden estable de cada
  entidad.
- RNF-003: El endpoint puede exponer datos personales porque el usuario lo
  autorizo para esta integracion, pero solo bajo API key valida.

## Contratos afectados

- PostgreSQL:
  - `cultivos.public_id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE`;
  - `variedades.public_id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE`;
  - `campanias.public_id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE`;
  - `sectores.public_id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE`.
- API:
  - nuevo `GET /integraciones/cost-build/export`;
  - header requerido `x-api-key`;
  - respuesta agrupada por entidad en `snake_case`, alineada con Cost-Build.
- Configuracion:
  - nueva variable `COST_BUILD_API_KEY`.
- Mobile/admin:
  - no cambia contrato existente ni almacenamiento SQLite.

## Seguridad y datos

El endpoint cruza una frontera de confianza porque permite lectura masiva de
catalogos, parcelas y datos personales de productores. La proteccion minima
aprobada es una API key exclusiva para Cost-Build.

Controles obligatorios:

- El endpoint debe estar marcado como publico solo frente al guard JWT global,
  pero protegido por un guard propio de API key.
- La API key se valida contra `COST_BUILD_API_KEY`.
- Si `COST_BUILD_API_KEY` no existe o esta vacia, el endpoint debe rechazar la
  solicitud.
- No registrar la API key recibida ni el valor esperado.
- No incluir la API key real en `.env.example`, tests, spec o logs.
- Recomendar rotacion de la clave si se compartio por canales no seguros.

Datos personales expuestos:

- tipo de documento en texto;
- numero de documento;
- nombres;
- apellidos;
- telefono;
- email;
- direccion.

La exposicion fue solicitada explicitamente para que Cost-Build pueda poblar su
base. El acceso queda restringido al poseedor de la API key.

## Migracion y rollback

### Avance

1. Tomar backup antes de aplicar en produccion.
2. Verificar que `pgcrypto` esta disponible porque se usa `gen_random_uuid()`.
3. Agregar `public_id` con default a `cultivos`, `variedades`, `campanias` y
   `sectores`.
4. Crear constraints unique idempotentes para cada `public_id`.
5. Desplegar entidades TypeORM alineadas.
6. Configurar `COST_BUILD_API_KEY` en el entorno de la API.
7. Desplegar el endpoint de exportacion.
8. Verificar que requests sin API key devuelven 401 y con API key valida
   devuelven las siete colecciones.

### Rollback operativo

- Si falla el endpoint sin afectar datos, revertir el deploy de API y mantener
  las columnas `public_id`; son aditivas y no rompen codigo anterior.
- Si se decide retirar la integracion:
  1. eliminar o vaciar `COST_BUILD_API_KEY` en el entorno;
  2. revertir el modulo de integracion;
  3. conservar columnas `public_id` salvo que una ventana posterior apruebe una
     contraccion.
- No se recomienda dropear `public_id` en rollback inmediato porque otros
  sistemas podrian haber persistido esos identificadores.

## Criterios de aceptacion

- [x] CA-001: La migracion agrega `public_id` y unique constraints a las cuatro
  tablas faltantes.
- [x] CA-002: Las entidades TypeORM de cultivos, variedades, campanias y
  sectores declaran `publicId`.
- [x] CA-003: `GET /integraciones/cost-build/export` sin API key devuelve 401.
- [x] CA-004: `GET /integraciones/cost-build/export` con API key invalida
  devuelve 401.
- [x] CA-005: `GET /integraciones/cost-build/export` con API key valida devuelve
  `sistema_origen` e `id_origen` por registro.
- [x] CA-006: Productores incluye tipo de documento como texto y los datos
  personales aprobados.
- [x] CA-007: El endpoint no requiere JWT de usuario ni rol admin.
- [x] CA-008: `.env.example` documenta `COST_BUILD_API_KEY` sin valor real.
- [x] CA-009: La documentacion activa registra la integracion y su variable.

## Pruebas

- unitarias:
  - guard de API key;
  - mapper/servicio de exportacion;
- integracion ligera:
  - controlador rechaza requests sin API key o con API key invalida;
  - controlador acepta API key valida;
- migracion:
  - test de SQL de migracion;
- validacion manual:
  - configurar `COST_BUILD_API_KEY` en entorno local/staging;
  - llamar endpoint con y sin header `x-api-key`;
  - verificar conteos y campos sensibles esperados.

## Impacto documental

- [x] Arquitectura: documentar endpoint de integracion si queda permanente.
- [x] Dominio: actualizar cultivos/modelo de datos con `publicId` de catalogos.
- [x] Runbook: registrar variable y verificacion de integracion.
- [x] ADR: no aplica; es extension de patrones existentes.
- [x] Variables o despliegue: documentar `COST_BUILD_API_KEY`.
