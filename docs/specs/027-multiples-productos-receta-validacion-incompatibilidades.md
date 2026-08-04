---
title: Múltiples productos por recomendación y validación de incompatibilidades en receta
status: implemented
numero: 027
area: mobile, visita-recetas, fitosanidad, fertilizacion, validacion
created: 2026-08-03
approved_by: usuario, 2026-08-03
implemented_in: apps/mobile/src/modules/visita-recetas, 2026-08-03
---

# Spec 027: Múltiples productos por recomendación y validación de incompatibilidades en receta

## Contexto

Actualmente en la pantalla de receta, cada plaga o enfermedad detectada permite recomendar
**un solo ingrediente activo** con su dosis y nombre comercial. Para fertilización, solo se
puede recomendar **un fertilizante** por receta.

El negocio requiere que el agrónomo pueda recomendar **más de un producto** por cada módulo:

- múltiples ingredientes activos para una misma plaga o enfermedad (fitosanidad);
- múltiples fertilizantes en una misma receta (fertilización).

Además, cuando se mezclan múltiples productos en un mismo tanque de aplicación, existen
**incompatibilidades químicas** entre ciertos ingredientes activos y fertilizantes que pueden
causar fitotoxicidad, pérdida de eficacia, precipitación u obstrucción de boquillas. El
sistema debe advertir al agrónomo sobre estas incompatibilidades antes de finalizar la receta,
sin bloquear la operación — la decisión final es del profesional responsable.

El documento `compatibilidad_agroquimicos_mezcla.md` en la raíz del proyecto establece el
marco metodológico: la compatibilidad depende de factores físicos, químicos, biológicos y
legales. Ninguna validación automática reemplaza la consulta de etiquetas ni el criterio del
ingeniero agrónomo. Este módulo es **orientativo**.

## Alcance

### Incluido

- **Fitosanidad multi-ingrediente:**
  - Reemplazar campos singulares de ingrediente activo por array `ingredientes[]` dentro de
    cada `AppFitosanidad`.
  - Botón `"+ Agregar otro ingrediente activo"` en cada tarjeta de fitosanidad.
  - Funciones para agregar, quitar y actualizar ingredientes individuales.
  - Mapeo en `handleSave`: cada ingrediente genera una fila independiente de
    `RecetaFitosanidad` con el mismo `objetivo`/`objetivoNombre`.
  - Mapeo en `restoreFromReceta`: agrupar filas de `receta.fitosanidad` por `objetivoNombre`
    para reconstruir el array de ingredientes.

- **Fertilización multi-producto:**
  - Cambiar el estado `fertilizacion` de objeto único a array `fertilizaciones[]`.
  - Botón `"+ Agregar otro fertilizante"` al final de la sección.
  - Funciones para agregar, quitar y actualizar fertilizantes.
  - Mapeo directo de array en `handleSave` y `restoreFromReceta`.

- **Validación de incompatibilidades:**
  - Nuevo archivo `domain/validacion-mezclas.ts` con:
    - 12 reglas de incompatibilidad (6 nivel 🔴 evitar, 6 nivel 🟡 precaución).
    - Función `validarMezcla(nomenclatura: string[]): AdvertenciaMezcla[]`.
    - Función `construirMensajeAdvertencia(advertencias): string`.
  - Integración en `handleSave`: después de la validación de campos, antes de guardar.
  - Mensaje de advertencia con: productos involucrados, motivo técnico, efecto posible,
    recomendación de aplicar en mezclas separadas, disclaimer orientativo.
  - La advertencia **nunca bloquea** — el usuario puede continuar bajo su responsabilidad.

- **Experiencia de usuario:**
  - Nombres de elementos químicos en español (Cobre, no Cu; Calcio, no Ca).
  - Disclaimer visible en toda alerta de incompatibilidad.
  - Contador de ingredientes por tarjeta de fitosanidad.
  - Contador de fertilizantes en la sección correspondiente.

### Decisiones de implementación aprobadas

- No se agrega una tabla nueva: `visita_receta_fitosanidad` y
  `visita_receta_fertilizacion` ya son detalles 1:N en SQLite y PostgreSQL, no
  tienen unicidad por objetivo o producto y el contrato existente transporta
  arrays.
