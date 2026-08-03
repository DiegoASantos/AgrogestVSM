---
title: Modelo del dominio
status: active
owner: mantenimiento
last_reviewed: 2026-08-03
---

# Modelo del dominio

## Núcleo territorial

```text
Departamento → Provincia → Distrito → Sector
                                      │
Productor ────────────────────────────┼→ Parcela
                                      │
                                      └→ Visita de campo
```

Una parcela pertenece a un productor y a un sector. Puede tener punto de
referencia y geometría MultiPolygon. Un productor puede representar una
persona, un fundo o una cooperativa. Las personas requieren `nombres` y
`apellidos`; el tipo y numero de documento son opcionales y deben registrarse
juntos cuando se informan. Fundos y cooperativas usan `nombres` como nombre de
la entidad y no requieren documento.

Desde la spec 007, la relacion vigente es `Sector -> Subsector -> Parcela`.
`Parcela.sectorId` se conserva en respuestas de API como valor derivado para
compatibilidad temporal de mapas, visitas, historial, geodatos y reportes
mobile; la FK real es `subsectorId`.

Restricciones territoriales relevantes:

- nombre de subsector unico dentro del sector;

- código y nombre de departamento únicos;
- código de provincia único y nombre único dentro del departamento;
- ubigeo de distrito único y nombre único dentro de la provincia;
- nombre de sector único dentro del distrito;
- código de parcela autogenerado por la API con formato `PAR-###`; el
  correlativo es global y no se ingresa desde el flujo normal del admin web;
- nombre de parcela único por productor y subsector, validado por la API. La
  base de datos todavía no define constraint para esta regla;

## Producción agrícola

- [cultivo](cultivos.md);
- variedad asociada al cultivo;
- campaña;
- etapa fenológica;
- subetapa.

Estos catálogos contextualizan la parcela y cada visita. El cultivo es el
catálogo base de producción agrícola: desde él se resuelven variedades,
campañas, etapas fenológicas y nutrientes aplicables a una visita.

Para integraciones externas, cultivos, variedades, campañas, productores,
sectores, subsectores y parcelas exponen un `publicId` UUID estable. Cost-Build
consume esos identificadores como `id_origen` mediante un endpoint de solo
lectura protegido por API key.

## Visita de campo

La visita es el agregado operativo principal. Contiene datos generales y
relaciona:

- parcela;
- cultivo, variedad y campaña;
- agrónomo;
- etapa y subetapa;
- fecha, horas, área y observación general;
- ubicación y firmas.

Entidades hijas:

- evaluaciones nutricionales;
- observaciones sanitarias y órganos afectados;
- notas y recomendaciones por paso;
- diagnóstico de riego;
- labores culturales;
- receta agronómica y sus secciones.
- calificaciones manuales de cumplimiento por módulo.

Toda visita nueva exige una etapa fenológica válida y asociada al cultivo. La
columna permanece nullable para conservar registros históricos; una
actualización puede omitir la etapa, pero no eliminar una ya seleccionada.

La receta fitosanitaria usa los catalogos `tipos_producto_fitosanitario`,
`ingredientes_activos` y `marcas_producto`. La tabla `marcas_producto` conserva
su nombre historico, pero su columna `nombre` representa el nombre comercial
visible para el tecnico. Cada nombre comercial puede asociarse a un tipo de
producto y a un ingrediente activo, y conserva la concentracion comercial como
texto junto con su unidad de medida. El texto permite representar tanto valores
decimales como composiciones o valores cualitativos sin interpretarlos
parcialmente. Mobile resuelve la cascada tipo de producto, ingrediente activo y
nombre comercial; cada nivel se filtra por los anteriores. La receta sigue
guardando los nombres y, cuando es calculable, la concentracion numerica para
compatibilidad offline e historica.

El catalogo `fertilizantes` tambien conserva concentracion textual y unidad de
medida. Esos datos describen el producto seleccionado y son distintos de la
dosis y su unidad de aplicacion guardadas en el detalle de la receta. Mobile los
usa como informacion readonly y no los duplica en la receta historica.

Una receta puede contener varios detalles fitosanitarios para el mismo objetivo
y varios detalles de fertilizacion. En mobile, las filas fitosanitarias con el
mismo numero, tipo y nombre de objetivo se presentan como una sola aplicacion
con varios productos; al guardar, cada producto vuelve a persistirse como una
fila independiente. Las relaciones 1:N existentes en SQLite y PostgreSQL son la
fuente estructural de esta capacidad y no requieren una tabla adicional.

Antes de finalizar, mobile contrasta de forma orientativa los ingredientes
activos, nombres comerciales, coadyuvantes y fertilizantes seleccionados con un
conjunto local de reglas de incompatibilidad. La advertencia no bloquea el
guardado y no reemplaza etiquetas, prueba de compatibilidad ni criterio del
profesional responsable.

Las calificaciones de cumplimiento viven en `visita_calificaciones` y son hijas
de una visita. Cada visita puede tener una calificación por módulo:
`plagas`, `enfermedades`, `nutricion`, `riego` y `labores`. El puntaje de cumplimiento
usa escala 0-3 y se sincroniza desde mobile mediante outbox después de que la
visita padre tenga identificador de servidor.

