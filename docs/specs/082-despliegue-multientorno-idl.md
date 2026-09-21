---
title: Despliegue multientorno de Agrogest VSM en servidor IDL
status: approved
numero: 082
area: infraestructura, seguridad y contrato de despliegue
created: 2026-09-21
approved_by: instrucción explícita del mantenedor
implemented_in: 1a4e79b
---

# Spec 082: Despliegue multientorno de Agrogest VSM en servidor IDL

## Contexto

La API y el panel piloto viven en Render y Vercel. Se trasladan al servidor IDL
sin migrar todavía la base PostgreSQL de Supabase. Los entornos deben quedar
separados por red, puertos, secretos JWT y etiqueta visual.

## Alcance

### Incluido

- API NestJS y panel Next.js en Docker Compose para producción, testing y desarrollo.
- Producción pública en 5176 (panel) y 5177 (API); testing y desarrollo solo en intranet.
- CORS restringido para producción y testing; secretos JWT independientes por entorno.
- El móvil conserva Expo/Supabase como plataforma y apunta a la API local pública en su próxima compilación.
- Inventario de puertos y ramas `produccion`, `testing` y `desarrollo`.

### Excluido

- Migración, seed, bootstrap o cambio del esquema de Supabase antes de la ventana autorizada.
- Publicación de OTA, APK, HTTPS o modificación de reglas del router no administradas por este servidor.
- Uso libre de testing o desarrollo para modificar datos reales mientras compartan Supabase.

## Requisitos

- RF-001: cada entorno debe responder en su URL asignada y mostrar su etiqueta correspondiente.
- RF-002: ningún comando de despliegue debe ejecutar migraciones, bootstrap ni seed.
- RF-003: testing y desarrollo deben enlazarse únicamente a `172.16.0.8`.
- RNF-001: producción debe requerir CORS del origen exacto del panel.
- RNF-002: los JWT deben tener material aleatorio independiente y permanecer fuera de Git.
- RNF-003: Android permitirá HTTP solo como excepción temporal hasta disponer de HTTPS.

## Contratos afectados

- `NEXT_PUBLIC_API_URL` y `NEXT_PUBLIC_ENVIRONMENT_LABEL` del panel.
- `EXPO_PUBLIC_API_URL` del móvil y su configuración Android de tráfico HTTP.
- `CORS_ALLOWED_ORIGINS` de la API. No cambia ningún endpoint, DTO, esquema PostgreSQL ni SQLite.

## Seguridad y datos

Los `.env` permanecen ignorados. Supabase conserva TLS habilitado durante la
transición; la verificación estricta queda pendiente de instalar la CA del
proveedor. Testing y desarrollo comparten provisionalmente la base remota y
solo se usan para validación no destructiva. La exposición pública depende de
reglas UFW y NAT/PAT del router hacia el servidor.

## Migración y rollback

El avance es levantar únicamente los contenedores de Agrogest y validar
`/health`. El rollback consiste en detener esos contenedores y redeplegar el
commit estable; no revierte datos porque esta entrega no altera la base. La
migración a bases locales será una spec y ventana separadas, con backup y
restauración verificados.

## Criterios de aceptación

- [ ] CA-001: los seis puertos responden desde el alcance de red asignado.
- [ ] CA-002: los paneles muestran producción sin sufijo, `TESTING` y `DESARROLLO`.
- [ ] CA-003: CORS permite únicamente el panel correspondiente fuera de desarrollo.
- [ ] CA-004: los tres JWT son distintos y no están en Git.
- [ ] CA-005: no se ejecutaron migraciones, seeds ni bootstrap.
- [ ] CA-006: las tres ramas existen en GitHub con seguimiento a `origin`.

## Pruebas

- `docker compose config`, build, health check y smoke HTTP por entorno.
- lint/tipos/build de API y panel.
- comprobación de CORS, títulos, puertos y `.gitignore`.
- inspección de ramas remotas y revisión de seguridad de secretos y exposición.

## Impacto documental

- [x] Entornos.
- [x] Variables o despliegue.
- [x] Spec e índice.
- [ ] Arquitectura.
- [ ] Dominio.
- [ ] ADR.