- `tipoProductoId`, `modoAccionId` y `cantidadTotalIa` pertenecen a cada
  ingrediente. Esto permite combinar productos heterogéneos sin compartir por
  error datos propios del producto.
- La restauración agrupa por `numero`, `objetivo` y `objetivoNombre`; esta llave
  evita colisiones entre hallazgos homónimos y conserva el agrupamiento esperado.
- La nomenclatura validada incluye ingrediente activo, nombre comercial,
  coadyuvantes seleccionados y fertilizantes. Es necesario para evaluar reglas
  condicionadas por correctores, secuestrantes y aceites.
- Los alias del catálogo se declaran dentro de las reglas y se comparan con una
  normalización exacta, sin coincidencias parciales que generen falsos positivos.

### Excluido

- Validación de incompatibilidades en el backend (API). Es solo frontend en esta spec.
- Sincronización de reglas de incompatibilidad desde el servidor. Las reglas son un mapa
  estático en el código mobile.
- Módulo de nutrición en receta (requiere spec separada por su complejidad).
- Cambios en la estructura de tablas SQLite o PostgreSQL. El data layer existente ya soporta
  múltiples filas por objetivo.
- Modificaciones en los endpoints de la API. Los DTOs actuales aceptan arrays de
  `fitosanidad` y `fertilizacion` sin restricción de unicidad.
- Prueba de jarra (compatibilidad física). Es responsabilidad del profesional en campo.

## Requisitos

### Fitosanidad multi-ingrediente

- RF-001: Cada `AppFitosanidad` debe contener un array `ingredientes: AppIngrediente[]` con
  al menos 1 elemento.
- RF-002: El tipo `AppIngrediente` contiene: `localId`, `tipoProductoId`,
  `modoAccionId`, `ingredienteActivoId`, `ingredienteActivoNombre`, `dosisIa`,
  `cantidadTotalIa`, `marcaProductoNombre`, `concentracionProducto`,
  `unidadMedidaProducto`, `cantidadTotalProducto`.
- RF-003: Botón `"+ Agregar otro ingrediente activo"` al final de la lista de ingredientes
  dentro de cada tarjeta de fitosanidad. Solo visible si la tarjeta pertenece a una plaga o
  enfermedad.
- RF-004: Cada ingrediente tiene un botón `"✕ Quitar"` para eliminarlo. No se puede eliminar
  el último ingrediente de una tarjeta (mínimo 1).
- RF-005: Los campos de cabecera de `AppFitosanidad` (`objetivo`, `objetivoNombre`,
  `tipoControlId`, `disolvente`, `volumenAplicacion`, `coadyuvantesIds`, `ordenMezcla`) se
  comparten entre todos los ingredientes de la misma tarjeta.
- RF-006: Al guardar, cada `AppIngrediente` genera una fila independiente en
  `SaveRecetaData.fitosanidad[]` con el mismo `objetivo` y `objetivoNombre`.
- RF-007: Al restaurar desde `receta.fitosanidad[]`, las filas con el mismo
  `numero`, `objetivo` y `objetivoNombre` se agrupan en una sola `AppFitosanidad`
  con múltiples ingredientes.

### Fertilización multi-producto

- RF-008: El estado `fertilizacion` cambia de `AppFertilizacion` a `AppFertilizacion[]` con
  nombre de variable `fertilizaciones`.
- RF-009: Botón `"+ Agregar otro fertilizante"` al final de la sección de fertilización.
- RF-010: Cada fertilizante tiene un botón `"✕ Quitar"`. Si solo hay uno, se muestra como
  deshabilitado o se oculta.
- RF-011: Al guardar, el array `fertilizaciones` se mapea directo a
  `SaveRecetaData.fertilizacion[]`.
- RF-012: Al restaurar, `receta.fertilizacion[]` se mapea directo al array de estado.

### Validación de incompatibilidades

- RF-013: El sistema debe contener 12 reglas de incompatibilidad predefinidas: 6 de nivel
  `"evitar"` y 6 de nivel `"precaucion"`.
- RF-014: Cada regla define: `nivel`, `productos: string[]` (nombres exactos en español),
  `motivo`, `efecto`, `recomendacion`.
- RF-015: La función `validarMezcla(nomenclatura)` recibe la lista de ingredientes
  activos, nombres comerciales, coadyuvantes y fertilizantes seleccionados y
  devuelve las advertencias aplicables.
