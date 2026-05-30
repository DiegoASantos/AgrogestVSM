# Fase 3 pendiente: validacion geoespacial backend de parcelas

## Estado

Pendiente para una etapa posterior al MVP.

La decision actual es no ejecutar la Fase 3 completa todavia. Para reducir riesgo en el MVP, solo se trasladan al backend las validaciones bloqueantes que ya existen en el editor visual del frontend. Con esto, el API queda protegido ante clientes externos o manipulaciones directas, pero se evita introducir por ahora una capa geoespacial mas compleja.

## Objetivo de la Fase 3

La Fase 3 debe convertir al backend en la fuente definitiva de verdad para la integridad geoespacial de parcelas. El editor del frontend puede seguir dando retroalimentacion inmediata al usuario, pero la aceptacion final de los geodatos debe depender del API y, de ser posible, de reglas apoyadas por la base de datos.

El objetivo no es solo repetir validaciones visuales. La fase debe cubrir reglas territoriales, consistencia de datos, mensajes de error estandarizados, pruebas automatizadas y una estrategia de crecimiento para cuando se manejen mas parcelas, mas sectores y mas usuarios editando al mismo tiempo.

## Alcance funcional propuesto

La Fase 3 deberia incluir estas capacidades:

1. Validacion autoritativa de geometria en backend.
   El backend debe rechazar geometrias invalidas aunque el frontend no las detecte. Esto incluye formato GeoJSON valido, anillos cerrados, cantidad minima de vertices, coordenadas numericas en SRID 4326, poligonos no autointersectados y reglas claras para MultiPolygon.

2. Validacion topologica contra parcelas vecinas.
   El backend debe evitar que una parcela se superponga con parcelas activas del mismo sector. En una version mas avanzada, debe distinguir entre contacto permitido por borde compartido y solapamiento real de area.

3. Validacion de punto de referencia.
   Se debe definir si el punto de referencia es obligatorio, opcional o recomendado. Tambien se debe decidir si sera un error guardar un punto fuera del poligono o si seguira siendo solo una advertencia. En el MVP actual esto permanece como advertencia en frontend.

4. Calculo y control de area.
   El backend deberia calcular el area real de la geometria y compararla con el area registrada. En una version robusta, el area almacenada deberia venir del calculo geoespacial o quedar claramente diferenciada como area administrativa declarada.

5. Reglas por jerarquia territorial.
   La parcela deberia poder validarse contra limites superiores cuando existan: sector, fundo, productor u otra unidad territorial. Esto evita que una parcela quede fuera del contenedor geografico que le corresponde.

6. Auditoria de cambios.
   Cada modificacion de geodatos deberia registrar usuario, fecha, geometria anterior, geometria nueva y motivo opcional. Esto permite trazabilidad cuando se corrijan parcelas en campo.

7. Control de concurrencia.
   Si dos usuarios editan la misma parcela, el sistema deberia detectar cambios intermedios antes de sobrescribir geodatos. Una opcion pragmaticamente suficiente es validar `updatedAt` o una version de entidad al guardar.

8. Errores de dominio estandarizados.
   Las respuestas del API deberian devolver codigos de error estables, por ejemplo `GEOMETRY_SELF_INTERSECTION`, `GEOMETRY_NEIGHBOR_OVERLAP` o `REFERENCE_POINT_OUTSIDE_POLYGON`. Esto permite que el frontend traduzca mensajes sin depender de texto libre del backend.

9. Pruebas automatizadas.
   La fase debe incluir pruebas unitarias para geometria, pruebas de servicio con parcelas vecinas y pruebas de integracion para crear/actualizar parcelas con geodatos validos e invalidos.

10. Preparacion para motor geoespacial.
    Si el volumen de datos crece, conviene evaluar PostGIS o funciones geoespaciales equivalentes. Esto permitiria usar indices espaciales y operaciones mas confiables para interseccion, contencion y calculo de area.

## Lo que se implementa ahora, sin cerrar la Fase 3

Como medida pragmatica para el MVP, se replica en backend la validacion bloqueante que ya tenia el editor visual:

- La geometria debe ser un `MultiPolygon` GeoJSON valido.
- Los anillos deben estar cerrados y tener estructura valida.
- El poligono no debe autointersectarse.
- La geometria no debe solaparse con parcelas activas vecinas del mismo sector.

No se convierte todavia en error el punto de referencia fuera del poligono, porque actualmente en el frontend esa regla se maneja como advertencia. Cambiarla a error debe decidirse como parte de la Fase 3 para no bloquear flujos actuales del MVP sin una politica funcional cerrada.

## Criterios de aceptacion futuros

La Fase 3 podra considerarse terminada cuando:

- El backend tenga reglas geoespaciales completas, probadas y documentadas.
- El frontend dependa del backend para la decision final de guardado.
- Los errores geoespaciales tengan codigos estables y mensajes utiles para el usuario.
- Exista una estrategia clara para area calculada versus area administrativa.
- Se tenga trazabilidad de cambios importantes en geodatos.
- Las validaciones funcionen correctamente con varias parcelas vecinas y casos limite.

## Riesgos si se posterga demasiado

Postergar esta fase es aceptable para el MVP, pero no debe mantenerse indefinidamente si el sistema empieza a usarse con datos reales. Los principales riesgos son:

- Inconsistencias si otro cliente consume el API sin pasar por el editor web.
- Dificultad para corregir historicos si se guardan geometrias defectuosas.
- Solapamientos entre parcelas que afecten reportes, mapas y visitas de campo.
- Falta de trazabilidad cuando varios usuarios ajusten geodatos.

Por eso, aunque la Fase 3 queda pendiente, el backend ya empieza a proteger las reglas bloqueantes actuales del editor.
