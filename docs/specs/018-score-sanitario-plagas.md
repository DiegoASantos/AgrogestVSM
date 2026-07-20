---
title: Score sanitario independiente para Plagas
status: approved
numero: 018
area: visitas, sanidad, scoring, api, mobile, sync, database, geodata
created: 2026-07-19
approved_by: usuario, 2026-07-19
implemented_in:
---

# Spec 018: Score sanitario independiente para Plagas

## Contexto

AgroGest ya registra una calificación manual de cumplimiento por módulos
(specs 008 y 017). Ese indicador mide el cumplimiento de recomendaciones
previas y no mide directamente el estado sanitario observado. Se requiere un
score sanitario nuevo e independiente, iniciado exclusivamente en el paso o
módulo de Plagas, para reflejar la condición observada en cada visita.

La fuente existente de observaciones sanitarias ya relaciona cada plaga con la
visita y con niveles de incidencia y severidad. Una visita no tiene un estado
`completada`; por ello, el score solo existe cuando la visita está activa y el
técnico finaliza explícitamente el paso Plagas. Esta spec formaliza grados
enteros 0 a 3, reglas de captura y cálculo, además de la excepción para Mosca
de la Fruta. No se usa ni se almacena MTD.

## Alcance

### Incluido

- Score sanitario del módulo Plagas por visita, en escala entera `0..3`.
- Conversión de ese score a porcentaje y agregados sanitarios independientes
  por productor y por campaña, en escala `0..100`.
- Captura, validación y sincronización de incidencia, severidad y órganos
  afectados de plagas seleccionadas para una visita.
- Disponibilidad de plagas según la etapa fenológica de la visita.
- Regla geográfica de Mosca de la Fruta resuelta por la API.
- Ajustes de contratos, PostgreSQL, SQLite, outbox, migraciones, pruebas y
  documentación necesarios para implementar el cambio.

### Excluido

- Modificar, reemplazar, recalcular o mezclar las calificaciones manuales de
  cumplimiento y sus agregados.
- Extender el score sanitario a Enfermedades, Nutrición, Riego o Labores.
- Usar, calcular, migrar o almacenar MTD.
- Recalcular o completar datos históricos que no cuenten con grados sanitarios
  válidos.
- Cambiar roles, autenticación, la geometría de parcelas o los catálogos fuera
  de los campos mínimos requeridos por esta spec.

## Requisitos

### Funcionales

- RF-001: El score sanitario de Plagas de una visita es un entero entre 0 y 3.
  Los scores sanitarios de productor y campaña son porcentajes entre 0 y 100 e
  independientes de todo score manual de cumplimiento.
- RF-002: Mobile debe listar como seleccionables solo plagas activas cuyo
  catálogo esté asociado a la etapa fenológica de la visita. Cada tarjeta debe
  tener un control explícito `Evaluar plaga`; abrir o expandir una tarjeta no
  equivale a seleccionarla. Una plaga participa únicamente tras activar ese
  control; las no seleccionadas no participan del mínimo.
- RF-003: Al seleccionar una plaga, incidencia y severidad son obligatorias y
  se inicializan ambas en grado 0. Se permite severidad mayor que 0 con
  incidencia igual a 0. Si ambos grados son 0, no se registra ni se exige un
  órgano afectado; si alguno es mayor que 0, se exige al menos un órgano
  afectado válido.
- RF-004: Para cada plaga seleccionada, la nota base es
  `notaPlaga = 3 - max(gradoIncidencia, gradoSeveridad)`.
- RF-005: El score sanitario del módulo Plagas es `null` hasta que el técnico
  finalice explícitamente el paso Plagas. Tras esa finalización, es 3 si no hay
  plagas seleccionadas y, en caso contrario, `MIN(notaPlaga)` de las plagas
  seleccionadas. Ninguna visita histórica sin la marca de finalización adquiere
  automáticamente score 3.
- RF-006: La plaga Mosca de la Fruta se identifica por un identificador estable
  del catálogo. La implementación debe añadir o utilizar un código inmutable
  de catálogo, por ejemplo `mosca_fruta`, con restricción de unicidad; no puede
  depender solo del nombre visible ni de coincidencias de texto.
- RF-007: Para Mosca de la Fruta la nota queda forzada a 0, antes de aplicar el
  mínimo del módulo, si se cumple cualquiera de estas condiciones:
  - el código de departamento de la parcela es `14` (Lambayeque) y la
    incidencia es grado 3;
  - el código de departamento de la parcela es `20` (Piura) y la incidencia es
    grado 2 o 3;
  - en cualquier departamento la severidad es grado 1, 2 o 3.
  Fuera de esos casos se aplica RF-004. MTD no forma parte del payload, modelo,
  almacenamiento ni cálculo.
