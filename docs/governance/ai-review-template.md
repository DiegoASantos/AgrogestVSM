---
title: Plantilla de resultado de revisión de IA
status: active
owner: mantenimiento
last_reviewed: 2026-06-25
---

# Resultado de revisión independiente

```markdown
# Revisión: <título>

## Veredicto

aprobar | aprobar con observaciones | solicitar cambios

## Hallazgos

| ID | Severidad | Archivo/línea | Evidencia | Impacto | Resolución |
| -- | --------- | ------------- | --------- | ------- | ---------- |

## Pruebas faltantes

- <prueba vinculada con un riesgo concreto>

## Disposición del implementador

| Hallazgo | Decisión | Justificación | Cambio o seguimiento |
| -------- | -------- | ------------- | -------------------- |
|          | aceptar / rechazar / diferir |       |                    |

## Validación posterior

- comandos:
- resultado:
- riesgos restantes:
```

No se copia automáticamente la respuesta del modelo a documentación permanente.
Codex y el desarrollador verifican cada hallazgo contra código y pruebas.
