---
title: Avisos de visitas repetidas y continuidad de productores
status: implemented
numero: 099
area: mobile, api, database, visitas-campo, productores, seguridad
created: 2026-10-12
approved_by: usuario mediante instruccion "Implement the plan", 2026-10-12
implemented_in: apps/api/src/modules/productores/application/seguimiento-productores.service.ts y apps/mobile/src/modules/home/presentation/screens/home-screen.tsx, 2026-10-12
---

# Spec 099: Avisos de visitas repetidas y continuidad de productores

## Contexto

Una parcela puede tener mas de una visita el mismo dia sin que la app recuerde
la anterior. Los productores persona sin visitas recientes tampoco tienen un
aviso de continuidad. Ambos avisos son informativos y no deben bloquear el uso.

## Alcance

### Incluido

- Aviso al iniciar otra visita del mismo dia a la misma parcela, con prioridad
  visual para continuar o consultar la anterior y opcion de crear una nueva.
- Recordatorio en Inicio para productores `persona` asignados que cumplan 45 dias
  sin visita a ninguna parcela, independientemente de agronomo o campania.
- Respuesta `si` compartida globalmente y baja de solo las parcelas asignadas al
  usuario que responde `no`.

### Excluido

- Recordatorios a fundos y cooperativas.
- Descarga o edicion entre dispositivos de visitas que no existen localmente.
- Baja automatica, notificaciones push y bloqueos para registrar visitas.

## Requisitos

- RF-001: Antes de abrir el formulario, consultar visitas activas de la parcela
  con fecha calendario actual de Peru. Preferir una visita local abierta; una
  cerrada se puede consultar. Siempre permitir crear otra.
- RF-002: El aviso remoto de una visita no disponible localmente solo informa;
  nunca ofrece editarla en este dispositivo.
- RF-003: La API calcula el vencimiento desde la fecha mas reciente entre alta
  del productor, ultima visita activa en cualquier parcela y ultima respuesta
  `si`; vence al cumplirse 45 dias calendario en America/Lima.
- RF-004: Inicio muestra un recordatorio ligero por vez, que se puede aplazar
  para esta sesion. Solo se consulta con conexion efectiva.
- RF-005: `si` guarda una confirmacion global. `no` exige confirmacion visible y
  desactiva solo parcelas activas asignadas al agronomo que responde. El estado
  del productor sigue derivado de todas sus parcelas.
- RNF-001: Los endpoints exigen autenticacion, rol AGRONOMO y acceso a parcelas
  asignadas; la respuesta no revela productores ajenos.
- RNF-002: Una falla de consulta o respuesta no bloquea Inicio ni el registro.
- RNF-003: La migracion PostgreSQL es aditiva y no modifica visitas existentes.

## Contratos afectados

- `GET /productores/seguimiento-pendiente` devuelve productores persona vencidos
  asignados al agronomo, con ID, nombre y fecha base.
- `POST /productores/:id/seguimiento` recibe `{ decision: "si" | "no" }`.
- `GET /visitas-campo/parcela/:id/visitas-hoy` devuelve solo si existe alguna
  visita activa de hoy, para la parcela asignada.
- PostgreSQL agrega columna de ultima confirmacion `si` por productor. No cambia
  SQLite ni outbox; las respuestas requieren conexion.

## Seguridad y datos

La API toma la identidad del JWT, comprueba asignacion y filtra resultados. La
respuesta `no` se ejecuta en transaccion y no modifica parcelas de terceros.
No se escriben nombres, documentos o tokens en logs nuevos.

## Migracion y rollback

Agregar columna de confirmacion, indice de consultas de visitas por parcela y
fecha y mantener la API anterior compatible. Ante rollback de codigo, conservar
la columna y sus datos; para revertir bajas empresariales, reactivar las parcelas
afectadas mediante operacion auditada tras revisar su estado. No ejecutar una
inversa SQL automatica sobre datos de negocio.

## Criterios de aceptacion

- [x] CA-001: Una segunda visita del dia muestra la anterior y permite crear otra.
- [x] CA-002: Una visita remota no disponible localmente se anuncia sin ofrecer
  edicion remota.
- [x] CA-003: Una visita reciente a cualquier parcela evita el recordatorio.
- [x] CA-004: `si` reinicia el plazo global; `no` afecta solo las parcelas del
  usuario y recalcula el estado derivado.
- [x] CA-005: Sin conexion y ante errores, la app permite seguir trabajando.

## Pruebas

- unitarias de consulta, autorizacion y decisiones, y seleccion local de la
  visita del dia;
- integracion de endpoints y migracion en staging antes del despliegue;
- smoke mobile local, remoto y offline, con visitas abiertas/cerradas, en piloto.

Validacion del 2026-10-12: `pnpm check` aprobo 257 archivos y 2015 pruebas;
`pnpm build` y `pnpm test:coverage` correctos (61.93 % de sentencias). La
migracion 067 se aplico dos veces en PostgreSQL aislado. La prueba con TypeORM
real verifico el vencimiento, visita de hoy, acceso por asignacion, respuesta
`si` compartida y baja parcial por agronomo; detecto y permitio corregir el
formato de `UPDATE ... RETURNING`. La migracion no se aplico a una base
operativa y queda para el despliegue API previo a mobile. El smoke visual en
Android queda para el piloto.

## Impacto documental

- [x] Arquitectura mobile offline.
- [x] Modelo de dominio.
- [x] Riesgos.
