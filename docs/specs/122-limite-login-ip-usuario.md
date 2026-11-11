---
title: Límite de inicio de sesión por IP y usuario
status: implementing
numero: 122
area: seguridad
created: 2026-11-11
approved_by: usuario (2026-11-11)
implemented_in:
---

# Spec 122: Límite de inicio de sesión por IP y usuario

## Contexto

El panel usa un proxy hacia la API. En producción la API no confía en ese
proxy y ve su dirección para todas las solicitudes del panel. El límite de
cinco solicitudes en un minuto puede bloquear a usuarios distintos durante
cinco minutos.

## Alcance

### Incluido

- Limitar login por combinación de IP de cliente y correo normalizado.
- Mantener un límite adicional por IP para ataques contra múltiples cuentas.
- Reconocer la IP que remite el proxy del panel únicamente si la conexión
  procede de un proxy expresamente confiable.
- Reducir el bloqueo a un minuto.

### Excluido

- Cambios en contraseñas, sesiones, base de datos o contratos de login.
- Rediseño del acceso de productores mediante código.

## Requisitos

- RF-001: permitir cinco solicitudes por combinación IP y correo en una ventana
  de 60 segundos; la siguiente recibe 429 y se bloquea durante 60 segundos.
- RF-002: aplicar además un límite de 30 solicitudes de login por IP en 60
  segundos, con bloqueo de 60 segundos, para acotar intentos con muchos correos.
- RF-003: contar solicitudes exitosas y fallidas, como el límite actual. Los
  correos se normalizan con trim y minúsculas; un correo inválido o ausente no
  evita el límite por IP.
- RF-004: el proxy del panel elimina cabeceras de origen recibidas del cliente
  y transmite la dirección real de su conexión. La API acepta esa dirección
  solo desde el proxy configurado; conexiones directas usan la IP de conexión.
- RNF-001: conservar el control existente para canje de código de productor.
- RNF-002: no registrar correos, contraseñas ni cabeceras sensibles en las
  claves o logs; usar identificadores derivados que no revelen el correo.
- RNF-003: conservar la respuesta 429 y Retry-After cuando corresponda.

## Contratos afectados

La ruta y el formato de solicitud de login se mantienen. Cambian los criterios
de respuesta 429 y la duración del bloqueo para web y mobile.

## Seguridad y datos

No confiar en `X-Forwarded-For` de conexiones directas al puerto público de la
API. La identidad del proxy debe configurarse de forma estable y específica,
no confiar en toda la red Docker ni en cualquier proxy. Evaluar las direcciones
reales observadas tanto en acceso LAN como externo y documentar límites cuando
varios clientes comparten una IP por NAT. El límite por IP puede bloquear una
red compartida bajo carga elevada; el límite por pareja aísla los errores de
credenciales de distintos usuarios. El almacenamiento actual es por proceso y
se reinicia al reiniciar la API; no garantiza límites compartidos entre réplicas.

## Migración y rollback

No se requieren migraciones. Configurar el proxy confiable y el bloqueo de
60000 ms por entorno, validar primero en testing y después desplegar la API y
la configuración aprobadas. Conservar los valores y artefactos anteriores para
restaurar la versión y configuración previa; comprobar salud y login tras el
rollback. No habilitar confianza global en cabeceras como medida temporal.

## Criterios de aceptación

- [ ] CA-001: el sexto intento de una pareja IP/correo dentro de 60 segundos
  devuelve 429; tras 60 segundos de bloqueo se permite volver a intentar.
- [ ] CA-002: otro correo en la misma IP conserva su contador independiente,
  salvo que se haya alcanzado el límite general de 30 solicitudes por IP.
- [ ] CA-003: el mismo correo desde otra IP tiene contador independiente y el
  límite general por IP funciona incluso con correos ausentes o variados.
- [ ] CA-004: las cabeceras falsificadas enviadas directamente a la API o al
  panel no permiten elegir la IP usada por el limitador.
- [ ] CA-005: web y mobile mantienen sus contratos y el canje de productor
  conserva sus controles; no se exponen credenciales ni correos en logs.

## Pruebas

- Unitarias para normalización, límites, expiración y confianza de proxy.
- Integración HTTP para límites por pareja y por IP, cabeceras falsificadas,
  tráfico directo y tráfico mediante proxy, incluidos errores y éxitos.
- Validación en testing de acceso web y mobile, salud y rollback; verificación
  del despliegue de producción sin generar bloqueos a usuarios reales.

## Impacto documental

- [ ] Actualizar línea base de seguridad, variables y runbook de despliegue.
- [ ] Registrar las limitaciones de NAT y de almacenamiento por proceso.