- RF-008: La API debe determinar el código de departamento por la cadena autorizada de
  la parcela `parcela -> subsector -> sector -> distrito -> provincia ->
  departamento`. Debe ignorar cualquier departamento, ubigeo o resultado de
  regla que envíe mobile y rechazar una visita cuya parcela no permita resolver
  esa cadena al calcular la excepción.
- RF-009: Cada nivel de incidencia y severidad usado por el score debe exponer
  y persistir un grado entero `0..3`, distinto de su ID técnico y de textos o
  porcentajes. El backend valida tipo (`incidencia` o `severidad`) y grado; los
  clientes no convierten por posición, nombre ni `sort_order`.
- RF-010: El porcentaje de una visita es `(scoreModulo / 3) * 100`. Una visita
  es elegible si y solo si `visitas_campo.activo = true` y su registro de paso
  2 (Plagas) tiene `finalizado_at` no nulo, escrito por la API después de una
  acción explícita de finalizar. Para cada productor, el score sanitario es el
  promedio aritmético de los porcentajes de ese conjunto cuando la parcela de
  la visita pertenece al productor. Para campaña se usa el mismo conjunto,
  limitado a visitas con el `campaniaId` solicitado. Las visitas inactivas, sin
  paso Plagas finalizado, de otra campaña o fuera del productor no participan;
  si el conjunto queda vacío, el resultado es `null`, no 0.
- RF-011: La API calcula con precisión decimal, redondea una sola vez cada
  valor presentado a dos decimales mediante redondeo decimal half-up y devuelve
  ese valor. No se redondean las notas de plaga ni los porcentajes de visita
  antes de promediar.
- RF-012: Los endpoints sanitarios nuevos y separados deben exponer
  `scoreModuloPlagas`, `porcentajePlagas`, `scoreSanitarioProductor` y, cuando
  corresponda, `scoreSanitarioCampania`. Los endpoints, nombres y contratos
  actuales de calificación manual permanecen sin cambios.

### No funcionales

- RNF-001: El cálculo debe ser determinista e idéntico en API, respuestas de
  detalle y agregados; mobile puede previsualizarlo, pero la respuesta de API
  es autoritativa.
- RNF-002: Las consultas agregadas deben evitar N+1 y contar con índices sobre
  las relaciones de visita, parcela/productor, campaña y observaciones usadas
  en el cálculo.
- RNF-003: Toda escritura y sincronización debe ser idempotente, preservar
  padre-hijo y no perder datos frente a desconexión, timeout, reintento o
  reinicio.
- RNF-004: No se registran secretos, MTD ni datos geográficos suministrados
  por cliente en logs de cálculo. Los errores no exponen IDs internos ni la
  cadena geográfica completa.

## Contratos afectados

### Decisión de persistencia

El score sanitario no se persiste como una segunda fuente de verdad. Se deriva
en API de las observaciones sanitarias seleccionadas, sus grados validados y la
geografía autorizada de la parcela. Esto evita desincronización cuando se edita
una observación, se corrige una plaga o cambia una relación geográfica, y
mantiene un único origen auditable. Solo se persisten los datos de captura y
catálogo necesarios para recomputarlo. Si después se requiere una instantánea
histórica, será una nueva spec con política explícita de versionado y
recalificación. La marca `finalizado_at` del paso Plagas sí se persiste porque
es indispensable para distinguir "sin plagas detectadas" de "paso no evaluado";
no es una tabla ni una instantánea de score.

### PostgreSQL

- `niveles_incidencia_severidad`: agregar el grado `0..3` validado y único por
  tipo de nivel, con semilla o migración de datos revisada antes de activar la
  restricción `NOT NULL`.
- `plagas_enfermedades`: agregar un código estable nullable durante expansión,
  poblar `mosca_fruta`, validar unicidad y promover a la restricción acordada
  sin inferir por texto en tiempo de ejecución.
- `visita_paso_observaciones`: reutilizar la estructura existente, con su
  unicidad `(visita_id, paso)`, y agregar `finalizado_at TIMESTAMPTZ NULL`.
  Para el paso 2 se establece una sola vez por la acción explícita; filas
  históricas conservan `NULL` y no son elegibles. No se infiere del texto de
  observación o recomendación.
