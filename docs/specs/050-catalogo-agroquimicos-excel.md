---
title: Carga idempotente del catalogo agroquimico desde Excel
status: implemented
numero: "050"
area: api, postgresql, catalogos, mobile, offline
created: 2026-08-18
approved_by: usuario, 2026-08-18
implemented_in: apps/api/src/database/migrations/051-catalogo-agroquimicos-excel.ts
---

# Spec 050: Carga idempotente del catalogo agroquimico desde Excel

## Contexto

El archivo raiz `productos_agroquimicos_con_concentracion.xlsx` contiene 94
filas de productos fitosanitarios. La base de datos ha recibido altas despues
de las migraciones existentes, por lo que una carga estatica que asuma el
estado historico podria duplicar o sobrescribir informacion vigente.

El analisis del archivo obtiene 91 combinaciones unicas de nombre comercial y
tipo de producto. Sus 49 etiquetas normalizadas de ingredientes se resuelven en
45 identidades canonicas despues de unificar aliases equivalentes. Cinco nombres
aparecen con mas de un uso fitosanitario; esa repeticion es valida y fue
confirmada por el usuario.

## Alcance

### Incluido

- agregar una migracion PostgreSQL idempotente con los productos e ingredientes
  activos faltantes;
- comparar contra el estado real de la base al ejecutar la migracion;
- considerar un producto distinto por la combinacion normalizada de nombre
  comercial y tipo fitosanitario;
- resolver aliases de ingredientes activos sin crear una fila por cada tipo;
- completar campos vacios de una marca existente sin reemplazar valores ya
  informados;
- registrar pruebas de unicidad, multiuso, idempotencia y rollback operativo;
- documentar el consumo mobile del catalogo mediante el mecanismo existente.

### Excluido

- ejecutar la migracion contra produccion;
- modificar el archivo Excel o depender de el durante el arranque de la API;
- agregar columnas para las URL de fuente incluidas en el archivo;
- cambiar endpoints, contratos HTTP, SQLite, outbox o reconciliacion mobile;
- borrar, desactivar o reactivar registros existentes.

## Requisitos

- RF-001: la migracion debe incluir las 91 combinaciones unicas
  nombre-comercial--tipo derivadas de las 94 filas del archivo.
- RF-002: `CROPS-CANELA`, `GOLDEN NATUR´L OIL`, `K'NELAZO-AG`,
  `NIMBIOL 0.1% CE` y `TRICOX` deben conservar sus dos tipos.
- RF-003: la existencia de una marca se determina mediante nombre y tipo
  normalizados, no solo por nombre.
- RF-004: un ingrediente activo existente se reutiliza comparando su nombre
  normalizado y los aliases declarados por la migracion.
- RF-005: un registro existente conserva ingrediente, concentracion y unidad
  cuando esos campos ya contienen datos; solo se completan valores nulos.
- RF-006: una marca existente sin tipo solo puede recibirlo si el archivo
  contiene un unico tipo para ese nombre. Para marcas multiuso no se adivina el
  tipo del registro legado.
- RNF-001: la ejecucion repetida debe ser idempotente frente a datos incorporados
  antes o despues de esta implementacion.
- RNF-002: la migracion no debe contener borrados de catalogos ni reactivaciones.
- RNF-003: los clientes mobile anteriores deben seguir descargando los catalogos
  con el contrato vigente.

## Contratos afectados

No cambia el contrato HTTP ni el esquema. Se cargan datos en
`tipos_producto_fitosanitario`, `ingredientes_activos` y `marcas_producto`.
Mobile continuara descargando y reconciliando estos catalogos mediante el flujo
actual; no se agrega una migracion SQLite ni un tipo de outbox.

## Seguridad y datos

La migracion no contiene credenciales ni datos personales. El archivo se usa
como fuente de preparacion y no se modifica. La IA no consulta ni ejecuta
operaciones contra produccion: la comparacion con los datos actuales ocurre
dentro de la transaccion de migracion del entorno autorizado.

## Migracion y rollback

La migracion crea tablas temporales con aliases y productos, resuelve tipos e
ingredientes contra el estado actual, completa solo campos nulos e inserta las
combinaciones nombre--tipo que no existan.

El rollback es operativo y hacia adelante: detener el despliegue, respaldar los
catalogos y corregir o desactivar administrativamente las filas afectadas. No se
eliminan automaticamente semillas porque pueden quedar referenciadas por
recetas o por datos sincronizados desde mobile.

## Criterios de aceptacion

- [x] CA-001: existen 91 combinaciones fuente unicas por nombre y tipo.
- [x] CA-002: las cinco marcas multiuso conservan ambos tipos.
- [x] CA-003: una segunda ejecucion no agrega productos ni ingredientes
      duplicados.
- [x] CA-004: datos actuales no nulos no son sobrescritos ni reactivados.
- [x] CA-005: los aliases de composiciones equivalentes resuelven un ingrediente
      canonico.
- [x] CA-006: la API compila y las pruebas focalizadas de migracion pasan.
- [x] CA-007: se documentan compatibilidad mobile y rollback no destructivo.

## Pruebas

- unitarias sobre cantidad, unicidad, aliases y marcas multiuso;
- inspeccion del SQL para comprobar comparaciones normalizadas y ausencia de
  borrados;
- typecheck y pruebas focalizadas de la API;
- validacion documental y `git diff --check`;
- aplicacion primero en un entorno no productivo autorizado antes de produccion.

La validacion del bootstrap completo se intento el 2026-08-18 y se detuvo en la
migracion historica 001 por el riesgo conocido R-001, antes de ejecutar la 051.
La suite completa de API, las pruebas de migraciones, typecheck, lint, build y
la comparacion exacta de la instantanea con el Excel quedaron correctas.

## Impacto documental

- [x] Arquitectura.
- [x] Dominio.
- [x] Runbook.
- [ ] ADR.
- [ ] Variables o despliegue.