- RF-016: La validación se ejecuta en `handleSave`, después de la validación de campos
  obligatorios y antes de guardar los datos.
- RF-017: Si hay advertencias, se muestra un `Alert` con el detalle de cada incompatibilidad
  encontrada, incluyendo motivo, efecto y recomendación.
- RF-018: El mensaje incluye la recomendación explícita de aplicar en mezclas separadas.
- RF-019: El mensaje incluye el disclaimer: _"Esta validación es orientativa. Consulte
  siempre las etiquetas de los productos. La decisión final es del profesional responsable."_
- RF-020: El usuario puede elegir `"Volver a editar"` o `"Continuar de todos modos"`. La
  advertencia nunca bloquea el guardado.
- RF-021: Los nombres de elementos químicos se muestran en español (Cobre, Calcio, Magnesio,
  Zinc, Fósforo), no con símbolos (Cu, Ca, Mg, Zn, P).

### Requisitos no funcionales

- RNF-001: Las reglas de incompatibilidad deben ser fáciles de modificar sin tocar la lógica
  de validación (array de objetos).
- RNF-002: El rendimiento de `validarMezcla` debe ser O(n·m) donde n = reglas y m =
  productos seleccionados. Con 12 reglas y máximo ~20 productos, es imperceptible.
- RNF-003: El disclaimer debe ser visible en toda alerta de incompatibilidad, no solo en
  documentación.
- RNF-004: Todos los cambios son solo JavaScript. No requieren migraciones de base de datos
  ni cambios en la API.

## Contratos afectados

### Mobile (único afectado)

- **`visita-receta-screen.tsx`**:
  - Nuevo tipo `AppIngrediente`.
  - `AppFitosanidad` cambia a `ingredientes: AppIngrediente[]`.
  - `fertilizacion` cambia a `fertilizaciones: AppFertilizacion[]`.
  - Nuevas funciones: `agregarIngrediente`, `quitarIngrediente`,
    `actualizarIngrediente`, `agregarFertilizacion`, `quitarFertilizacion`.
  - `buildFitosanidadFromConsolidacion` y `createEmptyFitosanidad` actualizados.
  - `restoreFromReceta` agrupa ingredientes por `objetivoNombre`.
  - `handleSave` integra llamada a `validarMezcla`.
  - Renderizado de `FitosanidadCard` y `FertilizacionCard` con `.map()`.

- **`domain/validacion-mezclas.ts`** (nuevo):
  - Tipos `NivelRiesgo`, `ReglaIncompatibilidad`, `AdvertenciaMezcla`.
  - Constante `REGLAS_INCOMPATIBILIDAD` con 12 reglas.
  - `validarMezcla(nombres: string[]): AdvertenciaMezcla[]`.
  - `construirMensajeAdvertencia(advertencias): string`.

- **`visita-receta-selection.ts`**:
  - Helpers adaptados a multi-ingrediente (opciones de ingrediente por tipo de producto).

- **`visita-receta-multiple-products.ts`** (nuevo):
  - Tipos de estado, agrupación, aplanado, restauración, cálculos y construcción
    de la nomenclatura de mezcla como funciones puras comprobables.

### Sin cambios

- SQLite, PostgreSQL, migraciones, sync entities, sync handlers, DTOs de API, endpoints.
  El data layer ya soporta múltiples filas por `objetivo`/`objetivoNombre`.

## Seguridad y datos

- No se introducen secretos, credenciales ni datos personales.
- Las reglas de incompatibilidad son conocimiento agronómico público. No contienen datos
  sensibles.
- La validación es solo frontend. No sustituye la consulta de etiquetas ni la
  responsabilidad del profesional. El disclaimer cubre este aspecto.
- El usuario siempre puede ignorar la advertencia y guardar. No hay bloqueo.

## Migración y rollback

- **Sin migraciones de base de datos.** Los cambios son solo en la capa de presentación y
  dominio del mobile.
- **Rollback:** revertir los archivos modificados. Las recetas guardadas con múltiples
  ingredientes/fertilizantes son compatibles con versiones anteriores (el data layer ya las
  soporta).