- `visita_observaciones_sanitarias` y su tabla de órganos: mantener una fila
  por plaga seleccionada, con constraint único efectivo
  `(visita_id, plaga_enfermedad_id)`. La escritura será UPSERT remoto seguro
  por esa clave, dentro de una transacción que reemplace el conjunto de órganos
  y asegure los dos grados y la regla condicional de órganos.
- No crear tabla de score. Agregar índices de lectura que la implementación
  confirme necesarios para observaciones por visita y agregados por productor
  y campaña.

### SQLite y mobile

- Migrar `visita_paso_observaciones` para incluir `finalizado_at` nullable y
  conservar `NULL` en visitas existentes. La misma fila local de paso 2 porta
  la finalización y se sincroniza por su clave única `(visita_local_id,
  step_number)`.
- Migrar el esquema local de observaciones para conservar ambos niveles de
  grado 0..3 y la selección explícita de plaga, manteniendo IDs locales y
  remotos separados y unicidad local `(visita_local_id, pest_disease_id)`.
- Actualizar catálogos locales para incluir el grado y el código estable sin
  depender del texto de Mosca de la Fruta.
- El formulario solo crea una observación al activar `Evaluar plaga`, inicializa
  ambos grados en 0 y valida los órganos conforme a RF-003 antes de encolar.
  La acción `Finalizar Plagas` persiste y encola el paso 2, no una nota vacía.

### API y tipos compartidos

- Ajustar DTOs, esquemas compartidos y OpenAPI para requerir ambos IDs de nivel
  al crear o actualizar una observación de plaga seleccionada. Añadir un
  endpoint de UPSERT de observación por visita y plaga, por ejemplo
  `PUT /visitas-campo/:visitaId/observaciones-sanitarias/:pestDiseaseId`, que
  sustituye atómicamente sus órganos. El servidor valida tipos, grados y la
  disponibilidad por etapa; no acepta un score calculado desde mobile.
- Versionar `PATCH /visitas-campo/:visitaId/paso-observaciones/2` para aceptar
  `finalizado: true`; la API persiste `finalizado_at = now()` de forma
  idempotente. No debe aceptar una fecha ni un score enviados por mobile.
- Añadir, sin alterar calificación manual, los endpoints de lectura:

  | Método | Ruta | Respuesta mínima |
  |---|---|---|
  | `GET` | `/visitas-campo/:visitaId/score-sanitario-plagas` | `{ visitaId, pasoPlagasFinalizado, scoreModuloPlagas: number \| null, porcentajePlagas: number \| null }` |
  | `GET` | `/productores/:productorId/score-sanitario-plagas?campania_id=` | `{ productorId, campaniaId: string \| null, scoreSanitarioProductor: number \| null, scoreSanitarioCampania: number \| null, visitasElegibles: number }` |

### Offline-first, outbox e idempotencia

- La observación sanitaria y la finalización de paso son hijas de
  `visitas_campo`: el outbox solo las envía después de que la visita padre tenga
  identidad remota válida. La finalización espera además a que las
  observaciones sanitarias pendientes de esa visita se hayan confirmado.
- Se elige la estrategia **b**, UPSERT remoto seguro por
  `(visita_id, plaga_enfermedad_id)`, porque la observación actual no tiene
  `publicId` pero esa clave ya representa una sola selección. Create, update,
  reintento, timeout y reinicio envían el mismo UPSERT; la API devuelve la fila
  existente o actualizada y reemplaza órganos en la misma transacción, sin
  duplicar observaciones ni órganos.
- Una actualización de la observación y sus órganos debe sustituir el conjunto
  de órganos como una unidad lógica. Ante error transitorio se conserva el
  payload; ante auth se detiene la cola; ante error permanente queda visible y
  corregible. Nunca se marca `synced` sin confirmación de API.
- El score se muestra localmente solo como estimación de los datos guardados;
  tras la confirmación remota se refresca el valor autoritativo sin cambiar las
  observaciones pendientes ni el orden padre-hijo.

## Seguridad y datos

- Los guards y la autorización existente de visita, parcela y productor se
  aplican a toda lectura y escritura; la visibilidad en mobile o admin no
  sustituye al control de API.
- La regla Mosca de la Fruta se ejecuta exclusivamente en backend y usa la
  geografía relacionada de la parcela. Un cliente no puede elevar el score
  declarando otro departamento ni enviando una nota calculada.
- DTOs restringen grados, IDs positivos, tipos de nivel, número de órganos y
  tamaños de texto. Los errores deben ser genéricos para recursos ajenos y no
  revelar datos de otros productores.

## Migración y rollback