Cuando un puntaje es menor a 3, la calificación puede registrar si el
incumplimiento fue justificado. Para incumplimientos justificados se guarda una
categoría y un motivo de catálogo mobile; para puntaje 3 los campos de
justificación quedan en `NULL`. La observación cualitativa usada por el técnico
se registra como observación del paso en `visita_paso_observaciones` y también
se envía como soporte de la calificación cuando aplica.

La calificación solo es clasificable cuando existe una receta anterior para la
misma parcela. Por eso mobile exige registrar al menos una recomendación antes
de finalizar una receta nueva. Si una visita previa no tiene receta, la visita
siguiente muestra la referencia como no clasificable y no solicita score.

La API calcula el score de cumplimiento en escala 0-100. El score por módulo se
deriva de `puntaje / 3 * 100`; el score general de una visita usa la matriz de
pesos hardcodeada por nombre normalizado de etapa fenológica. Los agregados por
productor y por campaña se resuelven desde `campaniaId`.

Los scores técnicos de la observación actual son indicadores separados y se
derivan en la API; no se guardan en `visita_calificaciones`. Un módulo se
considera evaluado cuando su paso fue finalizado o cuando la visita ya tiene
una fila en `visita_recetas`. En este último caso, la ausencia de capturas en
Plagas, Enfermedades, Nutrición o Riego significa que no se encontraron
problemas y produce score técnico 3; antes de ambas señales se mantiene como
pendiente. Para Plagas, una
visita elegible consolida siempre Trips, Queresas, Ácaros, Cochinilla, Chinche
y Mosca de la fruta. La ausencia de registro equivale en el cálculo a grados
0/0 y nota 3, sin crear filas artificiales. Cada nota es
`3 - MAX(incidencia, severidad)`, con la excepción de Mosca de la fruta, y el
score del módulo es el mínimo de las seis notas. El contrato devuelve el
desglose y el semáforo para que web y mobile presenten el mismo resultado.

Mobile también deriva en lectura el detalle de estos cuatro módulos desde las
capturas SQLite, sin persistir el resultado ni esperar un `serverId`. El valor
local tiene precedencia mientras existan insumos técnicos pendientes o fallidos;
una respuesta remota solo lo confirma cuando esos insumos están sincronizados.
Los códigos estables de `pest_diseases` permiten identificar offline el universo
fijo de plagas y enfermedades, con compatibilidad por nombre durante la
transición.

Para Enfermedades, el porcentaje entero de árboles enfermos (0–100) es la fuente
de la incidencia: 0%→grado 0, 1–5%→grado 1, 6–20%→grado 2 y 21–100%→grado 3.
Los cuatro grados de incidencia son globales porque los determina el porcentaje;
la severidad continúa restringida por enfermedad y etapa fenológica.
Una visita elegible consolida siempre Oidium, Antracnosis, Muerte regresiva y
Alternaria; una enfermedad sin registro aporta porcentaje 0, incidencia 0,
severidad 0 y nota 3, sin persistencia artificial. Cada nota usa
`3 - MAX(incidencia, severidad)` y `ScoreEnfermedades` es el mínimo de las cuatro
notas. Los órganos afectados no intervienen en el cálculo.

Para Nutrición, cada evaluación se vincula a un nutriente mediante
`nutriente_id` y exige el porcentaje entero de árboles afectados entre 0 y 100.
El porcentaje deriva la incidencia con los mismos límites: 0%→grado 0,
1–5%→grado 1, 6–20%→grado 2 y 21–100%→grado 3. La nota individual es
`3 - incidencia`. El módulo siempre consolida Nitrógeno, Magnesio, Potasio,
Hierro, Zinc y Boro; cada deficiencia sin registro aporta incidencia 0 y nota 3.
`ScoreNutricion` es el mínimo de las seis notas y se publica al finalizar el
paso 4 o al existir una receta para la visita. La severidad y los órganos
afectados no intervienen en esta fórmula.

En Riego, toda captura nueva exige `humedad_suelo`; mobile impide avanzar sin
seleccionarla y la API rechaza altas incompletas. Las filas históricas nulas se
mantienen legibles por compatibilidad. Una visita con receta y sin fila de riego
representa ausencia de desviaciones y obtiene score 3; una fila existente se
calcula con la matriz técnica vigente. `estres_hidrico` se selecciona de forma
independiente: mobile lo muestra y persiste para cualquier valor de humedad, sin
forzarlo a `false` al cambiar o guardar una humedad distinta de `seco`.

## Seguridad

- usuario;
- rol;
- relación usuario-rol;
- sesión de refresh token.

Los roles distinguen administración, trabajo técnico y consulta. `ANALISTA` usa
el panel web en modo solo lectura (Dashboard, Visitas, Mapas y Clima), no puede
acceder a Mantenimiento ni Seguridad y la API rechaza sus mutaciones. La
aplicación móvil no admite sesiones con ese rol.

## Fuente estructural

Este documento explica relaciones conceptuales. Las columnas exactas y
restricciones se consultan en:

- entidades TypeORM de `apps/api/src/modules`;
- migraciones de `apps/api/src/database/migrations`;
- esquema y migraciones SQLite de `apps/mobile/src/shared/database`.

El esquema inicial puede reproducirse desde entidades TypeORM mediante el
bootstrap protegido. Las migraciones conservan ajustes y semillas históricas.