- Los usuarios con versión anterior de la app pueden ver solo el primer
  fertilizante al abrir una receta creada con la nueva versión. No deben editar
  y volver a guardar esa receta desde una versión anterior porque ese cliente no
  preserva detalles adicionales. El rollback operativo es publicar una OTA
  correctiva compatible, no degradar el cliente que editará datos multi-producto.

## Reglas de incompatibilidad

### 🔴 Evitar (6 reglas)

| #   | Productos involucrados                                                                                                  | Motivo                                          | Efecto                                                     | Recomendación                                                            |
| --- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------ |
| 1   | Oxicloruro de Cobre, Ácido orgánico + indicador                                                                         | pH ácido solubiliza el cobre en exceso          | Fitotoxicidad: quemado de hojas, flores y frutos           | Aplicar en mezclas separadas con al menos 3 días de diferencia           |
| 2   | Oxicloruro de Cobre, Zinc Quelatado / Basfoliar Zinc / Kelatox Zinc                                                     | El cobre desplaza el zinc del quelato           | Ambos precipitan. No estarán disponibles para la planta    | Aplicar el zinc 7 días antes o después del cobre                         |
| 3   | Glifosato, Nitrato de Calcio / Yaraliva Calcinit / Sulfato de Magnesio / Basfoliar Zinc / Kelatox Zinc / Zinc Quelatado | Calcio, Magnesio y Zinc secuestran el glifosato | El herbicida pierde eficacia. Las malezas no se controlan  | Aplicar el glifosato solo, sin fertilizantes foliares en el mismo tanque |
| 4   | Nitrato de Calcio / Yaraliva Calcinit, Sulfato de Potasio / Sulfato de Magnesio                                         | Calcio + sulfato forman yeso                    | Obstrucción de boquillas y filtros. Precipitado blanco     | Preparar en tanques separados                                            |
| 5   | Nitrato de Calcio / Yaraliva Calcinit, DAP / Fósforo + Nitrógeno                                                        | Calcio + fosfato forman fosfato de calcio       | El calcio y el fósforo no están disponibles para la planta | Aplicar con al menos 5 días de diferencia                                |
| 6   | Basfoliar Zinc / Kelatox Zinc / Zinc Quelatado, DAP / Fósforo + Nitrógeno                                               | Zinc + fosfato forman fosfato de zinc           | El zinc y el fósforo precipitan. Deficiencia inducida      | Aplicar zinc foliar solo, sin fosfatos en el mismo tanque                |

### 🟡 Precaución (6 reglas)

| #   | Productos involucrados                          | Motivo                                                  | Efecto                                                                       | Recomendación                                                            |
| --- | ----------------------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 7   | Abamectina, (sin Secuestrante de sales)         | pH alcalino del agua dura degrada la abamectina         | Reducción de eficacia contra ácaros                                          | Agregar Secuestrante de sales primero. Verificar pH entre 5 y 7          |
| 8   | Imidacloprid, (sin Corrector de pH)             | pH alcalino reduce absorción foliar                     | Menor control de insectos chupadores                                         | Ajustar pH a 5-6 con Corrector de pH antes de agregar Imidacloprid       |
| 9   | Spinetoram, Aceite penetrante                   | Exceso de penetración en tejidos                        | Fitotoxicidad en hojas tiernas de mango, especialmente con temperatura >30°C | Reducir dosis del aceite o evitar en horas de calor intenso              |
| 10  | Oxicloruro de Cobre, Thiabendazole              | Posible interacción benzimidazol + cobre                | Precipitación. Reducción de eficacia de ambos fungicidas                     | Aplicar en mezclas separadas. Verificar prueba de jarra antes de mezclar |
| 11  | Paclobutrazol, Nitrógeno (Urea) / Urea Agrícola | Nitrógeno estimula crecimiento, Paclobutrazol lo inhibe | Efectos contrapuestos. Se anulan mutuamente                                  | El Paclobutrazol se aplica al suelo, no en mezcla foliar con urea        |
| 12  | Fluopyram, (sin Corrector de pH)                | Se hidroliza en medio alcalino                          | Reducción de eficacia contra nematodos                                       | Ajustar pH a 5-6 con Corrector de pH antes de agregar Fluopyram          |

## Criterios de aceptación

- [x] CA-001: Una plaga "Mosca de la fruta" puede tener 2 ingredientes activos (ej:
      Spinetoram + Imidacloprid) con sus respectivas dosis y nombres comerciales.