1. Expandir PostgreSQL y SQLite con campos de grado/código compatibles y
   lectores que toleren temporalmente valores ausentes; inventariar y corregir
   catálogos antes de imponer `NOT NULL` o unicidad.
2. Desplegar API compatible que lea datos anteriores, rechace nuevas escrituras
   incompletas al activar el feature y derive el score sin persistirlo.
3. Publicar mobile compatible que migre SQLite sin borrar pendientes, escriba
   ambos grados y `finalizado_at`, y use UPSERT/outbox idempotente. Mantener
   compatibilidad de API para versiones mobile anteriores durante la ventana de
   actualización acordada; esas versiones no finalizan Plagas y sus visitas no
   pasan a agregados automáticamente.
4. Tras verificar migración, sincronización y agregados, endurecer constraints
   y retirar la compatibilidad solo mediante cambio posterior aprobado.

El rollback de servidor desactiva la exposición del score y conserva las nuevas
columnas/códigos y `finalizado_at`; no borra observaciones ni catálogos. Para SQLite se prefiere
una migración correctiva hacia adelante: no recrear tablas ni eliminar outbox
pendiente. Restaurar una copia de seguridad solo se considera ante corrupción
confirmada y según el runbook de base de datos.

## Criterios de aceptación

- [ ] CA-001: Una visita activa con paso Plagas finalizado y sin plagas
  seleccionadas devuelve score 3 y porcentaje 100, sin crear filas artificiales
  para plagas no aplicables; sin la marca de finalización devuelve `null` y no
  entra a agregados.
- [ ] CA-002: El módulo usa el mínimo de las notas de las plagas seleccionadas
  y permite severidad positiva con incidencia 0.
- [ ] CA-003: Incidencia y severidad son obligatorias e inicializan en 0; los
  órganos solo se exigen si alguno de los grados es mayor que 0.
- [ ] CA-004: Cada caso de Mosca de la Fruta de RF-007 fuerza nota 0 y los casos
  fuera de la regla usan la fórmula normal; ni payload ni BD contienen MTD.
- [ ] CA-005: La API ignora un departamento enviado por cliente y obtiene el
  código de departamento de la parcela para aplicar la regla.
- [ ] CA-006: Los agregados incluyen exactamente el universo y redondeo de
  RF-010 y RF-011, devuelven `null` sin visitas elegibles y no alteran ningún
  campo ni resultado de cumplimiento manual.
- [ ] CA-007: Una sincronización repetida, interrumpida o reiniciada hace
  UPSERT por visita-plaga, no duplica observaciones ni órganos, y preserva el
  orden visita-padre, observación-hija y finalización posterior del paso.
- [ ] CA-008: Las migraciones PostgreSQL y SQLite conservan datos existentes,
  pendientes del outbox y permiten rollback no destructivo.

## Pruebas

- Unitarias: fórmula para 0..3, mínimo, paso no finalizado, ausencia de
  selección tras finalización, conversión a porcentaje, promedio y half-up;
  todas las combinaciones relevantes de Mosca de la Fruta por código de
  departamento; validación de órganos, control `Evaluar plaga` y tipos/grados.
- Integración API/PostgreSQL: joins de parcela a departamento, autorización,
  catálogo estable, validación de DTO, detalle de visita y agregados por
  productor/campaña sin N+1 observable.
- Migraciones: base vacía, base con catálogos y observaciones existentes sin
  `finalizado_at`, aplicación repetida, restricciones e índices; SQLite con
  observaciones y outbox pendientes.
- Offline-online: alta y edición sin red, finalización explícita posterior,
  reinicio, reintento, timeout, auth, conflicto e idempotencia de UPSERT y
  órganos; comprobar que el score autoritativo solo aparece tras sincronizar la
  finalización.
- Casos límite: sin visitas elegibles; visita histórica sin finalización;
  visita inactiva; campaña sin visitas; plaga fuera de etapa; grado inválido;
  ambos grados 0; incidencia 0/severidad 1; IDs de
  catálogo alterados; parcela sin cadena geográfica resoluble y cliente que
  envía un departamento falso.

## Impacto documental

- [ ] Actualizar `docs/architecture/mobile-offline-sync.md` al implementar el
  nuevo contrato de observaciones y outbox.
- [ ] Actualizar el modelo de dominio y/o arquitectura de visitas con la
  definición de score sanitario y su separación de cumplimiento manual.
- [ ] Actualizar runbooks de migración, rollback y riesgos si cambian las
  operaciones o compatibilidad de versiones.
- [ ] No requiere ADR salvo que la revisión humana decida persistir una
  instantánea de score o cambiar la fuente de verdad definida en esta spec.
