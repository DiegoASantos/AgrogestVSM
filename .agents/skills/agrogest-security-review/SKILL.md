---
name: agrogest-security-review
description: Revisar seguridad de cambios AgroGest relacionados con autenticación, JWT y refresh tokens, roles, guards, secretos, CORS, TLS, rate limiting, archivos, geodatos o datos personales. Usar antes de cerrar cambios sensibles o al investigar exposición y abuso. Produce hallazgos priorizados; no realiza pentesting ni accede a producción.
---

# Revisión de seguridad de AgroGest

## Flujo

1. Leer `AGENTS.md`, línea base de seguridad y diff.
2. Definir activos, actores, frontera de confianza y datos afectados.
3. Revisar autenticación, autorización, validación, abuso, almacenamiento y log.
4. Trazar operaciones sensibles desde frontend hasta guard y servicio API.
5. Comprobar variables sin leer valores reales.
6. Revisar fallo, enumeración, replay, escalada y denegación de servicio.
7. Exigir pruebas para controles críticos.
8. Clasificar hallazgos por evidencia e impacto.

## Hallazgos

Incluir ID, severidad, archivo/línea, evidencia, impacto, corrección mínima y
prueba de mitigación.

## Reglas

- No confundir autorización UI con autorización API.
- No imprimir tokens, contraseñas, PII ni `.env`.
- No afirmar vulnerabilidades sin evidencia o ruta plausible.
- Separar defectos del alcance de mejoras defensivas.
- Registrar riesgos aceptados y condición de revaluación.

Usar [references/checklist.md](references/checklist.md).
