---
title: Visitas comerciales vinculadas a productores y fotos de acreedores
status: implemented
numero: 118
area: mobile, api, admin-web, database, sync, seguridad
created: 2026-10-21
approved_by: usuario mediante «Implement the plan», 2026-10-21
implemented_in: apps/mobile (visitas comerciales, comercial, selector tecnico, SQLite y sync); apps/api (comercial, productores, visitas comerciales y migraciones 076-078); apps/admin-web (visitas y acreedores); docs; working tree 2026-10-21, sin commit ni despliegue
---

# Spec 118: Visitas comerciales vinculadas a productores y fotos de acreedores

## Contexto

La visita comercial registra nombres libres sin crear ni reutilizar productores y no
admite evidencia fotográfica. Comercial guarda fotos generales del productor sin
identificar al acreedor. El selector técnico permite crear productores, pero no
ofrece una acción directa para agregar una parcela al productor seleccionado.
El usuario pidió resolver estos flujos con el menor número de pasos.

Esta spec reemplaza el borrador 114 y conserva sus requisitos de privacidad,
durabilidad, permisos e idempotencia para fotos de visita.

## Alcance

### Incluido

- Buscar productores visibles al agrónomo y los creados por él aun sin parcela,
  seleccionar uno o crearlo desde el formulario comercial.
- Tipos propios Persona, Fundo, Asociación, Cooperativa y Recorredor en el
  catálogo de productores. Persona y Recorredor llevan apellidos; los demás,
  solo nombre.
- Asociar cada visita comercial nueva a un productor, con fotos de evidencia
  opcionales y múltiples, cámara/galería, vista previa y descarte.
- Fotos de Comercial > Acreedores vinculadas a identidad de acreedor con nombres,
  apellidos, tipo y número de documento obligatorios. Banco y cuenta pueden
  completarse luego en mobile o admin web; hasta entonces no se aprueba ni paga.
- Si el acreedor es el productor persona, completar obligatoriamente el documento
  ausente y actualizar el productor al guardar la identidad del acreedor.
- Acción directa «Crear parcela» para el productor seleccionado al iniciar visita
  técnica, conservando la selección al volver.

### Excluido

- OCR, reconocimiento de identidad, PDF/Excel con imágenes y cambios a las fotos
  de visitas técnicas.
- Publicar imágenes sin autenticación, operar producción o distribuir una build.

## Requisitos

- RF-001: El selector comercial busca en el catálogo local propio. Un alta nueva
  guarda productor, visita y operaciones outbox sin dejar una visita huérfana;
  los datos básicos son tipo y nombre, más apellidos para Persona/Recorredor.
- RF-002: Los productores creados por el usuario son visibles en visitas
  comerciales y acreedores sin exigir parcela. Un agrónomo no ve los creados
  por otra persona salvo asignación por parcela.
- RF-003: Fotos de visita opcionales, hasta diez por selección, JPEG normalizado
  sin EXIF, 1 byte a 10 MiB, almacenadas cifradas y sincronizadas tras su visita.
  Se muestran en detalle mobile y web con estados y reintento.
- RF-004: Foto de acreedor exige identidad validada y vínculo inequívoco con ese
  acreedor. Un perfil incompleto carece de banco/cuenta, no se aprueba ni se usa
  en cosecha o pagos. Puede completarse desde mobile y web.
- RF-005: Al elegir «El acreedor es el productor» persona, los campos existentes
  se precargan; tipo y número de documento faltantes se exigen y se actualizan
  en la fila del productor. No sustituir datos existentes distintos sin resolver
  el conflicto de identidad.
- RF-006: Los botones «Nuevo productor» y «Crear parcela» son acciones distintas
  en el selector técnico. «Crear parcela» usa el productor seleccionado; si aún
  no tiene parcela, sigue seleccionado aunque se cierre el aviso.
- RNF-001: SQLite y outbox guardan solo metadatos de imágenes. Los archivos son
  privados y cifrados; selección, cuenta, reintento y limpieza respetan al dueño.
- RNF-002: Las operaciones padre-hijo esperan productor → visita/acreedor → foto.
  IDs públicos estables evitan duplicados tras respuesta perdida o reinicio.

## Contratos afectados

