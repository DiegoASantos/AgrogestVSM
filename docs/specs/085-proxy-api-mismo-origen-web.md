---
title: Proxy de API por el mismo origen del panel web
status: implementing
numero: 085
area: infraestructura, seguridad y panel web
created: 2026-09-28
approved_by: instrucción explícita del mantenedor de implementar la spec 085
implemented_in: árbol de trabajo local, sin commit (2026-09-28)
---

# Spec 085: Proxy de API por el mismo origen del panel web

## Contexto

Al abrir el panel de producción en `http://172.16.0.8:5176`, el JavaScript
compilado llama a `http://190.119.191.195:5177/auth/login`. En la misma LAN esa
conexión vence por tiempo, aunque la API responde mediante `172.16.0.8:5177` y
el login funciona desde otra red. El navegador depende del retorno por la IP
pública del router. El mantenedor no desea cambiar ese comportamiento de red.

## Alcance

### Incluido

- Ruta `/api/*` en Next.js que reenvía a la API mediante una URL interna del
  servidor, configurada con `API_INTERNAL_URL`.
- Imagen Docker del panel que compila `NEXT_PUBLIC_API_URL=/api`; la URL pública
  de la API deja de estar incrustada en ese panel incluso si un Compose antiguo
  aún pasa ese argumento.
- Configuración de Docker y procedimiento de despliegue que aseguren que web y
  API comparten la red de Compose.
- Verificación de login, refresh, rutas autenticadas y descargas desde el panel
  abierto tanto por IP LAN como por IP pública.

### Excluido

- Cambios de NAT, hairpin NAT, firewall, proveedor o exposición de puertos.
- Cambios de endpoints, DTO, roles, tokens, PostgreSQL, SQLite o mobile.
- Cambio de HTTPS o retirada del acceso público directo a la API.

## Requisitos

- RF-001: En el despliegue IDL, toda petición del cliente web a la API usa
  `/api/<ruta>` del origen de la página, sin seleccionar una IP desde el navegador.
- RF-002: Next.js reenvía `/api/<ruta>` a `<API_INTERNAL_URL>/<ruta>` sin modificar
  método, cuerpo, encabezados de autorización, estado ni cuerpo de respuesta.
- RF-003: Desarrollo local sin `API_INTERNAL_URL` conserva el acceso directo
  configurado por `NEXT_PUBLIC_API_URL` o el valor local actual.
- RF-004: La URL interna se configura por entorno; no se interpola una URL de
  destino enviada por el usuario.
- RNF-001: El proxy no registra credenciales, JWT ni cuerpos de petición.
- RNF-002: La web pública y LAN funcionan con la misma imagen y configuración.

## Contratos afectados

Cambian las variables de despliegue del panel (`NEXT_PUBLIC_API_URL=/api` fijada
por el target Docker y `API_INTERNAL_URL=http://api:3001` por defecto, ajustable
como argumento de build). El contrato HTTP de la API y sus
clientes mobile permanece igual. La política CORS de la API conserva sus orígenes
directos actuales; las peticiones del panel pasan por el mismo origen.

## Seguridad y datos

`API_INTERNAL_URL` es configuración del servidor, no un parámetro del navegador.
Next.js reenvía a un único destino fijo de la red privada de Compose. El proxy
sustituye las cabeceras `X-Forwarded-For` recibidas por la dirección del socket
del cliente, para evitar que un origen falsificado altere el rate limiting de
login. No se añaden excepciones CORS ni permisos de API. El navegador sigue
enviando tokens en el encabezado `Authorization`; no se almacenan en el servidor
web. El proxy no expone detalles internos en errores y conserva los guards y
roles de la API.

## Migración y rollback

1. Reconstruir la imagen web con el target Docker actualizado y desplegarla
   junto a la API en la red de Compose. Su valor por defecto es
   `API_INTERNAL_URL=http://api:3001`; un destino interno distinto debe pasarse
   como argumento de build.
2. Validar `/api/health` y el login desde LAN y desde una red externa; verificar
   que Network muestra el origen del panel para `/api/auth/login`.
3. Si falla, restaurar la imagen web anterior y sus argumentos de compilación.
   No hay migración de datos ni cambios de esquema que revertir.

## Criterios de aceptación

- [ ] CA-001: El navegador en `172.16.0.8:5176` llama a `/api/auth/login` y
  puede iniciar sesión sin conectar a la IP pública de la API.
- [ ] CA-002: El navegador externo puede iniciar sesión en el mismo panel.
- [ ] CA-003: Refresh, `/auth/me` y descargas autenticadas conservan estado,
  encabezados y contenido.
- [x] CA-004: Si falta `API_INTERNAL_URL` en un despliegue configurado para
  proxy, el despliegue falla o la configuración se detecta antes de publicarlo.
- [x] CA-005: No se modifica CORS, roles, tokens ni la conectividad mobile.

## Pruebas

- Prueba de configuración de URL base y del proxy en Next.js, incluida la
  sustitución de cabeceras de IP enviadas por el cliente.
- Lint, tipos y build del panel.
- Smoke HTTP de `/api/health` y verificación manual de Network/login en LAN y
  red externa, sin credenciales de prueba en el repositorio.
- Revisión de seguridad del diff y de las variables de despliegue.

Validación local: lint, tipos, 5 pruebas, build, configuración de Compose y
smoke HTTP sintético del proxy pasaron. La verificación LAN/pública con login
real sigue pendiente antes del despliegue. La revisión externa es opcional
según ADR-006.

## Impacto documental

- [ ] Arquitectura.
- [ ] Dominio.
- [ ] Runbook.
- [ ] ADR.
- [x] Variables o despliegue.
