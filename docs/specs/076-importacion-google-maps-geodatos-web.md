---
title: Importación de coordenadas de Google Maps en geodatos web
status: implemented
numero: 076
area: parcelas, geodatos, admin-web
created: 2026-09-04
approved_by: Usuario, 2026-09-04
implemented_in: apps/admin-web/src/modules/parcelas; apps/admin-web/src/app/globals.css; docs/architecture/overview.md; docs/operations/security-baseline.md, 2026-09-04
---

# Spec 076: Importación de coordenadas de Google Maps en geodatos web

## Contexto

El editor web de geodatos de parcelas permite colocar manualmente el punto de
acceso y el polígono. El contrato existente también admite un punto interno de
la parcela. Para agilizar la captura se necesita pegar una URL completa de
Google Maps que contenga coordenadas, extraerlas localmente y elegir a cuál de
los dos puntos se aplican, sin contratar ni consultar una API externa.

## Alcance

### Incluido

- Importación en el editor web de URLs completas de Google Maps con coordenadas
  explícitas.
- Selector de destino entre `Punto de acceso` y `Punto interno de la parcela`.
- Aplicación automática al pegar una URL válida y aplicación mediante Enter o
  botón como alternativas accesibles.
- Visualización diferenciada y eliminación independiente de ambos puntos.
- Inclusión del punto interno en carga, edición, historial, centrado y guardado.

### Excluido

- URLs cortas de `maps.app.goo.gl` u otros enlaces que requieran redirección.
- Geocodificación de direcciones, nombres de lugares o plus codes.
- Integración con Google Maps Platform, API key o solicitudes desde servidor.
- Cambios de API, base de datos, mobile, SQLite u outbox.

## Requisitos

- RF-001: La interfaz acepta `https://www.google.com/maps/place/latitud,longitud`,
  `/maps/search/?api=1&query=latitud,longitud` y
  `https://maps.google.com/?q=latitud,longitud`.
- RF-002: Solo se aceptan los hosts `google.com`, `www.google.com` y
  `maps.google.com`. Los enlaces cortos y cualquier host similar o externo se
  rechazan sin navegar ni hacer solicitudes de red.
- RF-003: El parser acepta únicamente un par decimal completo `latitud,longitud`;
  valida valores finitos, latitud entre -90 y 90 y longitud entre -180 y 180.
- RF-004: Las coordenadas se convierten a GeoJSON como `[longitud, latitud]`.
- RF-005: El destino inicial es el punto de acceso. El usuario puede seleccionar
  el punto interno antes de importar.
- RF-006: Al pegar una URL válida se coloca o reemplaza el punto seleccionado,
  se centra el mapa y queda como cambio sin guardar. Enter y el botón de aplicar
  producen el mismo resultado.
- RF-007: La operación no guarda automáticamente. El botón existente
  `Guardar geodatos` continúa siendo la única confirmación persistente.
- RF-008: Reemplazar o eliminar cualquiera de los puntos participa en Deshacer,
  Rehacer y Cancelar cambios sin alterar el otro punto ni el polígono.
- RF-009: El mapa diferencia visualmente el punto de acceso y el punto interno,
  y las acciones manuales y de eliminación los nombran de forma inequívoca.
- RF-010: Los errores distinguen URL inválida, host no permitido, enlace corto,
  ausencia de coordenadas y coordenadas fuera de rango, sin reflejar la URL
  completa en mensajes o logs.
- RF-011: El importador se presenta como franja inferior del panel del mapa para
  aprovechar el ancho disponible y no comprimir el resumen ni las acciones del
  editor. En anchos reducidos sus controles se apilan.
- RNF-001: La extracción ocurre íntegramente en el navegador, sin dependencia,
  cuota, API key ni llamada externa.
- RNF-002: El control es usable por teclado, conserva contraste en tema claro y
  oscuro y se adapta al panel estrecho y a móvil.
- RNF-003: La entrada se limita a 2048 caracteres y no se evalúa como HTML ni
  código.

## Contratos afectados

- No cambia el contrato HTTP. `PATCH /parcelas/:id` ya admite
  `referencePoint`, `parcelReferencePoint` y `geometry`.
- El tipo web `ParcelaPayload` se alinea con el contrato existente agregando
  `parcelReferencePoint`.
- El estado interno del mapa incorpora ambos puntos.

## Seguridad y datos

- La URL pegada permanece en el estado local del navegador y no se envía a la
  API ni se registra en logs.
- El parser usa una lista cerrada de hosts y patrones de coordenadas; nunca abre
  la URL, sigue redirecciones ni realiza `fetch`.
- Solo el GeoJSON resultante se incluye en el PATCH explícito de guardado.
- Se conservan los controles de autenticación y roles ya vigentes para editar
  parcelas; la autorización definitiva continúa en la API.

## Migración y rollback

No existe migración. El cambio reutiliza columnas y contrato existentes. El
rollback consiste en retirar el importador y el soporte visual del punto interno
en el editor web, sin transformación ni pérdida de datos persistidos.

## Criterios de aceptación

- [x] CA-001: El enlace de ejemplo
      `https://www.google.com/maps/place/-4.889922,-80.435957` coloca el punto
      elegido en `[-80.435957, -4.889922]`.
- [x] CA-002: Los tres formatos admitidos funcionan al pegar, pulsar Enter o usar
      el botón y nunca provocan una solicitud a Google.
- [x] CA-003: Enlaces cortos, hosts engañosos, direcciones, plus codes,
      coordenadas solo en `@lat,lng` y valores fuera de rango se rechazan con
      mensajes accionables.
- [x] CA-004: Punto de acceso, punto interno y polígono se preservan mutuamente
      al importar, editar, eliminar, deshacer, rehacer, cancelar y guardar.
- [x] CA-005: Ambos puntos se distinguen en mapa y controles, y el mapa se centra
      al importar.
- [x] CA-006: La interfaz implementa estilos específicos para tema claro, oscuro
      y ancho móvil. La validación visual manual queda pendiente por no existir
      un navegador conectado en la sesión.
- [x] CA-007: La importación se ubica debajo del mapa, con destino y URL en una
      composición horizontal que se reorganiza en tablet y móvil.

## Pruebas

- Unitarias del parser para formatos admitidos, orden GeoJSON, host, longitud,
  rango y patrones excluidos.
- Unitarias de validación con punto interno y avisos fuera del polígono.
- Lint, typecheck, pruebas dirigidas y build de admin web.
- Revisión de seguridad y revisión independiente del diff congelado.

## Impacto documental

- [x] Arquitectura: documentar la importación local y el manejo de ambos puntos.
- [x] Seguridad: registrar que la URL no sale del navegador ni se resuelve.
- [x] Dominio: evaluado; no cambia el significado existente de ambos puntos.
- [x] Runbook: evaluado; no cambia procedimientos operativos.
- [x] ADR: evaluado; no introduce una decisión arquitectónica transversal.
- [x] Variables o despliegue: evaluado; no agrega variables ni servicios.