- Productores: ampliar enum y CHECK de `entidad`, visibilidad para autor sin
  parcela, actualización autenticada y sincronización de documento.
- Visitas comerciales: ampliar tipo con `COOPERATIVA`, agregar `productor_id`
  nullable para historia y requerido para nuevas altas mobile. Mantener los
  campos de nombre como captura histórica y exportación compatible.
- Fotos de visita: endpoints autenticados de alta idempotente por UUID, lista
  paginada y contenido privado, con permisos del dueño/Admin/Analista.
- Acreedores: estado `INCOMPLETE`, banco/cuenta nullable solo en ese estado;
  completar identidad financiera devuelve `PENDING`. Fotos nuevas referencian
  acreedor, con ID público estable y acceso privado auditado. Fotos antiguas sin
  vínculo siguen consultables como generales del productor.
- SQLite: migraciones aditivas/reconstrucción transaccional donde los CHECK lo
  exijan, conservando IDs, outbox, errores y filas existentes.

## Seguridad y datos

La API verifica productor, visita, acreedor, autor y rol en cada escritura y
lectura. El token determina al autor. Solo AGRONOMO escribe imágenes propias;
ADMIN/ANALISTA consultan. Validar UUID, contenido JPEG, límites, pertenencia y
duplicados. No registrar imágenes, documentos, nombres, coordenadas ni claves.
Las imágenes siguen el cifrado privado de la spec 103. El HTTP del piloto sigue
siendo el riesgo R-059 registrado; no se amplía el acceso público.

## Migración y rollback

Desplegar expansión PostgreSQL y API antes de mobile/web. Clientes anteriores
siguen creando visitas sin vínculo y acreedores completos. Aplicar SQLite al
abrir; probar base vacía y actualización con pendientes. Ante fallo, revertir
clientes manteniendo columnas, fotos y outbox; preferir corrección hacia adelante
y no borrar registros pendientes. Verificar backup/restauración de metadatos,
volumen y clave antes de despliegue.

## Criterios de aceptación

- [x] CA-001: Productor existente o nuevo queda vinculado a la visita y visible
  para su creador sin parcela; los cinco tipos conservan su identidad.
- [x] CA-002: Visita sin imágenes se guarda; varias imágenes sobreviven offline,
  sincronizan una vez y se consultan con permisos en mobile y web.
- [x] CA-003: Foto de acreedor no se guarda sin identidad; el perfil incompleto
  se puede completar en mobile/web y antes no permite aprobación ni pagos.
- [x] CA-004: Productor acreedor sin documento exige ambos datos y la tabla
  productores se actualiza de forma recuperable al sincronizar.
- [x] CA-005: «Crear parcela» usa el productor seleccionado y retorna con la
  nueva parcela seleccionada sin registrar otro productor.
- [x] CA-006: Migraciones preservan datos antiguos y pendientes, y una segunda
  apertura o reintento no duplica productores, visitas, acreedores ni fotos.

## Pruebas

- DTO, servicios, guards, pertenencia, validación de JPEG/documentos y conflictos.
- SQLite vacío y migrado con outbox; red desconectada, reinicio, cambio de cuenta,
  respuesta perdida y reconciliación padre-hijo.
- Flujo móvil de los dos tipos de visita, alta/búsqueda/visibilidad, evidencia
  opcional, acreedor incompleto y actualización de documento.
- Panel: completar acreedor y consultar fotos; exclusión de incompletos en pagos.
- Lint, tipos y builds afectados; validación física Android/iPhone antes de distribuir.

## Validacion de implementacion

La implementacion y las pruebas automatizadas se completaron en el arbol de
trabajo. Se validaron SQLite real, pruebas de servicios, lint, tipos, builds de
API y panel, y `docs:check`. La prueba manual de camara, galeria y reconexion en
Android/iPhone fisicos queda pendiente antes de distribuir; no se hizo
despliegue. El riesgo de transporte HTTP sigue registrado en R-059; la revision
de este alcance no identifico otro riesgo operativo que requiera entrada nueva.

## Impacto documental

- [x] Arquitectura de sincronización y almacenamiento.
- [x] Dominio de productores, visitas, acreedores y fotos.
- [x] Runbooks de backup, despliegue y rollback.
- [x] Riesgos operativos pendientes.