- [x] CA-002: Una receta puede tener 3 fertilizantes diferentes (ej: Urea Agrícola + Sulfato
      de Potasio + Aminofol).
- [x] CA-003: Al guardar, cada ingrediente de fitosanidad genera una fila independiente en la
      base de datos con el mismo `objetivoNombre`.
- [x] CA-004: Al guardar, cada fertilizante genera una fila independiente en la base de
      datos.
- [x] CA-005: Al reabrir una receta guardada, los ingredientes se agrupan correctamente por
      `objetivoNombre` en sus respectivas tarjetas.
- [x] CA-006: Si se seleccionan Oxicloruro de Cobre + Ácido orgánico + indicador, aparece
      alerta de nivel "evitar" antes de guardar.
- [x] CA-007: Si se selecciona Abamectina sin Secuestrante de sales, aparece alerta de nivel
      "precaución".
- [x] CA-008: La alerta de incompatibilidad muestra: productos involucrados, motivo técnico,
      efecto posible, y recomendación de aplicar en mezclas separadas.
- [x] CA-009: La alerta incluye el disclaimer orientativo y permite "Continuar de todos
      modos".
- [x] CA-010: Los nombres de elementos químicos se muestran en español (Cobre, Calcio,
      Magnesio, Zinc).
- [x] CA-011: No se puede eliminar el último ingrediente de una tarjeta de fitosanidad.
- [x] CA-012: Si no hay fertilizantes, la sección muestra mensaje informativo y botón para
      agregar el primero.

## Pruebas

- **Unitarias:**
  - `validarMezcla([])` → 0 advertencias.
  - `validarMezcla(["Oxicloruro de Cobre", "Ácido orgánico + indicador"])` → 1 advertencia
    de nivel "evitar".
  - `validarMezcla(["Abamectina"])` → 1 advertencia de nivel "precaución" (sin
    Secuestrante de sales).
  - `validarMezcla(["Abamectina", "Secuestrante de sales"])` → 0 advertencias (regla no
    aplica porque está el secuestrante).
  - `construirMensajeAdvertencia` con 2 advertencias → formato correcto con emojis,
    nombres en español, disclaimer.
  - Agrupación de ingredientes por `objetivoNombre` en `restoreFromReceta`.
  - Mapeo de `ingredientes[]` a filas de `fitosanidad[]` en `handleSave`.

- **Integración:**
  - Flujo completo: crear receta con 2 ingredientes en 1 plaga + 2 fertilizantes → guardar
    → reabrir → verificar que los datos se restauran correctamente.
  - Flujo con incompatibilidad: seleccionar productos incompatibles → presionar guardar →
    ver alerta → "Volver a editar" → quitar uno → guardar sin alerta.

- **Validación manual:**
  - Verificar que el disclaimer es visible en toda alerta.
  - Verificar que los nombres de elementos están en español.
  - Verificar que el botón "+" y "✕" funcionan correctamente.

## Impacto documental

- [x] `docs/specs/README.md`: agregar spec 027 al índice.
- [x] `compatibilidad_agroquimicos_mezcla.md`: vincular desde la spec como referencia
      metodológica.
- [x] Arquitectura: no cambia el flujo offline ni el contrato.
- [x] Dominio: documentar el detalle 1:N y la advertencia orientativa.
- [x] Runbook: no se espera cambio.
- [x] ADR: no se requiere.
- [x] Variables o despliegue: no aplica. Cambios solo JS, desplegables por OTA.

## Evidencia de implementación

- Pruebas unitarias focalizadas: agrupación y aplanado multi-producto, round-trip,
  cálculos, nomenclatura y 12 reglas declarativas.
- Typecheck mobile, ESLint del alcance, Prettier, export Android y
  `git diff --check`: correctos.
- La inspección visual manual en dispositivo queda como validación humana previa a
  publicar la OTA; no condiciona la completitud del código de esta spec.

## Extensión por Spec 029

La [Spec 029](./029-mezclas-factor-dosificacion-receta.md) introduce cabeceras
de mezcla explícitas. Las 12 reglas declarativas se conservan, pero la
validación se ejecuta de forma independiente para los productos y
coadyuvantes que comparten cada tanque, evitando advertencias entre productos
que se preparan en mezclas distintas.
