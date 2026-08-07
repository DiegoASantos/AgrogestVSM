---
title: Clima general móvil por distrito
status: implemented
numero: 021
area: clima, api, mobile, sqlite, seguridad
created: 2026-07-30
approved_by: usuario, 2026-07-30
implemented_in: apps/api/src/modules/clima, apps/mobile/src/modules/clima, apps/mobile/src/shared/database
---

# Spec 021: Clima general móvil por distrito

## Contexto

Las parcelas actuales no tienen geometría ni punto de referencia confiable. El Inicio móvil no puede derivar un clima útil de un predio y debe presentar una estimación territorial general seleccionada por distrito.

## Alcance

### Incluido

- Selector móvil de Tambogrande, Las Lomas, Motupe y Casma, en ese orden.
- Selección persistente por usuario en SQLite; el primer uso solicita distrito.
- Endpoint autenticado para AGRONOMO y ADMIN, sin predios ni coordenadas.
- Caché local de solo lectura por distrito, sin outbox.

### Excluido

- Geometría de parcelas, ubicación del dispositivo, alertas o recomendaciones.
- Consulta del catálogo completo de distritos hasta que exista relación administrable distrito–punto climático.

## Requisitos

- RF-001: Inicio consulta clima por uno de los cuatro códigos de distrito permitidos y nunca por un predio.
- RF-002: El backend resuelve el punto territorial activo desde `clima.puntos_climaticos`; no consulta la tabla de distritos ni expone coordenadas.
- RF-003: Mobile recuerda la última elección y, sin conexión, muestra el último resultado cacheado para ese distrito señalando su vigencia.
- RF-004: La UI diferencia expresamente la estimación territorial de una estación o de un dato específico de predio.

## Contratos afectados

- API: `GET /mobile/clima/:districtCode`, donde `districtCode` es `tambogrande`, `las-lomas`, `motupe` o `casma`.
- SQLite: tabla expansiva `clima_distrito_cache`; no altera el outbox ni borra `clima_parcela_cache`.

## Seguridad y datos

- Solo AGRONOMO y ADMIN pueden consumir el endpoint.
- La respuesta no contiene geometrías, coordenadas ni identificadores de parcelas.

## Migración y rollback

1. Publicar el endpoint compatible sin modificar la ruta por parcela existente.
2. La app crea `clima_distrito_cache` hacia adelante y conserva sus pendientes.
3. El rollback deshabilita el uso móvil del endpoint; la caché nueva se conserva y no afecta datos operativos.

## Criterios de aceptación

- [x] CA-001: El primer uso solicita distrito y no predio.
- [x] CA-002: Solo se muestran los cuatro distritos aprobados, en orden.
- [x] CA-003: El último distrito y su caché sobreviven al reinicio.
- [x] CA-004: AGRONOMO y ADMIN pueden consultar; otros roles reciben 403.

## Pruebas

- Unitarias de códigos admitidos, punto inexistente, caché de servidor y mapeo del pronóstico.
- Validación de migración SQLite y typecheck de API y mobile.

## Impacto documental

- [x] Actualizar arquitectura de cachés de consulta.
- [x] Actualizar spec 019 para reflejar la ruta territorial móvil.
