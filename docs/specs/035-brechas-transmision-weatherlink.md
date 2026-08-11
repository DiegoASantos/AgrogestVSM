---
title: Brechas de transmision WeatherLink
status: implemented
numero: 035
area: clima, api, integraciones
created: 2026-08-11
approved_by: usuario mediante confirmacion directa, 2026-08-11
implemented_in: working tree, pendiente de commit y despliegue
---

# Spec 035: Brechas de transmision WeatherLink

## Contexto

Una estacion Davis puede dejar de transmitir durante uno o varios dias por
fallas tecnicas o interrupciones operativas. WeatherLink puede responder el dia
solicitado con sensores vacios o registros parciales sin timestamp. El cliente
actual considera cualquier registro incompleto como error de toda la estacion y
reintenta indefinidamente un dia que representa una brecha real.

## Alcance

### Incluido

- aceptar dias sin observaciones como dias procesados;
- descartar registros individuales sin timestamp valido;
- conservar error para respuestas sin estructura de sensores, sensores
  invalidos, HTTP rechazado o datos con forma no reconocible;
- prueba de regresion para dias vacios y registros parciales.

### Excluido

- inventar, interpolar o completar valores meteorologicos;
- cambiar permisos o plan WeatherLink;
- agregar una tabla de incidencias operativas por dia.

## Requisitos

- RF-001: un sensor con `data` nulo o ausente se interpreta como cero
  observaciones.
- RF-002: un registro sin timestamp finito se omite sin invalidar los registros
  validos del mismo dia.
- RF-003: un dia con cero lecturas validas avanza el cursor y no deja la
  estacion en `ERROR`.
- RNF-001: no se registran payloads ni credenciales del proveedor.

## Contratos afectados

No cambia el contrato HTTP ni el esquema. Cambia la tolerancia del cliente
WeatherLink ante brechas de transmision.

## Seguridad y datos

No se fabrican datos. La ausencia se conserva como ausencia de lecturas. Los
errores del proveedor siguen sanitizados.

## Migracion y rollback

No requiere migracion. El rollback consiste en revertir el cambio de cliente;
las lecturas existentes no se modifican.

## Criterios de aceptacion

- [x] CA-001: los registros sin timestamp son omitidos.
- [x] CA-002: un dia vacio se procesa sin error.
- [x] CA-003: una respuesta estructuralmente invalida sigue fallando.
- [x] CA-004: pruebas, lint, tipos y build API pasan.

## Pruebas

- validacion de payload vacio, parcial y estructuralmente invalido;
- orquestacion con dia sin observaciones;
- gates del modulo API.

## Impacto documental

- [x] Spec e indice.
- [x] Modelo del dominio.
- [x] Riesgos y runbook: sin cambio; el tratamiento vigente ya contempla
      interrupciones y recuperacion diaria.
