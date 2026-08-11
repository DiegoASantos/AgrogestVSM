---
title: Filtros por fuente y estacion WeatherLink
status: implemented
numero: 034
area: clima, api, postgresql, admin-web, integraciones
created: 2026-08-11
approved_by: usuario mediante solicitud directa, 2026-08-11
implemented_in: working tree, pendiente de commit y despliegue
---

# Spec 034: Filtros por fuente y estacion WeatherLink

## Contexto

Resumen, mapa e historial mezclan datos estimados de Open-Meteo con
observaciones WeatherLink sin permitir escoger su procedencia. Ademas, el
descubrimiento Davis descarta silenciosamente estaciones accesibles cuando su
metadata no contiene coordenadas validas, por lo que solo una estacion puede
quedar visible aunque la API Key alcance varias.

## Alcance

### Incluido

- selector de fuente en Resumen, Mapa e Historial Agroclimatico;
- selector dependiente de estacion cuando la fuente es WeatherLink Davis;
- registro de todas las estaciones devueltas por `/stations`, aun sin GPS;
- exclusion del mapa, pero no del inventario o historial, para estaciones sin
  coordenadas;
- estado individual de error cuando una estacion no permite historico por
  relacion o nivel de suscripcion;
- trazabilidad del codigo y nombre de fuente en lecturas y estaciones.

### Excluido

- alta manual de estaciones Davis no devueltas por WeatherLink;
- geocodificacion o coordenadas inventadas para estaciones sin GPS;
- ampliacion del plan WeatherLink o cambio de permisos sobre estaciones
  compartidas;
- cambios mobile.

## Requisitos

- RF-001: Resumen permite escoger Open-Meteo o WeatherLink; para WeatherLink
  exige escoger una estacion antes de mostrar observaciones.
- RF-002: Mapa permite filtrar por fuente y, para WeatherLink, por una estacion
  o por todas las estaciones geolocalizadas.
- RF-003: Historial usa selectores Fuente -> Punto/Estacion dependientes y
  consulta exclusivamente el origen elegido.
- RF-004: cada elemento expone `sourceCode` estable ademas del nombre visible.
- RF-005: el descubrimiento persiste toda estacion con ID valido aunque su
  latitud o longitud sean nulas.
- RF-006: una estacion sin GPS permanece seleccionable en Resumen e Historial,
  pero no genera un marcador invalido.
- RNF-001: la API no registra payloads ni credenciales WeatherLink.
- RNF-002: los cambios son aditivos y compatibles con clientes anteriores.

## Contratos afectados

- PostgreSQL: `clima.estaciones_meteorologicas.latitud` y `longitud` pasan a
  aceptar `NULL`; se mantienen los checks para valores presentes.
- API: lecturas y estaciones agregan `sourceCode`; coordenadas de estacion
  pueden ser `null`.
- Admin web: filtros dependientes por fuente y estacion en tres vistas.

## Seguridad y datos

- Los selectores consumen solo IDs publicos y metadata persistida.
- API Key, Secret y payload crudo permanecen exclusivamente en la API.
- Los errores de permisos historicos se sanitizan por estacion.

## Migracion y rollback

- Avance: migracion aditiva elimina `NOT NULL` de latitud y longitud sin borrar
  datos y conserva sus checks de rango.
- Compatibilidad: estaciones existentes mantienen sus coordenadas; clientes
  anteriores siguen recibiendo los mismos campos, que solo son nulos para
  nuevas estaciones sin GPS.
- Rollback operativo: desactivar estaciones sin coordenadas. Restaurar `NOT
NULL` exige completar coordenadas antes y se documenta, pero no se ejecuta
  automaticamente.

## Criterios de aceptacion

- [x] CA-001: todas las estaciones accesibles con ID valido aparecen en el
      inventario despues de sincronizar.
- [x] CA-002: Resumen, Mapa e Historial permiten elegir fuente.
- [x] CA-003: al elegir WeatherLink aparece un selector con todas sus
      estaciones persistidas.
- [x] CA-004: una estacion sin GPS no rompe ni aparece en el mapa.
- [x] CA-005: una estacion sin permiso historico queda en ERROR y no impide
      procesar las demas.
- [x] CA-006: migracion, tipos, lint, pruebas y builds terminan correctamente.

## Pruebas

- migracion de nulabilidad y preservacion de checks;
- descubrimiento con varias estaciones, incluida una sin coordenadas;
- continuidad ante error historico de una estacion;
- filtros de fuente y estacion y exclusiones cartograficas;
- contratos y build de API/admin web.

## Impacto documental

- [x] Modelo del dominio.
- [x] Spec e indice documental.
- [x] Runbook de despliegue y rollback.
- [x] Registro de riesgos si persisten restricciones externas.
