---
title: Reasignación controlada de parcelas entre agrónomos
status: approved
numero: 086
area: datos de producción y operación
created: 2026-09-29
approved_by: instrucción explícita del mantenedor el 2026-09-29
implemented_in:
---

# Spec 086: Reasignación controlada de parcelas entre agrónomos

## Contexto

El mantenedor solicita trasladar todas las parcelas actualmente asignadas a un
agrónomo de origen a otro agrónomo en producción. La asignación vigente reside
en `parcelas.agronomo_usuario_id`. Las visitas conservan el agrónomo que las
realizó y no forman parte del cambio.

## Alcance

### Incluido

- Identificar las dos cuentas por coincidencia exacta de nombres y apellidos y
  confirmar que cada búsqueda devuelve una sola cuenta.
- Respaldar fuera de la base de datos las filas completas de `parcelas` que
  pertenecen al origen, incluidas las parcelas inactivas, y un manifiesto de
  identificadores, asignación y fecha de actualización anterior.
- Verificar integridad del respaldo y ejecutar la reasignación en una única
  transacción, con comprobación de cantidad y conjunto de identificadores.
- Comprobar la asignación final y registrar el resultado operativo sin publicar
  datos personales, credenciales ni el contenido del respaldo.

### Excluido

- Cambiar el agrónomo histórico de las visitas, el propietario de las parcelas,
  productores o cualquier otra columna de negocio.
- Cambiar esquema PostgreSQL, API, SQLite o contratos entre aplicaciones.
- Restaurar automáticamente la base completa o sobrescribir cambios posteriores.

## Requisitos

- RF-001: solo las parcelas cuyo `agronomo_usuario_id` sea el ID único del
  origen al momento del bloqueo podrán actualizarse al ID único del destino.
- RF-002: la cuenta de destino debe estar activa y tener rol `AGRONOMO`, igual
  que exige la API para asignaciones individuales.
- RF-003: el respaldo debe contener todas las columnas de las parcelas
  seleccionadas y un manifiesto suficiente para revertir sus asignaciones.
- RF-004: el proceso debe abortar si hay cuentas ambiguas, ningún resultado
  inesperado, error de respaldo, cambio concurrente o diferencia de conteos.
- RNF-001: el respaldo debe quedar fuera de Git, con acceso restringido, hash
  SHA-256 y prueba de lectura antes de ejecutar la actualización.
- RNF-002: la operación debe ser atómica y ejecutarse en una ventana coordinada
  con usuarios móviles que puedan tener datos pendientes sin sincronizar.

## Contratos afectados

No cambia el contrato. Cambia únicamente `parcelas.agronomo_usuario_id` y su
`updated_at` para las filas seleccionadas. La visibilidad de parcelas y
productores para cada agrónomo cambia por las reglas vigentes de la API.

## Seguridad y datos

- Ejecutar con acceso autorizado y mínimo privilegio en la base de producción
  identificada por nombre, host y contenedor antes de cualquier escritura.
- Mantener nombres reales, IDs de usuarios, geometrías y respaldo fuera de
  documentación versionada y de logs públicos.
- Verificar si existen operaciones móviles pendientes de la cuenta de origen;
  coordinar su sincronización antes de retirar acceso a las parcelas.
- Custodiar el archivo de respaldo con permisos restrictivos y copia cifrada
  según la política operativa.

## Migración y rollback

1. Confirmar entorno y cuentas únicas; obtener cantidad e IDs de parcelas
   asignadas al origen, incluidas las inactivas.
2. Restringir escrituras concurrentes durante la ventana, crear el respaldo
   de las filas afectadas, comprobar que se puede leer y registrar hash.
3. En una transacción, validar otra vez origen, destino y conjunto de parcelas,
   bloquear las filas y actualizar solo la asignación y `updated_at`.
4. Confirmar que el destino posee todas las parcelas previstas, el origen ya no
   posee ninguna de ese conjunto y las visitas históricas no cambiaron.
5. Si falla la transacción, revertirla. Si hay que deshacer después del commit,
   usar el manifiesto para restaurar la asignación anterior solo tras verificar
   que ninguna fila fue reasignada o editada posteriormente; en caso contrario,
   reconciliar manualmente sin pisar cambios nuevos.

## Criterios de aceptación

- [ ] CA-001: ambas cuentas son únicas y el destino cumple las reglas de rol y estado.
- [ ] CA-002: existe un respaldo legible y verificable de cada parcela afectada.
- [ ] CA-003: la cantidad e IDs respaldados coinciden con los actualizados.
- [ ] CA-004: ninguna parcela fuera del conjunto cambió de agrónomo.
- [ ] CA-005: las visitas previas conservan sus datos.
- [ ] CA-006: existe un procedimiento verificable para restaurar la asignación previa.

## Pruebas

- Consultas de preflight de entorno, cuentas, rol, cantidad e IDs.
- Lectura del respaldo y comprobación SHA-256.
- Consultas de conteo y comparación de IDs antes y después de la transacción.
- Comprobación de que la cantidad de visitas por agrónomo histórico no varió.

## Impacto documental

- [ ] Registrar el resultado de la operación en la spec y el índice al concluir.
- [ ] Actualizar el registro de riesgos solo si aparece un riesgo nuevo.
- [ ] No se prevén cambios en arquitectura, dominio, contrato o runbooks vigentes.
