---
title: Rol analista web de solo lectura
status: implemented
numero: 022
area: seguridad, api, admin-web, mobile
created: 2026-07-31
approved_by: usuario, 2026-07-31
implemented_in: apps/api/src/modules/auth, apps/admin-web/src/modules/auth, apps/mobile/src/modules/auth
---

# Spec 022: Rol analista web de solo lectura

## Contexto

El rol `ANALISTA` ya existe en la base de datos y necesita acceso de consulta al panel web sin poder alterar datos ni administrar catálogos, usuarios o roles.

## Alcance

### Incluido

- Consulta de Dashboard, Visitas, Mapas y Clima desde el panel web.
- Bloqueo de Mantenimiento y Seguridad, incluso mediante URL directa.
- Denegación API centralizada para toda mutación de negocio realizada por un analista.
- Rechazo y limpieza de sesiones ANALISTA en la aplicación móvil.

### Excluido

- Crear, modificar o eliminar el registro del rol en PostgreSQL.
- Cambiar permisos de ADMIN u otros roles.

## Requisitos

- RF-001: ANALISTA puede usar solicitudes seguras de consulta y reportes existentes.
- RF-002: ANALISTA recibe `403` para `POST`, `PUT`, `PATCH` y `DELETE` de negocio.
- RF-003: ADMIN conserva prioridad si un usuario tiene ambos roles.
- RF-004: Mobile no persiste ni restaura una sesión que incluya ANALISTA.

## Contratos afectados

- API: no cambia rutas ni cuerpos; agrega respuesta `403` para métodos mutantes con JWT ANALISTA.
- PostgreSQL: no hay migración ni cambio de esquema; el rol ya existe.

## Seguridad y datos

- La API aplica la autorización definitiva; ocultar navegación no es un control suficiente.
- El cierre de sesión continúa permitido para revocar el refresh token.

## Migración y rollback

1. Desplegar API antes o junto con admin web y mobile; los clientes anteriores siguen compatibles.
2. Verificar que una cuenta ANALISTA pueda leer y no mutar información.
3. El rollback restaura la versión anterior de API y clientes; no hay datos ni esquema que revertir.

## Criterios de aceptación

- [x] CA-001: ANALISTA consulta los módulos web permitidos, incluido Clima.
- [x] CA-002: Mantenimiento y Seguridad no aparecen ni aceptan rutas directas.
- [x] CA-003: API rechaza mutaciones de ANALISTA con 403.
- [x] CA-004: Mobile muestra el mensaje de acceso exclusivo web y limpia la sesión.

## Pruebas

- Unitarias del guard de roles y de autorización de rutas web.
- Unitarias de la política de sesión mobile.
- Typecheck, pruebas focalizadas y build de las tres aplicaciones.

## Impacto documental

- [x] Actualizar el modelo de dominio y seguridad de roles.
- [x] Spec implementada al cerrar el cambio.

## Excepción posterior: lecturas de reservorios

La [spec 032](032-reservorios-entorno-agroclimatico.md) autoriza a ANALISTA a
crear, corregir y eliminar exclusivamente lecturas manuales de reservorios. La
API exige una marca explícita en esos handlers además de `@Roles("ADMIN",
"ANALISTA")`; el guard global mantiene el bloqueo de cualquier otra mutación.
AGRONOMO conserva acceso de solo lectura.
